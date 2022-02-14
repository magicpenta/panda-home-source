---
sidebar_position: 3
---

# 基于 HtmlParser 实现网页链接提取

:::info

爬虫程序的第三步，是提取页面链接。

:::

页面链接的提取，是爬虫程序中非常关键的一部分。一个完整的爬虫程序，要能从种子 URL 出发，逐步遍历子节点中的所有页面。就比如我们想采集微博内容时，不能仅仅采集第一页的内容，而要实现从第一页开始一直采集到尾页。

本篇主要介绍一款能提取网页链接的强大类库，HtmlParser。

## 一、HtmlParser

HtmlParser 是一个通过线性和嵌套两种方式来解析网页的 Java 开源类库，主要用于网页元素的转换以及网页内容的抽取。它具备如下特性：

- 过滤器
- 访问者模式
- 自定义标签
- 易于使用的 Java 组件

正如官网简介里所述，HtmlParser 是一个快速的、健壮的、经过严格测试的工具包。

## 二、NodeFilter

HtmlParser 具备过滤器的特性，我们可以通过这个特性过滤并提取网页中的链接。

HtmlParser 中与过滤相关的基本接口是 NodeFilter，接口中只定义了一个方法。

```java
package org.htmlparser;

import java.io.Serializable;
import org.htmlparser.Node;

public interface NodeFilter extends Serializable, Cloneable {
    boolean accept(Node var1);
}
```

该方法的作用是，对于想要保留的节点，返回 true；对于满足过滤条件、需要过滤掉的节点，返回 false。

HtmlParser 本身就提供了多种实现 NodeFilter 接口的过滤器，如下表所示：

|类别|类名|
|---|---|
|逻辑运算类|AndFilter、NotFilter、OrFilter|
|判断类|HasAttributeFilter、HasChildFilter、HasParentFilter、HasSiblingFilter、IsEqualFilter、TagNameFilter|
|其他|CssSelectorNodeFilter、LinkRegexFilter、LinkStringFilter、NodeClassFilter、RegexFilter、StringFilter|

当然，开发人员也可以自定义 Filter，用于实现一些特殊情况的过滤。

## 三、简易链接提取器

使用 HtmlParser 实现链接提取，需要以下步骤：

- 使用 url 或者网页源码创建一个 Parser 对象；
- 构建满足需求的过滤器对象；
- 通过 Parser 的 `extractAllNodesThatMatch(NodeFilter filter)` 方法提取过滤后的节点；
- 通过节点获取链接信息。

以下是 HtmlParser 提取网页链接的具体示例：

```java
package filter;

import org.htmlparser.Node;
import org.htmlparser.Parser;
import org.htmlparser.filters.NodeClassFilter;
import org.htmlparser.filters.OrFilter;
import org.htmlparser.tags.FrameTag;
import org.htmlparser.tags.LinkTag;
import org.htmlparser.util.NodeList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;

/**
 * 链接提取器
 *
 * @author panda
 * @date 2017/10/28
 */
public class LinkExtractor {

    private static final Logger logger = LoggerFactory.getLogger(LinkExtractor.class);

    public static List<String> extractLinks(String body, LinkFilter filter) {

        List<String> linkList = new ArrayList<String>();

        try {

            Parser parser = new Parser(body);

            OrFilter linkFilter = new OrFilter(
                    new NodeClassFilter[]{
                            new NodeClassFilter(LinkTag.class),
                            new NodeClassFilter(FrameTag.class)
                    }
            );
            NodeList nodeList = parser.extractAllNodesThatMatch(linkFilter);

            if (nodeList != null) {
                logger.info("发现链接个数：" + nodeList.size());
            }

            for (int i = 0; i < nodeList.size(); i++) {

                Node node = nodeList.elementAt(i);
                String linkUrl;

                if (node instanceof LinkTag) {
                    LinkTag link = (LinkTag) node;
                    linkUrl = link.getAttribute("HREF");
                } else {
                    FrameTag frame = (FrameTag) node;
                    linkUrl = frame.getFrameLocation();
                }

                // 如果有自定义过滤器，则增加自定义过滤条件
                if (filter != null && linkUrl != null) {
                    if (!filter.accept(linkUrl)) {
                        linkUrl = null;
                    }
                }

                if (linkUrl == null || "".equals(linkUrl) || "#".equals(linkUrl) || linkUrl.startsWith("javascript")) {
                    continue;
                }

                // 防止链接重复
                if (!linkList.contains(linkUrl)) {
                    linkList.add(linkUrl);
                }
            }

            if (linkList != null) {
                logger.info("提取链接个数：" + linkList.size());
            }

        } catch (Exception e) {
            logger.error("提取链接异常：", e);
        }

        return linkList;
    }

}
```

我们编写一个简单的单元测试进行测试。

```java
@Test
public void testExtractLinksWithoutFilter() {
    String body = HttpUtil.executeGetRequest("http://sm.xmu.edu.cn/");
    List<String> linkList = LinkExtractor.extractLinks(body, null);
    for (int i = 0; i < linkList.size(); i++) {
        System.out.println("linkUrl:" + linkList.get(i));
    }
}
```

输出结果如下：

```纯文本
INFO - 发现链接个数：148
INFO - 提取链接个数：131
linkUrl:http://sm.xmu.edu.cn/html/mp/
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=lists&catid=432
linkUrl:http://sm.xmu.edu.cn/html/english/
linkUrl:http://sm2.xmu.edu.cn/default2.asp
linkUrl:http://sm.xmu.edu.cn/
linkUrl:http://sm.xmu.edu.cn/html/about/overview/overview/
linkUrl:http://sm.xmu.edu.cn/html/about/message/
linkUrl:http://sm.xmu.edu.cn/html/about/leaders/
linkUrl:http://sm.xmu.edu.cn/html/about/department/
linkUrl:http://sm.xmu.edu.cn/html/about/structure/
linkUrl:http://sm.xmu.edu.cn/html/about/service/
linkUrl:http://sm.xmu.edu.cn/html/about/contact/
linkUrl:http://sm.xmu.edu.cn/html/current_students/
linkUrl:http://sm.xmu.edu.cn/keyan/TeacherWeb/Teacher_Special.aspx
linkUrl:http://sm.xmu.edu.cn/html/research/research_news/
linkUrl:http://sm.xmu.edu.cn/html/research/academic/
linkUrl:http://sm.xmu.edu.cn/html/research/research_center/
linkUrl:http://sm.xmu.edu.cn/html/intl/
linkUrl:http://sm.xmu.edu.cn/html/intl/overview/
linkUrl:http://sm.xmu.edu.cn/html/intl/authentication/
linkUrl:http://sm.xmu.edu.cn/html/intl/news/
linkUrl:http://sm.xmu.edu.cn/html/intl/student/
linkUrl:http://sm.xmu.edu.cn/html/intl/2_2/
linkUrl:http://sm.xmu.edu.cn/html/intl/International_students/
linkUrl:http://sm.xmu.edu.cn/html/intl/guide/
linkUrl:http://sm.xmu.edu.cn/html/intl/contact/
linkUrl:http://smcareer.xmu.edu.cn/
linkUrl:http://sm-alumni.xmu.edu.cn/
linkUrl:http://sm.xmu.edu.cn
linkUrl:https://xmu.higheredtalent.org/Login
linkUrl:http://pme.xmu.edu.cn/
linkUrl:http://sm.xmu.edu.cn/html/programs/
linkUrl:http://sm.xmu.edu.cn/html/programs/ung/
linkUrl:http://sm.xmu.edu.cn/html/programs/master/
linkUrl:http://sm.xmu.edu.cn/html/programs/phd/
linkUrl:http://mba.xmu.edu.cn/
linkUrl:http://emba.xmu.edu.cn/
linkUrl:http://www.xmuedp.com/
linkUrl:http://sm.xmu.edu.cn/html/about/department/MPAcc/
linkUrl:http://meem.xmu.edu.cn/
linkUrl:http://sm.xmu.edu.cn/html/about/department/mta/
linkUrl:http://smice.xmu.edu.cn/
linkUrl:http://sm.xmu.edu.cn/html/programs/bsh/
linkUrl:http://sm.xmu.edu.cn/html/about/department/bm/class/
linkUrl:http://femba.xmu.edu.cn
linkUrl:http://ifas.xmu.edu.cn/cms/Channel.aspx?ID=147
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=show&catid=149&id=3103
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=show&catid=149&id=2982
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=show&catid=149&id=2975
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=show&catid=149&id=2923
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=show&catid=149&id=2914
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=show&catid=149&id=2896
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=show&catid=149&id=2873
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=show&catid=149&id=2872
linkUrl:http://sm.xmu.edu.cn/html/jwxx/
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=show&catid=150&id=3278
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=show&catid=150&id=3267
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=show&catid=150&id=3246

……
```

如果我们想添加自定义的过滤规则，比如只保留当前域名下的链接，可通过以下测试示例实现：

```java
@Test
public void testExtractLinksWithFilter() {
    String body = HttpUtil.executeGetRequest("http://sm.xmu.edu.cn/");
    LinkFilter filter = new LinkFilter() {
        public boolean accept(String link) {
            return link.contains("sm.xmu.edu.cn");
        }
    };
    List<String> linkList = LinkExtractor.extractLinks(body, filter);
    for (int i = 0; i < linkList.size(); i++) {
        System.out.println("linkUrl:" + linkList.get(i));
    }
}
```

输出结果如下：

```纯文本
INFO - 发现链接个数：148
INFO - 提取链接个数：107
linkUrl:http://sm.xmu.edu.cn/html/mp/
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=lists&catid=432
linkUrl:http://sm.xmu.edu.cn/html/english/
linkUrl:http://sm.xmu.edu.cn/
linkUrl:http://sm.xmu.edu.cn/html/about/overview/overview/
linkUrl:http://sm.xmu.edu.cn/html/about/message/
linkUrl:http://sm.xmu.edu.cn/html/about/leaders/
linkUrl:http://sm.xmu.edu.cn/html/about/department/
linkUrl:http://sm.xmu.edu.cn/html/about/structure/
linkUrl:http://sm.xmu.edu.cn/html/about/service/
linkUrl:http://sm.xmu.edu.cn/html/about/contact/
linkUrl:http://sm.xmu.edu.cn/html/current_students/
linkUrl:http://sm.xmu.edu.cn/keyan/TeacherWeb/Teacher_Special.aspx
linkUrl:http://sm.xmu.edu.cn/html/research/research_news/
linkUrl:http://sm.xmu.edu.cn/html/research/academic/
linkUrl:http://sm.xmu.edu.cn/html/research/research_center/
linkUrl:http://sm.xmu.edu.cn/html/intl/
linkUrl:http://sm.xmu.edu.cn/html/intl/overview/
linkUrl:http://sm.xmu.edu.cn/html/intl/authentication/
linkUrl:http://sm.xmu.edu.cn/html/intl/news/
linkUrl:http://sm.xmu.edu.cn/html/intl/student/
linkUrl:http://sm.xmu.edu.cn/html/intl/2_2/
linkUrl:http://sm.xmu.edu.cn/html/intl/International_students/
linkUrl:http://sm.xmu.edu.cn/html/intl/guide/
linkUrl:http://sm.xmu.edu.cn/html/intl/contact/
linkUrl:http://sm.xmu.edu.cn
linkUrl:http://sm.xmu.edu.cn/html/programs/
linkUrl:http://sm.xmu.edu.cn/html/programs/ung/
linkUrl:http://sm.xmu.edu.cn/html/programs/master/
linkUrl:http://sm.xmu.edu.cn/html/programs/phd/
linkUrl:http://sm.xmu.edu.cn/html/about/department/MPAcc/
linkUrl:http://sm.xmu.edu.cn/html/about/department/mta/
linkUrl:http://sm.xmu.edu.cn/html/programs/bsh/
linkUrl:http://sm.xmu.edu.cn/html/about/department/bm/class/
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=show&catid=149&id=3103
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=show&catid=149&id=2982
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=show&catid=149&id=2975
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=show&catid=149&id=2923
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=show&catid=149&id=2914
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=show&catid=149&id=2896
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=show&catid=149&id=2873
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=show&catid=149&id=2872
linkUrl:http://sm.xmu.edu.cn/html/jwxx/
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=show&catid=150&id=3278
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=show&catid=150&id=3267
linkUrl:http://sm.xmu.edu.cn/index.php?m=content&c=index&a=show&catid=150&id=3246

……
```

我们发现，自定义的过滤器起到了作用，程序只提取了当前域名下的链接。

