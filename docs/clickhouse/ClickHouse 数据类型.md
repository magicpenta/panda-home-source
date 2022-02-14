---
sidebar_position: 3
---

# ClickHouse 数据类型

本文整理了 ClickHouse 中的常见数据类型。

若想了解更多，请查阅：[https://clickhouse.tech/docs/en/sql-reference/data-types](https://clickhouse.tech/docs/en/sql-reference/data-types)

若想学习类型转换函数，可查阅：[https://clickhouse.tech/docs/en/sql-reference/functions/type-conversion-functions](https://clickhouse.tech/docs/en/sql-reference/functions/type-conversion-functions)

## Int

Int 型有固定长度，包括有符号 Int 型和无符号 Int 型。

### Int Ranges

|类型|取值范围|别名|
|---|---|---|
|Int8|[-128 : 127]|TINYINT、BOOL、BOOLEAN、INT1|
|Int16|[-32768 : 32767]|SMALLINT、INT2|
|Int32|[-2147483648 : 2147483647]|INT、INT4、INTEGER|
|Int64|[-9223372036854775808 : 9223372036854775807]|BIGINT|

:::info

Int 后的数字，代表着固定的比特（bit）位数，而后续的取值范围，正是由比特位数决定的。Insert 时，数值不可超出 Int 的取值范围，否则数值将被截断。

:::

### UInt Ranges

|类型|取值范围|
|---|---|
|UInt8|[0 : 255]|
|UInt16|[0 : 65535]|
|UInt32|[0 : 4294967295]|
|UInt64|[0 : 18446744073709551615]|

:::info

官方后续又推出了更大取值范围的 Int 型，分别有：Int128、Int256、UInt256，UInt128 则暂未支持。

:::

## Float

浮点型有 Float32 和 Float64 两种，其中：

- Float32 对应 float
- Float64 对应 double

与标准 SQL 相比，ClickHouse 的浮点型还支持 3 种特殊的浮点型，分别是：Inf（正无穷）、-Inf（负无穷）、NaN（非数字）。

:::caution

官方推荐尽可能地使用 Int 型，因为浮点型的计算可能引起四舍五入的误差（由处理器和操作系统决定）。

:::

## Decimal

Decimal 可以精确存储带有小数点的数值。在 ClickHouse 内部，它本质上是一个与自身比特（Bit）数等宽的 Int 型。

### Parameters

Decimal 有两个参数 `P` 和 `S`：

- `P` 即 precision，决定十进制数值的位数（包括小数部分），取值范围为 `[1 : 76]`
- `S` 即 Scale，决定小数部分的小数位数，取值范围为 `[0 : P]`

### Value Ranges

根据 `P` 值的不同，Decimal 可划分为 **Decimal32、Decimal64、Decimal128、Decimal256**，其对照关系如下：

|P 值范围|类型|取值范围|
|---|---|---|
|[1 : 9]|Decimal32(S)|-1 * 10^(9 - S), 1 * 10^(9 - S)|
|[10 : 18]|Decimal64(S)|-1 * 10^(18 - S), 1 * 10^(18 - S)|
|[19 : 38]|Decimal128(S)|-1 * 10^(38 - S), 1 * 10^(38 - S)|
|[39 : 76]|Decimal256(S)|-1 * 10^(76 - S), 1 * 10^(76 - S)|

:::info

例如，Decimal32(4) 可以表示 `[-99999.9999 : 99999.9999]` 的数值。

:::

### Operations

对 Decimal 进行运算将导致更宽的结果，如下所示：

- `Decimal64(S1) <op> Decimal32(S2) -> Decimal64(S)`
- `Decimal128(S1) <op> Decimal32(S2) -> Decimal128(S)`
- `Decimal128(S1) <op> Decimal64(S2) -> Decimal128(S)`
- `Decimal256(S1) <op> Decimal<32|64|128>(S2) -> Decimal256(S)`

其中，对于 `S` 的变换规则如下：

- 加减法：S = max(S1, S2)
- 乘法：S = S1 + S2
- 除法：S = S1

在对 Decimal 进行计算的过程中，可能导致溢出。若发生溢出，小数部分的溢出数字会被丢弃（不是舍入），整数部分的溢出将导致异常，如下所示：

```sql
master :) SELECT toDecimal32(2, 4) AS x, x / 3

┌─x─┬─divide(toDecimal32(2, 4), 3)─┐
│ 2 │                       0.6666 │
└───┴──────────────────────────────┘

1 rows in set. Elapsed: 0.004 sec. 

master :) SELECT toDecimal32(4.2, 8) AS x, x * x

0 rows in set. Elapsed: 0.001 sec. 

Received exception from server (version 21.9.2):
Code: 69. DB::Exception: Received from localhost:9000. DB::Exception: Scale 16 is out of bounds: While processing toDecimal32(4.2, 8) AS x, x * x. (ARGUMENT_OUT_OF_BOUND)
```

## String

String 是一个任意长度的字节集合（包括空字节），它可以代替其他 DBMS 中的 VARCHAR、BLOB 等类型。

除 String 外，ClickHouse 还存在两种特殊的字符串类型，分别为：FixedString 和 UUID。

### FixedString

FixedString 是 **固定字节数为 N** 的特殊字符串，通常用于存储 IP 地址、货币代码、哈希值等固定长度的字符串。

当插入的数据长度正好为 `N` 时，FixedString 是高效的，若不是，会出现以下问题：

- 如果字节数 < `N`，将对字符串末尾进行空字节（`\0`）填充
- 如果字节数 > `N`，将抛出 `String too long for type FixedString(N)` 异常

### UUID

UUID 是由 16 字节的数字组成的通用唯一标识符，其格式如：`61f0c404-5cb3-11e7-907b-a6006ad3dba0`。

UUID 可以通过 `generateUUIDv4()` 生成，如：

```sql
master :) create table uuid_test(id Int16, uuid UUID) engine = Memory;

master :) insert into uuid_test values (1, generateUUIDv4());

master :) select * from uuid_test;

┌─id─┬─uuid─────────────────────────────────┐
│  1 │ 403872c5-d81a-4297-9525-a7fa2c336007 │
└────┴──────────────────────────────────────┘
```

:::caution

如果 insert 时未指定 UUID 的值，默认以 0 填充，即 UUID = `00000000-0000-0000-0000-000000000000`。

:::

## Date

日期类型仅精确到 **年月日**，不支持时区，可细分为 Date 和 Date32，其中：

- Date 以 2 个字节存储
- Date32 以 4 个字节存储

日期类型的使用示例如下：

```sql
master :) create table date_test(id Int16, date Date) engine = Memory;

master :) insert into date_test values (1, 4102444800), (2, '2100-01-01');

master :) select * from date_test;

┌─id─┬───────date─┐
│  1 │ 2100-01-01 │
│  2 │ 2100-01-01 │
└────┴────────────┘
```

## Datetime

日期时间类型有 Datetime 和 Datetime64 两种，以 **时间戳** 的形式存储，可精确到时分秒。

:::info

虽然 Datetime 的底层是以时间戳存储，但我们在进行 select、insert 等操作时，既可以使用时间戳，也可以使用表示日期时间格式的字符串。

:::

### Datetime&Datetime64

Datetime 与 Datetime64的区别在于：

- Datetime 底层为 **UInt32** 类型，Datetime64 底层为 **Int64** 类型
- Datetime 支持的时间戳范围为 `[0 : 4294967295]`，UTC 时间范围为 `[1970-01-01 00:00:00, 2106-02-07 06:28:15]`
- Datetime64 支持的 UTC 时间范围为 `[1925-01-01 00:00:00, 2283-11-11 23:59:59]`
- Datetime 插入时无需考虑精度，Datetime64 插入时需考虑精度

:::caution

Datetime64 对应的时间戳范围为 `[-1420099200 : 9904550399]`。虽然其可以存储超出这个范围的数值，但超出该范围后生成的 Datetime64 对应的日期是不正确的。

:::

为更直观地展示上述精度问题，我们可以做如下试验：

```sql
create table datetime64_test
(
    `id` Int16,
    `local_time` DateTime64(5),
    `russia_time` DateTime64(5, 'Europe/Moscow')
)
engine = Memory;

insert into datetime64_test values(1, 1546300800, 1546300800);
insert into datetime64_test values(2, 1546300800000, 1546300800000);
insert into datetime64_test values(3, 154630080000000, 154630080000000);

select *, toInt64(local_time), toInt64(russia_time) from datetime64_test;

┌─id─┬────────────────local_time─┬───────────────russia_time─┬─toInt64(local_time)─┬─toInt64(russia_time)─┐
│  1 │ 1970-01-01 12:17:43.00800 │ 1970-01-01 07:17:43.00800 │               15463 │                15463 │
└────┴───────────────────────────┴───────────────────────────┴─────────────────────┴──────────────────────┘
┌─id─┬────────────────local_time─┬───────────────russia_time─┬─toInt64(local_time)─┬─toInt64(russia_time)─┐
│  2 │ 1970-06-29 07:16:48.00000 │ 1970-06-29 02:16:48.00000 │            15463008 │             15463008 │
└────┴───────────────────────────┴───────────────────────────┴─────────────────────┴──────────────────────┘
┌─id─┬────────────────local_time─┬───────────────russia_time─┬─toInt64(local_time)─┬─toInt64(russia_time)─┐
│  3 │ 2019-01-01 08:00:00.00000 │ 2019-01-01 03:00:00.00000 │          1546300800 │           1546300800 │
└────┴───────────────────────────┴───────────────────────────┴─────────────────────┴──────────────────────┘
```

### TimeZone

与 Date 相比，Datetime 支持时区的设置，如下所示：

```sql
CREATE TABLE datetime_test
(
    `id` Int16,
    `local_time` DateTime,
    `russia_time` DateTime('Europe/Moscow')
)
ENGINE = Memory;

insert into datetime_test values(1, 1546300800, '2019-01-01 00:00:00');

select *, toUInt32(local_time), toUInt32(russia_time) from datetime_test;

┌─id─┬──────────local_time─┬─────────russia_time─┬─toUInt32(local_time)─┬─toUInt32(russia_time)─┐
│  1 │ 2019-01-01 08:00:00 │ 2019-01-01 05:00:00 │           1546300800 │            1546290000 │
└────┴─────────────────────┴─────────────────────┴──────────────────────┴───────────────────────┘

-- 1546300800 对应的北京时间为 2019-01-01 08:00:00
-- 1546290000 对应的北京时间为 2019-01-01 05:00:00
```

在该示例中，我们可以确认几个点：

- Datetime 尽管是以时间戳格式存储，但其 **附带时区信息**，在查询时会自动根据时区转换为相应的 **日期时间字符串**
- 以时间戳形式插入时，Datetime 保存的值是时间戳本身
- 以日期时间字符串插入时，Datetime 保存的值是 **增减时区后** 对应的时间戳

:::caution

Datetime 时区信息并不会保存在表里，而是保存在字段的元数据中。

:::

## Boolean

ClickHouse 没有专门的 Boolean 类型，可以使用 `0` 、`1` 代替。

## Nullable

默认情况下，数据类型是不允许为 `NULL` 的，如 Int 在插入 `NULL` 时以 `0` 存储，String 在同样的情况下会以空字符串进行存储。

若想允许在字段中存储 `NULL`，可以使用 `Nullable(typename)`，如下所示：

```sql
create table null_test
(
    `x` Int16,
    `y` Nullable(Int16),
    `a` String,
    `b` Nullable(String)
)
engine = Log
```

:::caution

Nullable 修饰的字段不可作为索引列，且 Nullable 对性能会产生负面影响。

:::

## Array

ClickHouse 支持数组类型 Array(T)，其中，T 可以是任意数据类型，包括 Array 本身。

以下为 Array 的使用示例：

```sql
create table array_test
(
    `arr` Array(Int16)
)
engine = Memory;

insert into array_test values(array(1, 2, 3));

select * from array_test;

┌─arr─────┐
│ [1,2,3] │
└─────────┘
```

## Tuple

元组是一系列元素的集合，组中的元素可以拥有各自的数据类型，其使用示例如下：

```sql
create table tuple_test
(
    `t` Tuple(id Int16, name String)
)
engine = Memory;

insert into tuple_test values ((1, 'panda')), ((2, 'sue'));

select * from tuple_test;

┌─t───────────┐
│ (1,'panda') │
│ (2,'sue')   │
└─────────────┘
```

元组中的元素支持直接查询,，例如：

```sql
select t.id, t.name from tuple_test;

┌─t.id─┬─t.name─┐
│    1 │ panda  │
│    2 │ sue    │
└──────┴────────┘
```




