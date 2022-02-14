---
sidebar_position: 2
---

# ClickHouse JDBC

## JDBC 驱动

ClickHouse 有两种 JDBC 驱动实现。

**官方驱动：**

```xml
<dependency>
    <groupId>ru.yandex.clickhouse</groupId>
    <artifactId>clickhouse-jdbc</artifactId>
    <version>0.1.52</version>
</dependency>
```

**三方提供的驱动：**

```xml
<dependency>
    <groupId>com.github.housepower</groupId>
    <artifactId>clickhouse-native-jdbc</artifactId>
    <version>1.6-stable</version>
</dependency>
```

两者间的主要区别如下：

- 驱动类加载路径不同，分别为 `ru.yandex.clickhouse.ClickHouseDriver` 和 `com.github.housepower.jdbc.ClickHouseDriver`
- 默认连接端口不同，分别为 `8123` 和 `9000`
- 连接协议不同，官方驱动使用 HTTP 协议，而三方驱动使用 TCP 协议

:::danger

**两种驱动不可共用**，同个项目中只能选择其中一种驱动。

:::

## 代码示例

本例使用三方提供的驱动，示例代码如下所示：

### create table

```java
Class.forName("com.github.housepower.jdbc.ClickHouseDriver");
Connection connection = DriverManager.getConnection("jdbc:clickhouse://192.168.60.131:9000");

Statement statement = connection.createStatement();
statement.executeQuery("create table test.jdbc_example(day Date, name String, age UInt8) Engine=Log");
```

通过 `clickhouse-client` 命令行界面查看表情况：

```sql
ck-master :) show tables;

SHOW TABLES

┌─name─────────┐
│ hits         │
│ jdbc_example │
└──────────────┘
```

发现表 `jdbc_example` 成功创建。

### batch insert

```java
Class.forName("com.github.housepower.jdbc.ClickHouseDriver");
Connection connection = DriverManager.getConnection("jdbc:clickhouse://192.168.60.131:9000");

PreparedStatement pstmt = connection.prepareStatement("insert into test.jdbc_example values(?, ?, ?)");

// insert 10 records
for (int i = 0; i < 10; i++) {
    pstmt.setDate(1, new Date(System.currentTimeMillis()));
    pstmt.setString(2, "panda_" + (i + 1));
    pstmt.setInt(3, 18);
    pstmt.addBatch();
}
pstmt.executeBatch();
```

通过命令行查询，发现新增结果如下：

```sql
ck-master :) select * from jdbc_example;

SELECT *
FROM jdbc_example

┌────────day─┬─name─────┬─age─┐
│ 2019-04-25 │ panda_1  │  18 │
│ 2019-04-25 │ panda_2  │  18 │
│ 2019-04-25 │ panda_3  │  18 │
│ 2019-04-25 │ panda_4  │  18 │
│ 2019-04-25 │ panda_5  │  18 │
│ 2019-04-25 │ panda_6  │  18 │
│ 2019-04-25 │ panda_7  │  18 │
│ 2019-04-25 │ panda_8  │  18 │
│ 2019-04-25 │ panda_9  │  18 │
│ 2019-04-25 │ panda_10 │  18 │
└────────────┴──────────┴─────┘
```

### select query

```java
Class.forName("com.github.housepower.jdbc.ClickHouseDriver");
Connection connection = DriverManager.getConnection("jdbc:clickhouse://192.168.60.131:9000");

Statement statement = connection.createStatement();

String sql = "select * from test.jdbc_example";
ResultSet rs = statement.executeQuery(sql);

while (rs.next()) {
    // ResultSet 的下标值从 1 开始，不可使用 0，否则越界，报 ArrayIndexOutOfBoundsException 异常
    System.out.println(rs.getDate(1) + ", " + rs.getString(2) + ", " + rs.getInt(3));
}
```

运行代码后，控制台输出如下结果：

```纯文本
2019-04-25, panda_1, 18
2019-04-25, panda_2, 18
2019-04-25, panda_3, 18
2019-04-25, panda_4, 18
2019-04-25, panda_5, 18
2019-04-25, panda_6, 18
2019-04-25, panda_7, 18
2019-04-25, panda_8, 18
2019-04-25, panda_9, 18
2019-04-25, panda_10, 18
```

显示结果与我们上面在命令行中查询的结果相同。

### drop table

```java
Class.forName("com.github.housepower.jdbc.ClickHouseDriver");
Connection connection = DriverManager.getConnection("jdbc:clickhouse://192.168.60.131:9000");

Statement statement = connection.createStatement();
statement.executeQuery("drop table test.jdbc_example");
```

再次通过命令行确认：

```sql
ck-master :) show tables;

SHOW TABLES

┌─name─┐
│ hits │
└──────┘
```

发现表 `jdbc_example` 已被删除。

## 解决 Connection refuse 的问题

默认配置下，如果我们连接远程服务器上的 clickhouse，会出现 `Connection refuse` 异常。

一开始以为是防火墙导致的，结果关闭防火墙后发现问题仍未解决，此时就开始怀疑是 ClickHouse 本身的配置问题。

果然，在 ClickHouse 的配置文件 `/etc/clickhouse-server/config.xml` 中发现了这么一段描述：

```xml
<!-- Default values - try listen localhost on ipv4 and ipv6: -->
<!--
<listen_host>::1</listen_host>
<listen_host>127.0.0.1</listen_host>
-->
```

原来，默认情况下，ClickHouse 只监听本地的请求，因此我们进行远程访问时，会抛出 `Connection refuse` 异常。

那么，要如何解决这个问题呢？

在上述描述的前面，我们发现了这么一句话：

```xml
<!-- Listen specified host. use :: (wildcard IPv6 address), if you want to accept connections both with IPv4 and IPv6 from everywhere. -->
<!-- <listen_host>::</listen_host> -->
```

意思就是，如果我们想监听来自任意主机的请求，可以增加如下配置：

```xml
<listen_host>::</listen_host>
```

按照此方法修改保存，并重启 ClickHouse。再次进行远程访问时，发现不会再有 `Connection refuse` 的错误了。

