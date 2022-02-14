---
sidebar_position: 4
---

# Flume ElasticSearch Sink（异步）

## 需求背景

Flume 自带 ElasticSearch Sink，支持将数据写到 ElasticSearch。

但是，官方的 ElasticSearch Sink 不支持异步发送，在面对 **数据激增**、**下游组件异常** 等情况时，容易出现隧道堆积，进而导致 Flume 集群异常。

因此，我们需要一个支持异步的 ElasticSearch Sink，以规避上述问题。

## 代码实现

首先，我们需要添加 ElasticSearch 高可用客户端的依赖：

```xml
<dependency>
    <groupId>org.elasticsearch.client</groupId>
    <artifactId>elasticsearch-rest-high-level-client</artifactId>
    <version>7.8.0</version>
</dependency>
```

然后，定义自定义 ElasticSearch Sink 所需要的配置参数：

|配置项|默认值|配置说明|
|---|---|---|
|hosts|-|ElasticSearch 集群地址|
|username|-|ElasticSearch 用户名（7.x 版本以上支持）|
|password|-|ElasticSearch 密码（7.x 版本以上支持）|
|restPort|9200|ElasticSearch 集群端口|
|indexHeader|topic|用于获取索引名称的 header|
|batchSize|1000|单批次写入 ElasticSearch 的事件数|
|indexTimeZone|Asia/Shanghai|索引时间分区对应的时区|

最后，基于 Bulk API 实现支持异步的 ElasticSearch Sink，具体代码如下：

```java
package com.panda.flume.sink.elasticsearch;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.dianchu.flume.util.DateFormatUtils;
import com.google.common.base.Preconditions;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.TimeZone;
import java.util.function.BiConsumer;
import org.apache.commons.lang.StringUtils;
import org.apache.flume.Channel;
import org.apache.flume.Context;
import org.apache.flume.Event;
import org.apache.flume.Sink;
import org.apache.flume.Transaction;
import org.apache.flume.conf.Configurable;
import org.apache.flume.instrumentation.SinkCounter;
import org.apache.flume.sink.AbstractSink;
import org.apache.http.HttpHost;
import org.apache.http.auth.AuthScope;
import org.apache.http.auth.UsernamePasswordCredentials;
import org.apache.http.client.CredentialsProvider;
import org.apache.http.impl.client.BasicCredentialsProvider;
import org.elasticsearch.action.ActionListener;
import org.elasticsearch.action.bulk.BackoffPolicy;
import org.elasticsearch.action.bulk.BulkProcessor;
import org.elasticsearch.action.bulk.BulkRequest;
import org.elasticsearch.action.bulk.BulkResponse;
import org.elasticsearch.action.index.IndexRequest;
import org.elasticsearch.client.RequestOptions;
import org.elasticsearch.client.RestClient;
import org.elasticsearch.client.RestClientBuilder;
import org.elasticsearch.client.RestHighLevelClient;
import org.elasticsearch.common.unit.ByteSizeUnit;
import org.elasticsearch.common.unit.ByteSizeValue;
import org.elasticsearch.common.unit.TimeValue;
import org.elasticsearch.common.xcontent.XContentType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 异步 es sink
 *
 * @author panda
 * @date 2021/7/8
 */
public class ElasticSearchSink extends AbstractSink implements Configurable {

    private static final Logger LOGGER = LoggerFactory.getLogger(ElasticSearchSink.class);

    private static final String DEFAULT_INDEX_NAME = "default_flume_index";

    private String[] hosts;

    private String indexHeader;

    private String indexTimeZone;

    private String username;

    private String password;

    private Integer port;

    private Integer batchSize;

    private RestHighLevelClient client;

    private BulkProcessor bulkProcessor;

    private SinkCounter sinkCounter;

    @Override
    public void configure(Context context) {
        String esHostString = StringUtils.deleteWhitespace(context.getString("hosts"));
        this.hosts = esHostString.split(",");
        this.username = context.getString("username", "flume");
        this.password = context.getString("password", "flume");
        this.port = context.getInteger("restPort", 9200);
        this.batchSize = context.getInteger("batchSize", 1000);
        this.indexHeader = context.getString("indexHeader", "topic");
        this.indexTimeZone = context.getString("indexTimeZone", "Asia/Shanghai");

        Preconditions.checkState(StringUtils.isNotEmpty(esHostString), "the config of hosts is empty.");
        Preconditions.checkState(batchSize >= 1, "batch size must be greater than 0.");

        if (sinkCounter == null) {
            sinkCounter = new SinkCounter(getName());
        }
    }

    @Override
    public synchronized void start() {
        LOGGER.info("Starting ElasticSearch Sink...");
        sinkCounter.start();
        try {
            // 配置日志输出路径
            HttpHost[] httpHosts = new HttpHost[this.hosts.length];
            for (int i = 0; i < this.hosts.length; i++) {
                httpHosts[i] = new HttpHost(this.hosts[i], this.port, "http");
            }
            RestClientBuilder builder = RestClient.builder(httpHosts);
            if (StringUtils.isNotEmpty(username) && StringUtils.isNotEmpty(password)) {
                CredentialsProvider credentialsProvider = new BasicCredentialsProvider();
                credentialsProvider.setCredentials(AuthScope.ANY, new UsernamePasswordCredentials(username, password));
                builder.setHttpClientConfigCallback(f -> f.setDefaultCredentialsProvider(credentialsProvider));
            }
            this.client = new RestHighLevelClient(builder);

            BulkProcessor.Listener listener = new BulkProcessor.Listener() {
                @Override
                public void beforeBulk(long executionId, BulkRequest request) {
                    LOGGER.info("Executing bulk {} with {} requests", executionId, request.numberOfActions());
                }

                @Override
                public void afterBulk(long executionId, BulkRequest request, BulkResponse response) {
                    if (response.hasFailures()) {
                        LOGGER.error(response.buildFailureMessage());
                    }
                    LOGGER.info("Bulk execution completed [{}]\n" +
                            "Took (ms): {}\n" +
                            "Count: {}", executionId, response.getTook().getMillis(), response.getItems().length);
                }

                @Override
                public void afterBulk(long executionId, BulkRequest request, Throwable failure) {
                    LOGGER.error("Failed to execute bulk: {}", failure.getMessage());
                }
            };

            BiConsumer<BulkRequest, ActionListener<BulkResponse>> bulkConsumer =
                    (request, bulkListener) -> client.bulkAsync(request, RequestOptions.DEFAULT, bulkListener);
            // 在这里调用 build() 方法构造 bulkProcessor，在底层实际上是用了 bulk 的异步操作
            this.bulkProcessor = BulkProcessor.builder(bulkConsumer, listener)
                    // 1000 条数据请求执行一次 bulk
                    .setBulkActions(this.batchSize)
                    // 20mb 的数据刷新一次 bulk
                    .setBulkSize(new ByteSizeValue(20L, ByteSizeUnit.MB))
                    // 并发请求数量, 0 不并发, 1 并发允许执行
                    .setConcurrentRequests(1)
                    // 固定 10s 必须刷新一次
                    .setFlushInterval(TimeValue.timeValueSeconds(10L))
                    // 重试 5 次，间隔 1 s
                    .setBackoffPolicy(BackoffPolicy.constantBackoff(TimeValue.timeValueSeconds(1L), 5))
                    .build();
            sinkCounter.incrementConnectionCreatedCount();
        } catch (Exception e) {
            LOGGER.error(e.getMessage());
            sinkCounter.incrementConnectionFailedCount();
        }
        super.start();
    }

    @Override
    public synchronized void stop() {
        try {
            LOGGER.info("Stopping ElasticSearch Sink...");
            this.bulkProcessor.close();
            this.client.close();
            sinkCounter.incrementConnectionClosedCount();
            sinkCounter.stop();
        } catch (Exception e) {
            LOGGER.error(e.getMessage());
        }
        super.stop();
    }

    @Override
    public Sink.Status process() {
        Status status = Status.READY;
        Channel ch = getChannel();
        Transaction txn = ch.getTransaction();
        try {
            txn.begin();

            String dateString = DateFormatUtils
                    .format(System.currentTimeMillis(), "yyyy.MM.dd", TimeZone.getTimeZone(indexTimeZone));

            int count;
            for (count = 0; count <= batchSize; ++count) {
                Event event = ch.take();
                if (event == null) {
                    break;
                }
                // 拼接索引
                String indexName = event.getHeaders().get(indexHeader);
                if (StringUtils.isEmpty(indexName)) {
                    indexName = DEFAULT_INDEX_NAME;
                }
                indexName += "-" + dateString;
                // 追加时间信息
                boolean isSuccess = this.appendTime(event);
                // 若数据符合 JSON 格式，添加请求
                if (isSuccess) {
                    this.bulkProcessor.add(new IndexRequest(indexName).source(event.getBody(), XContentType.JSON));
                }
            }

            if (count <= 0) {
                sinkCounter.incrementBatchEmptyCount();
                status = Status.BACKOFF;
            } else {
                if (count < batchSize) {
                    sinkCounter.incrementBatchUnderflowCount();
                } else {
                    sinkCounter.incrementBatchCompleteCount();
                }
                sinkCounter.addToEventDrainAttemptCount(count);
            }

            txn.commit();
            sinkCounter.addToEventDrainSuccessCount(count);

        } catch (Exception e) {
            txn.rollback();
            LOGGER.error(e.getMessage());
            status = Status.BACKOFF;
        } finally {
            txn.close();
        }
        return status;
    }

    public boolean appendTime(Event event) {

        boolean isSuccess = Boolean.TRUE;
        String body = new String(event.getBody(), StandardCharsets.UTF_8);

        try {
            JSONObject jsonObject = JSON.parseObject(body);

            // 追加事件生成时间 generated_time
            if (!jsonObject.containsKey("generated_time")) {
                String generatedTime = null;
                String logTime = jsonObject.getString("log_time");

                // 如果 log_time 为时间戳或者时间字符串，转换为 generated_time
                if (StringUtils.isNotEmpty(logTime) && StringUtils.isNumeric(logTime) && logTime.length() == 10) {
                    long timestamp = Long.parseLong(logTime + "000");
                    generatedTime = DateFormatUtils.ES_SINK_DATETIME_FORMAT.format(timestamp);
                } else if (StringUtils.isNotEmpty(logTime) && !StringUtils.isNumeric(logTime)) {
                    Date date = DateFormatUtils.parse(DateFormatUtils.SIMPLE_DATETIME_FORMAT, logTime);
                    generatedTime = DateFormatUtils.ES_SINK_DATETIME_FORMAT.format(date);
                }

                if (StringUtils.isEmpty(generatedTime)) {
                    long timestamp = System.currentTimeMillis();
                    generatedTime = DateFormatUtils.ES_SINK_DATETIME_FORMAT.format(timestamp);
                }

                jsonObject.put("generated_time", generatedTime);
            }

            // 追加写出时间 write_time
            String writeTime = DateFormatUtils.ES_SINK_DATETIME_FORMAT.format(System.currentTimeMillis());
            jsonObject.put("write_time", writeTime);

            event.setBody(jsonObject.toJSONString().getBytes(StandardCharsets.UTF_8));

        } catch (Exception e) {
            isSuccess = Boolean.FALSE;
            LOGGER.error("append time error, header info: {}, body info: {}", event.getHeaders(), body);
        }
        return isSuccess;
    }

}
```


