---
sidebar_position: 1
---

# 使用 HttpClient 实现页面源码下载

:::info

爬虫的第一步，是获取页面源码。

:::

如果我们是在浏览器上访问网页，那么获取页面源码非常简单，只要单击鼠标右键，点击查看网页源码即可。

但是，我们现在需要实现的是，在程序内部获取页面源码。这意味着，我们要在应用程序内实现 HTTP 协议的支持。尽管 Java 类库 .net 包为我们上述的需求提供了基本功能，但在灵活性和易用性上实在差强人意。所幸，在第三方类库中，有一个名为 HttpClient 的强大工具包，为开发者提供了更加灵活、更加高效的 HTTP 支持。

## 一、HttpClient 简介

HttpClient 的前身是 Apache Jakarta Common 下的子项目，是用来提供高效的、最新的、功能丰富的支持 HTTP 协议的客户端编程工具包。如今，HttpClient 项目已更名为 HttpComponents，由 Apache Software Foundation （apache 软件基金会）进行维护。

在使用 HttpClient 前，要确保项目中已添加相应的 jar 包。本教程使用的 jar 包版本如下：

- httpclient-4.5.2.jar

另，编译时还需要以下 jar 包：

- commons-codec.jar
- commons-logging.jar
- httpcore.jar

建议使用 Maven 管理依赖，只需在 pom.xml 文件中添加以下配置：

```xml
<dependency>
    <groupId>org.apache.httpcomponents</groupId>
    <artifactId>httpclient</artifactId>
    <version>4.5.2</version>
</dependency>
```


## 二、HttpClient 基本应用

使用 HttpClient 发送一个基本的请求很简单，一般只需以下 5 个步骤：

1. 创建 HttpClient 对象；
2. 创建请求方法实例，并指定请求 URL。如果需要发送 GET 请求，创建 HttpGet 对象；如果需要发送 POST 请求，创建 HttpPost 对象；
3. 调用 HttpClient 实例的 `execute()` 方法，获取 HttpResponse 对象；
4. 调用 HttpResponse 实例的 `getEntity()` 方法，获取 HttpEntity 对象，该对象包含了响应内容；
5. 释放连接。

下面我们将通过示例，分别使用 HttpGet 类和 HttpPost 类实现 HTTP Get 请求和 HTTP Post 请求。

### 2.1 HttpGet

```java
public static String executeGetRequest(String url) {

    // 创建 HttpClient 对象
    CloseableHttpClient httpClient = HttpClients.createDefault();
    String responseBody = null;
    
    try {

        // 创建 HttpGet 实例
        HttpGet httpGet = new HttpGet(url);

        // 获取响应对象
        HttpResponse response = httpClient.execute(httpGet);
        int statusCode = response.getStatusLine().getStatusCode();
        logger.info("状态码: " + statusCode);

        // 获取响应实体
        HttpEntity entity = response.getEntity();
        if (entity != null) {
            responseBody = EntityUtils.toString(entity, charset);
        }
        
    } catch (Exception e) {
        logger.error("发送GET请求出现异常：", e);
    } finally {
        // 关闭连接
        if (httpClient != null) {
            try {
                httpClient.close();
            } catch (IOException e) {
                logger.error("关闭连接异常：", e);
            }
        }
    }

    return responseBody;
}
```

### 2.2 HttpPost

由于 Post 请求一般是带参数的，因此，使用 HttpPost 实现 Post 请求，还需要增加一个创建参数的步骤。

```java
public static String executePostRequest(String url, Map<String, String> map) {

    // 创建 HttpClient 对象
    CloseableHttpClient httpClient = HttpClients.createDefault();
    String responseBody = null;

    try {

        // 创建 HttpGet 实例
        HttpPost httpPost = new HttpPost(url);

        // 创建请求参数
        List<NameValuePair> formParams = new ArrayList<NameValuePair>();
        Iterator iterator = map.entrySet().iterator();
        while (iterator.hasNext()) {
            Map.Entry<String, String> element = (Map.Entry<String, String>) iterator.next();
            formParams.add(new BasicNameValuePair(element.getKey(), element.getValue()));
        }
        if (formParams.size() > 0) {
            UrlEncodedFormEntity formEntity = new UrlEncodedFormEntity(formParams, charset);
            httpPost.setEntity(formEntity);
        }

        // 获取响应对象
        HttpResponse response = httpClient.execute(httpPost);
        int statusCode = response.getStatusLine().getStatusCode();
        logger.info("状态码: " + statusCode);

        // 获取响应实体
        HttpEntity entity = response.getEntity();
        if (entity != null) {
            responseBody = EntityUtils.toString(entity, charset);
        }

    } catch (Exception e) {
        logger.error("发送POST请求出现异常：", e);
    } finally {
        // 关闭连接
        if (httpClient != null) {
            try {
                httpClient.close();
            } catch (IOException e) {
                logger.error("关闭连接异常：", e);
            }
        }
    }

    return responseBody;
}
```

我们编写测试类分别测试上述两个方法，均可正常获取页面源码。

```java
package util;

import org.junit.Test;

import java.util.HashMap;
import java.util.Map;

/**
 * HTTP工具类单元测试
 *
 * @author panda
 * @date 2017/11/23
 */
public class HttpUtilTest {

    @Test
    public void testExecuteGetRequest() {
        String responseBody = HttpUtil.executeGetRequest("http://www.baidu.com");
        assert responseBody != null;
        System.out.println(responseBody);
    }

    @Test
    public void testExecutePostRequest() {
        Map<String, String> params = new HashMap<String, String>();
        params.put("Db", "introduction");
        params.put("valuepath", "0%7C1");
        params.put("find_count", "0");
        params.put("kwd", "test");
        String responseBody = HttpUtil.executePostRequest("http://www.pkulaw.cn/doCluster.ashx", params);
        assert responseBody != null;
        System.out.println(responseBody);
    }

}
```

## 三、Cookie 设置

有些网站，需要我们在请求头中添加 Cookie 信息，才能正常访问。在浏览器中，请求头的设置对于我们来说是透明的，但是在 HttpClient 中，请求头的设置需要我们自己完成，而 Header 类，就是请求头设置的载体。它包含了 `name` 和 `value` 两个成员变量，对应请求头中的键值对。

想要使用 HttpClient 实现 Cookie 设置，我们需要做两项工作：

1. 使用浏览器访问目标网站，通过开发者工具获取请求头中的 Cookie 值；
2. 对上面的代码进行一定的调整，在 Header 对象中添加 Cookie 信息，并将封装好的 Header 对象赋予 HttpGet/HttpPost 实例。

下面是调整后的代码示例。

```java
public static String executeGetRequest(String url, Header[] headers) {

    // 创建 HttpClient 对象
    CloseableHttpClient httpClient = HttpClients.createDefault();
    String responseBody = null;

    try {

        // 创建 HttpGet 实例
        HttpGet httpGet = new HttpGet(url);

        // 设置请求头
        if (headers != null) {
            httpGet.setHeaders(headers);
        }

        // 获取响应对象
        HttpResponse response = httpClient.execute(httpGet);
        int statusCode = response.getStatusLine().getStatusCode();
        logger.info("状态码: " + statusCode);

        // 获取响应实体
        HttpEntity entity = response.getEntity();
        if (entity != null) {
            responseBody = EntityUtils.toString(entity, charset);
        }

    } catch (Exception e) {
        logger.error("发送GET请求出现异常：", e);
    } finally {
        // 关闭连接
        if (httpClient != null) {
            try {
                httpClient.close();
            } catch (IOException e) {
                logger.error("关闭连接异常：", e);
            }
        }
    }

    return responseBody;
}
```


```java
@Test
public void testExecuteGetRequestByCookie() {
    String cookieStr = "xxx";
    Header header = new BasicHeader("cookie", cookieStr);
    Header[] headers = {header};
    String responseBody = HttpUtil.executeGetRequest("https://weibo.com/u/xxx", headers);
    assert responseBody != null;
    System.out.println(responseBody);
}
```

## 四、代理设置

在获取源码上，爬虫容易碰到两个瓶颈：

- 目标网站有反爬虫机制，频繁访问会被封 ip
- 目标网站无法通过本地区网络直接访问

这两个问题都有共同的解决方式，那就是使用代理，由代理服务器替我们完成网络请求。

在 HttpClient 中，配置代理需要以下两个步骤。

第一，创建实现 Basic 认证、包含代理登录信息的 HttpClient 实例：

```java
private static CloseableHttpClient initHttpClient(HttpParams httpParams) {

    CloseableHttpClient httpClient = null;

    if (httpParams == null) {
        httpClient = HttpClients.createDefault();
    }

    if (httpParams.getNeedProxy()) {
        // 配置代理登录的用户账号与密码
        String userName = httpParams.getProxy().getProxyUserName();
        String password = httpParams.getProxy().getProxyPassword();

        if (userName != null && password != null) {
            // 实现 Basic 认证
            CredentialsProvider credsProvider = new BasicCredentialsProvider();
            credsProvider.setCredentials(
                    new AuthScope(AuthScope.ANY),
                    new UsernamePasswordCredentials(userName, password));
            httpClient = HttpClients.custom()
                    .setDefaultCredentialsProvider(credsProvider)
                    .build();
        }
    }

    if (httpClient == null) {
        httpClient = HttpClients.createDefault();
    }

    return httpClient;
}
```

第二，创建指定代理 ip 地址与端口的 RequestConfig 实例：

```java
private static RequestConfig initRequestConfig(HttpParams httpParams) {

    RequestConfig requestConfig = RequestConfig.DEFAULT;

    if (httpParams == null) {
        return requestConfig;
    }

    if (httpParams.getNeedProxy()) {
        // 指定代理 ip 与端口
        String proxyIp = httpParams.getProxy().getProxyIp();
        Integer proxyPort = httpParams.getProxy().getProxyPort();

        if (proxyIp != null && proxyPort != null) {
            HttpHost proxy = new HttpHost(proxyIp, proxyPort);
            requestConfig = RequestConfig.custom()
                    .setProxy(proxy)
                    .build();
        }
    }

    return requestConfig;
}
```

这样，整个实现代理配置的代码示例如下所示：

```java
public static String executeGetRequest(HttpParams httpParams) {

    // 创建 HttpClient 对象
    CloseableHttpClient httpClient = initHttpClient(httpParams);
    String responseBody = null;

    try {

        // 创建 HttpGet 实例
        HttpGet httpGet = new HttpGet(httpParams.getUrl());

        // 设置 RequestConfig
        if (httpParams.getRequestConfig() != null) {
            httpGet.setConfig(httpParams.getRequestConfig());
        } else {
            httpGet.setConfig(initRequestConfig(httpParams));
        }

        // 设置请求头
        if (httpParams.getHeaderMap() != null) {
            Header[] headers = getHeadersByMap(httpParams.getHeaderMap());
            httpGet.setHeaders(headers);
        }

        // 获取响应对象
        HttpResponse response = httpClient.execute(httpGet);
        int statusCode = response.getStatusLine().getStatusCode();
        logger.info("状态码: " + statusCode);

        // 获取响应实体
        HttpEntity entity = response.getEntity();
        if (entity != null) {
            responseBody = EntityUtils.toString(entity, httpParams.getCharset());
        }

    } catch (Exception e) {
        logger.error("发送GET请求出现异常：", e);
    } finally {
        // 关闭连接
        if (httpClient != null) {
            try {
                httpClient.close();
            } catch (IOException e) {
                logger.error("关闭连接异常：", e);
            }
        }
    }

    return responseBody;
}
```

## 五、结语

HttpClient 的学习不是一朝一夕能完成的，它还有更多功能需要去挖掘去实践。

关于 HttpClient 的更多示例，请看官网：[http://hc.apache.org/httpcomponents-client-4.5.x/examples.html](http://hc.apache.org/httpcomponents-client-4.5.x/examples.html)

