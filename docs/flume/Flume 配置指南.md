---
sidebar_position: 2
---

# Flume 配置指南

## Introduction

本指南为 Flume 配置指南，基于 [官方用户指南](http://flume.apache.org/releases/content/1.9.0/FlumeUserGuide.html) 编撰而成。

:::info

下文中，所有必填配置项都会以 **加粗** 字体标记。

:::

## Source

### Thrift Source

Thrift Source 用于监听 Thrift 协议端口并接收外部 Thrift 客户端发送的数据。

|**配置项**|**默认值**|**配置说明**|
|---|---|---|
|⭐ **type**|-|Thrift Source 组件类型，必须为 `thrift`|
|⭐ **channels**|-|Thrift Source 连接的隧道，多个隧道以 `,` 隔开|
|⭐ **bind**|-|Thrift Source 监听的主机名或 IP 地址|
|⭐ **port**|-|Thrift Source 绑定的端口|
|⭐ **threads**|-|Thrift Source 最大工作线程数|

使用示例：

```properties
agent.sources.r1.type = thrift
agent.sources.r1.channels = c0 c1 c2 c3 c4 c5
agent.sources.r1.bind = 0.0.0.0
agent.sources.r1.port = 4141
agent.sources.r1.threads = 1000
```

:::danger

Thrift Source 的 threads 必须配置，否则会因为一直创建线程导致内存溢出。

:::

### Avro Source

Avro Source 用于监听 Avro 协议端口并接收外部 Avro 客户端发送的数据。

|**配置项**|**默认值**|**配置说明**|
|---|---|---|
|⭐ **type**|-|Avro Source 组件类型，必须为 `avro`|
|⭐ **channels**|-|Avro Source 连接的隧道，多个隧道以 `,` 隔开|
|⭐ **bind**|-|Avro Source 绑定的主机名或 IP 地址|
|⭐ **port**|-|Avro Source 监听的端口|
|threads|-|Avro Source 最大工作线程数|
|compression-type|none|压缩类型，有 `none` 和 `deflate` 两种取值|

使用示例：

```properties
agent.sources.r1.type = avro
agent.sources.r1.channels = c0 c1 c2 c3 c4 c5
agent.sources.r1.bind = 0.0.0.0
agent.sources.r1.port = 4545
agent.sources.r1.threads = 200
agent.sources.r1.compression-type = deflate
```

:::danger

Avro Source 的 `compression-type` 需要与客户端保持一致。

:::

### Kafka Source

Kafka Source 本质上是 Kafka 消费者，用于从 Kafka Topic 中读取数据流。

|**配置项**|**默认值**|**配置说明**|
|---|---|---|
|⭐ **type**|-|Kafka Source 组件类型，必须为 `org.apache.flume.source.kafka.KafkaSource`|
|⭐ **channels**|-|Kafka Source 连接的隧道，多个隧道以 `,` 隔开|
|batchSize|1000|单批次写入 channel 的最大事件数|
|batchDurationMillis|1000|单批次写入 channel 的最大时间间隔，单位为 `ms`|
|⭐ **kafka.bootstrap.servers**|-|Kafka 集群的 broker 地址|
|⭐ **kafka.topics**|-|消费的 topic 列表，多个以 `,` 隔开|
|⭐ **kafka.topics.regex**|-|消费的 topic 列表，支持正则表达式|
|kafka.consumer.group.id|flume|消费者组名|
|kafka.consumer.auto.offset.reset|latest|消费者消费位移，`latest` 为最新，`earliest` 为最旧|
|kafka.consumer.session.timeout.ms|10000|消费者会话超时时间，可搭配 `heartbeat.interval.ms` 使用，避免频繁的 rebalance|
|kafka.consumer.request.timeout.ms|30000|消费者超时时间|
|kafka.consumer.metadata.max.age.ms|300000|消费者元数据更新时间，与新建 topic 触发的重均衡相关，若设置过大，会影响新建 topic 的实时性|
|setTopicHeader|true|是否将 topic 名称放入 header 中指定的键值对|
|topicHeader|topic|header 中用于存放 topic 名称的 key|

使用示例：

```properties
agent.sources.r1.type = org.apache.flume.source.kafka.KafkaSource
agent.sources.r1.channels = c1 c2 c3 c4 c5
agent.sources.r1.batchSize = 1000
agent.sources.r1.batchDurationMillis = 2000
agent.sources.r1.kafka.bootstrap.servers = master:9092,slave1:9092,slave2:9092
agent.sources.r1.kafka.topics.regex = ^panda_.*
agent.sources.r1.kafka.consumer.group.id = default_group
agent.sources.r1.kafka.consumer.auto.offset.reset = latest
agent.sources.r1.kafka.consumer.session.timeout.ms = 120000
```

### Spooling Directory Source

Spooling Directory Source 会监听文件系统中指定的路径，并实时从该路径读取数据文件。

|**配置项**|**默认值**|**配置说明**|
|---|---|---|
|⭐ **type**|-|Spooldir Source 组件类型，必须为 `spooldir`|
|⭐ **channels**|-|Spooldir Source 连接的隧道，多个隧道以 `,` 隔开|
|⭐ **spoolDir**|-|读取文件的根目录|
|deletePolicy|never|删除策略，有 `never` 和 `immediate` 两种取值|
|basenameHeader|false|是否追加文件名到 header 中|
|basenameHeaderKey|basename|header 中用于存放文件名的 key|
|includePattern|^.\*$|被包含文件所匹配的正则表达式，优先级低于 ignorePattern|
|ignorePattern|^$|被过滤文件所匹配的正则表达式|
|pollDelay|500|文件扫描线程池的延时时间，单位为 `ms`|
|batchSize|100|单批次写入 channel 的最大事件数|
|recursiveDirectorySearch|false|是否读取子目录下的文件|
|maxBackoff|4000|写入 Channel 失败与重新写入之间的最大休眠时间|
|deserializer.maxLineLength|2048|序列化器规定的每行最大字节数，多出的部分会被截断|

使用示例：

```properties
agent.sources.r1.type = spooldir
agent.sources.r1.channels = c1 c2 c3 c4 c5
agent.sources.r1.spoolDir = /spoolDir
agent.sources.r1.deletePolicy = immediate
agent.sources.r1.basenameHeader = true
agent.sources.r1.basenameHeaderKey = base_name
agent.sources.r1.includePattern = ^.*$
agent.sources.r1.ignorePattern = \.*tmp$
agent.sources.r1.pollDelay = 500
agent.sources.r1.batchSize = 1000
agent.sources.r1.recursiveDirectorySearch = true
agent.sources.r1.maxBackoff = 4000
agent.sources.r1.deserializer.maxLineLength = 1000000
```

## Selector

### Replicating Selector

Replicating Selector 为复制流选择器，也是 Flume 中的默认选择器，**无需显示配置**。

假设有个 source 连接了 5 条隧道，如：

```properties
agent.sources.r1.channels = c1 c2 c3 c4 c5
```

那么 Replicating Selector 会将数据复制 5 份均分到 5 条隧道中。

### Multiplexing Selector

Multiplexing Selector 为多路传输选择器，支持通过指定的 header 选择数据传输隧道。

|**配置项**|**默认值**|**配置说明**|
|---|---|---|
|selector.type|replicating|Selector 组件类型，必须为 `multiplexing`|
|selector.header|flume.selector.header|用于隧道分流的 header|
|selector.mapping.\*|-|用于设置 header 中对应 value 与 channel 的映射关系，若一个 mapping 中包含多个传输隧道，多个隧道间以空格隔开|
|selector.default|-|选择器默认隧道|

使用示例：

```properties
agent.sources.r1.selector.type = multiplexing
agent.sources.r1.selector.header = topic
agent.sources.r1.selector.mapping.panda= c1
agent.sources.r1.selector.mapping.sue= c1 c2
agent.sources.r1.selector.default = c2
```

## Channel

### File Channel

File Channel 是基于文件系统的传输隧道，传输速度较慢，但是具备完善的检查点机制，**可以保证数据不丢失**。

|**配置项**|**默认值**|**配置说明**|
|---|---|---|
|⭐ **type**|-|File Channel 组件类型，必须为 `file`|
|dataDirs|~/.flume/file-channel/data|数据存储目录|
|checkpointDir|~/.flume/file-channel/checkpoint|checkpoint 存储目录|
|useDualCheckpoints|false|是否备份 checkpoint，若备份，必须设置 backupCheckpointDir|
|backupCheckpointDir|-|checkpoint 备份目录，不得与 checkpoint 存储目录相同|
|capacity|1000000|channel 的最大容量|
|transactionCapacity|10000|事务的最大容量|
|maxFileSize|2146435071|单个日志文件的最大大小，单位为 `byte`|
|checkpointInterval|30000|checkpoint 检查时间间隔，单位为 `ms`|

使用示例：

```properties
agent.channels.c1.type = file
agent.channels.c1.dataDirs = /data/agent/flume-data
agent.channels.c1.useDualCheckpoints = true
agent.channels.c1.checkpointDir = /data/agent/flume-checkpoint1
agent.channels.c1.backupCheckpointDir = /data/agent/flume-checkpoint2
agent.channels.c1.capacity = 2500000
agent.channels.c1.transactionCapacity = 5000
agent.channels.c1.maxFileSize = 524288000
agent.channels.c1.checkpointInterval = 10000
```

:::danger

Source 的 batchSize 需要小于 transactionCapacity，否则数据在批量进入 channel 时会抛出异常。

:::

### Memory Channel

Memory Channel 是基于内存的传输隧道，具有非常优异的传输速度，但是没有任何容错保障，通常只用于测试。

|**配置项**|**默认值**|**配置说明**|
|---|---|---|
|⭐ **type**|-|Memory Channel 组件类型，必须为 `memory`|
|capacity|100|channel 的最大容量|
|transactionCapacity|100|事务的最大容量|

使用示例：

```properties
agent.channels.c1.type = memory
agent.channels.c1.capacity = 10000
agent.channels.c1.transactionCapacity = 2000
```

## Sink

### Kafka Sink

Kafka Sink 支持将事件写入到 Kafka。

|**配置项**|**默认值**|**配置说明**|
|---|---|---|
|⭐ **channel**|-|Kafka Sink 消费的 channel|
|⭐ **type**|-|Kafka Sink 组件类型，必须为 `org.apache.flume.sink.kafka.KafkaSink`|
|⭐ **brokerList**|-|Kafka 集群的 broker 地址|
|requiredAcks|1|写入结果验证，`1` 表示只需要等待 leader 确认，`0` 表示不需要确认，`-1` 表示需要所有副本确认|
|topic|default-flume-topic|写入的 topic，可被 allowTopicOverride 覆盖|
|allowTopicOverride|true|是否允许将消息生成到由 topicHeader 指定的 topic|
|topicHeader|topic|配合 allowTopicOverride 使用，设置用于指定 topic  名称的 header|
|flumeBatchSize|100|单批次写入 Kafka 的事件数|
|kafka.producer.batch.size|16384|生产者批量发送消息的阈值，单位为 `byte`|
|kafka.producer.linger.ms|0|用来指定生产者发送 ProducerBatch 之前等待更多消息（ProducerRecord）加入ProducerBatch 的时间，单位为 `ms`|
|kafka.producer.max.request.size|1048576|生产者能发送的消息的最大值，单位为 `byte`|
|kafka.producer.buffer.memory|33554432|生产者用于缓存消息的缓冲区大小，单位为 `byte`|
|kafka.producer.compression.type|none|消息压缩方式，可选值有 `none`、`gzip`、`snappy`、`lz4`|

使用示例：

```properties
agent.sinks.k1.type = org.apache.flume.sink.kafka.KafkaSink
agent.sinks.k1.channel = c1
agent.sinks.k1.brokerList = master:9092,slave1:9092,slave2:9092
agent.sinks.k1.requiredAcks = -1
agent.sinks.k1.allowTopicOverride = true
agent.sinks.k1.topicHeader = topic
agent.sinks.k1.kafka.producer.batch.size = 10485760
agent.sinks.k1.kafka.producer.linger.ms = 1000
agent.sinks.k1.kafka.producer.max.request.size = 62914560
agent.sinks.k1.kafka.producer.buffer.memory = 671088640
agent.sinks.k1.kafka.producer.compression.type = gzip
agent.sinks.k1.supportHeader = true
agent.sinks.k1.detectInvalidTopic = true
```

:::caution

Kafka Sink 在发送完 flumeBatchSize 数量的事件后会显示调用 `flush()` 方法，**因此生产者中用于控制吞吐量的 batch.size 和 linger.ms 是否生效要取决于 flumeBatchSize 的大小**。若 flumeBatchSize 的相对大小较大，这两个参数可以正常生效；若 flumeBatchSize 的相对大小较小，则这两个参数还未生效前数据就已经被刷出缓存区了。

:::

### OBS Sink

OBS Sink 为华为云官方提供的 Sink 组件，支持将事件写入到华为云 OBS 中。

|**配置项**|**默认值**|**配置说明**|
|---|---|---|
|⭐ **channel**|-|OBS Sink 消费的 channel|
|⭐ **type**|-|OBS Sink 组件类型，必须为 `hdfs`|
|⭐ **hdfs.path**|-|OBS 存储路径，需要以 `obs://` 为前缀|
|hdfs.useLocalTimeStamp|false|是否使用本地时间|
|hdfs.filePrefix|FlumeData|文件前缀|
|hdfs.inUsePrefix|-|写入过程中的文件前缀|
|hdfs.inUseSuffix|.tmp|写入过程中的文件后缀|
|hdfs.fileType|SequenceFile|文件类型，当前可用的取值有 `SequenceFile`、`DataStream`、`CompressedStream`|
|hdfs.writeFormat|Writable|SequenceFile 的写入格式，有 `Writable`、`Text` 两种取值，需设置为 `Text`，否则 Impala 或 Hive 无法读取这些文件|
|hdfs.rollSize|1024|触发滚动的文件大小，单位为 `byte`|
|hdfs.rollCount|10|触发滚动的事件数|
|hdfs.rollInterval|30|触发滚动的时间间隔，单位为 `s`|
|hdfs.batchSize|100|单批次写入 OBS 的事件数|
|hdfs.round|false|时间戳是否四舍五入|
|hdfs.roundValue|1|四舍五入到小于当前时间的最高倍数|
|hdfs.roundUnit|second|下舍单位|
|hdfs.minBlockReplicas|-|指定每个 hdfs 块的最小副本数|
|hdfs.closeTries|0|关闭尝试后，接收器必须尝试重命名文件的次数，若为 1，则该接收器将不会重试失败的重命名|
|hdfs.callTimeout|30000|HDFS 操作的超时时间|
|serializer|TEXT|序列化器|
|serializer.\*|-|序列化器相关配置|

OBS Sink 支持大量的转义序列，这里仅展示当前常用的几个：

|**转义符**|**转义说明**|
|---|---|
|%Y|年份，如 `2021`|
|%m|月份，取值范围为 `01` ~ `12`|
|%d|每月的某天，如 `01`|
|%H|小时，取值范围为 `00` ~ `23`|
|%M|分钟，取值范围为 `00` ~ `59`|
|%[FQDN]|Flume 所在主机（容器）的标准主机名|

:::info

OBS Sink 支持通过转义序列获取事件的 header 信息。假如某个事件有 key 为 topic 的 header 键值对，那么 OBS Sink 可以通过 %!{(MISSING)topic} 获取对应键值对里的值。

:::

使用示例：

```properties
agent.sinks.k1.channel = c1
agent.sinks.k1.type = hdfs
agent.sinks.k1.hdfs.useLocalTimeStamp = true
agent.sinks.k1.hdfs.filePrefix = %{topic}_%[FQDN]_v1
agent.sinks.k1.hdfs.path = obs://xxx/flume/%{topic}/create_time=%Y-%m-%d %H-%M
agent.sinks.k1.hdfs.inUsePrefix = _
agent.sinks.k1.hdfs.fileType = DataStream
agent.sinks.k1.hdfs.writeFormat = Text
agent.sinks.k1.hdfs.rollSize = 524288000
agent.sinks.k1.hdfs.rollCount = 0
agent.sinks.k1.hdfs.rollInterval = 300
agent.sinks.k1.hdfs.batchSize = 10000
agent.sinks.k1.hdfs.round = true
agent.sinks.k1.hdfs.roundValue = 10
agent.sinks.k1.hdfs.roundUnit = minute
agent.sinks.k1.hdfs.minBlockReplicas = 1
agent.sinks.k1.hdfs.closeTries = 1
agent.sinks.k1.hdfs.callTimeout = 300000
```

:::danger

根据华为云官方描述，其 OBS FileSystem 实现的 HDFS 协议不支持租约机制，**在多线程并发写同一份文件的情况下可能会出现数据丢失的问题**，因此在 OBS Sink 中需要通过 `filePrefix` 对各线程进行文件名隔离。

:::

### Avro Sink

Avro Sink 本质上为 Avro 客户端，支持发送事件到 Avro 接收端。

|**配置项**|**默认值**|**配置说明**|
|---|---|---|
|⭐ **type**|-|Avro Sink 组件类型，必须为 `avro`|
|⭐ **channel**|-|Avro Sink 消费的 channel|
|⭐ **hostname**|-|Avro Sink 绑定的主机名或 IP 地址|
|⭐ **port**|-|Avro Sink 监听的端口|
|batch-size|100|单批次发送的事件数|
|reset-connection-interval|none|连接重置时间间隔（单位 `s`），该配置允许 Avro Sink 直接连接负载均衡地址，即便该地址有新主机加入也无需重启 Flume|
|compression-type|none|压缩类型，有 `none` 和 `deflate` 两种取值|
|compression-level|6|压缩等级，`0` 表述不压缩，`1` ~ `9` 表示压缩，且数值越高，压缩率越高|

使用示例：

```properties
agent.sinks.k1.type = avro
agent.sinks.k1.channel = c1
agent.sinks.k1.hostname = xxx.xxx.xxx.xxx
agent.sinks.k1.port = 4545
agent.sinks.k1.batch-size = 500
agent.sinks.k1.reset-connection-interval = 600
agent.sinks.k1.compression-type = deflate
agent.sinks.k1.compression-level = 6
```

:::danger

Avro Sink 的 compression-type 需要与接收端保持一致。

:::

### Logger Sink

Logger Sink 以 `INFO` 级别输出事件到程序日志，通常用于测试。

|**配置项**|**默认值**|**配置说明**|
|---|---|---|
|⭐ **type**|-|Logger Sink 组件类型，必须为 `logger`|
|⭐ **channel**|-|Logger Sink 消费的 channel|
|maxBytesToLog|16|事件 body 的最大输出大小，单位为 `byte`|

使用示例：

```properties
agent.sinks.k1.type = logger
agent.sinks.k1.channel = c1
```

### Null Sink

Null Sink 用于丢弃一些不需要的事件。

|**配置项**|**默认值**|**配置说明**|
|---|---|---|
|⭐ **type**|-|Null Sink 组件类型，必须为 `null`|
|⭐ **channel**|-|Null Sink 消费的 channel|
|batchSize|100|单批次大小|

使用示例：

```properties
agent.sinks.k1.type = null
agent.sinks.k1.channel = c1
```

:::caution

Null Sink 事件一经丢弃，无法找回，使用时务必谨慎。

:::



