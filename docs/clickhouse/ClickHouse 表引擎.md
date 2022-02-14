---
sidebar_position: 4
---

# ClickHouse 表引擎

ClickHouse 的表引擎与以下几点息息相关：

- 数据存储位置
- 支持的查询类型
- 并发数据访问与并发请求
- 索引的使用
- 数据副本

本文主要介绍表引擎中的** Log 系列引擎** 以及 **MergeTree 系列引擎**。

## Log Family

Log 系列引擎一般用于小数据量（小于百万级）的场景。这个系列的引擎可进一步细分为：**TinyLog**、**StripeLog** 和 **Log**。

:::info

Log 系列引擎可以将数据存储到如 HDFS、S3 等分布式文件存储系统。

:::

### TinyLog

TinyLog 是该系列 **最简单的引擎**，同时也是该系列功能最少、性能最差的引擎。

在 TinyLog 中，每个列的数据单独存储在一个文件夹里。假设引擎类型为 TinyLog 的表有 `id`、`name` 两个字段，则其数据存储文件如下所示：

- `id.bin`：存放 `id` 列的数据
- `name.bin`：存放 `name` 列的数据

### StripeLog

StripeLog 也是适用于小数据量的场景，它的数据存储文件如下所示：

- `data.bin`：数据存放文件，所有列数据存储在同个文件中
- `index.mrk`：标记文件，包含已插入数据块中每列的偏移量

:::caution

通过标记文件，StripeLog 查询时可以跳过指定行数，从标记的偏移量开始读取数据。这使得 StripeLog 支持并发读取，但同时也意味着 `SELECT` 响应结果的顺序是不可预测的。

:::

### Log

Log 的数据存储文件如下所示：

- `id.bin`：存放 `id` 列的数据
- `name.bin`：存放 `name` 列的数据
- `__marks.mrk`：标记文件

为更清晰地展示 Log 系列引擎的异同点，我们总结了如下特性表：

|特性|TinyLog|StripeLog|Log|
|---|---|---|---|
|基于磁盘存储|✅|✅|✅|
|支持列数据单独存储|✅|❌|✅|
|基于追加的方式实现新增|✅|✅|✅|
|包含标记文件|❌|✅|✅|
|支持并发读取|❌|✅|✅|
|支持并发锁|❌|✅|✅|
|支持索引|❌|❌|❌|
|支持更新|❌|❌|❌|
|支持原子写入|❌|❌|❌|

:::info

可见，Log 更像是 TinyLog 与 StripeLog 的结合体。

:::

## MergeTree Family

MergeTree 系列引擎是 ClickHouse 数据存储的核心部分。它提供了丰富的特性（如自定义分区、主键、二级索引等），在性能和容错方面有着非常优异的表现，**适用于数据量极大的表**。

当然，超强的性能也意味着较大的资源开销。因此，在少量大表的场景下，推荐使用 MergeTree 系列引擎；在大量小表的场景下，推荐使用 Log 系列引擎。

### MergeTree

MergeTree 是 MergeTree 系列中的基本引擎，包含了该系列引擎的大部分功能，主要有：

- 基于主键排序存储
- 支持分区键
- 支持数据采样

MergeTree 的创表语句示例如下：

```sql
CREATE TABLE [IF NOT EXISTS] [db.]table_name [ON CLUSTER cluster]
(
    name1 [type1] [DEFAULT|MATERIALIZED|ALIAS expr1] [TTL expr1],
    name2 [type2] [DEFAULT|MATERIALIZED|ALIAS expr2] [TTL expr2],
    ...
    INDEX index_name1 expr1 TYPE type1(...) GRANULARITY value1,
    INDEX index_name2 expr2 TYPE type2(...) GRANULARITY value2,
    ...
    PROJECTION projection_name_1 (SELECT <COLUMN LIST EXPR> [GROUP BY] [ORDER BY]),
    PROJECTION projection_name_2 (SELECT <COLUMN LIST EXPR> [GROUP BY] [ORDER BY])
) ENGINE = MergeTree()
ORDER BY expr
[PARTITION BY expr]
[PRIMARY KEY expr]
[SAMPLE BY expr]
[TTL expr
    [DELETE|TO DISK 'xxx'|TO VOLUME 'xxx' [, ...] ]
    [WHERE conditions]
    [GROUP BY key_expr [SET v1 = aggr_func(v1) [, v2 = aggr_func(v2) ...]] ] ]
[SETTINGS name=value, ...]
```

各子句的含义请见下表：

|字句|是否必填|字句含义|
|---|---|---|
|ORDER BY|✅|指定排序键（由字段元组组成，如 `(id, name)`），可用 `ORDER BY tuple()` 禁用排序|
|PARTITION BY|❌|指定分区键，可用 `toYYYYMM(date_column)` 实现按月份分区|
|PRIMARY KEY|❌|指定主键，若为空，则默认使用分区键作为主键|
|SAMPLE BY|❌|指定采样表达式，必须包含在主键中|
|TTL|❌|指定行存储的持续时间并定义数据片段在硬盘和卷上的移动逻辑（删除或移动）|
|SETTINGS|❌|指定 MergeTree 的其他配置参数|

:::info

SETTINGS 中包含很多用于控制 MergeTree 行为的参数，如索引粒度、存储策略、合并操作、数据压缩等。

:::

### ReplacingMergeTree

ReplacingMergeTree 与 MergeTree 的主要区别在于它可以删除 **排序键值相同** 的重复项。

这个去重的操作会在数据合并期运行，但由于数据合并是由后台线程异步处理的，具体的去重时机无法预估。因此，ReplacingMergeTree 只能保证最终结果是去重的，无法保证查询过程中排序键不重复。

:::info

当然，用户可以通过 `OPTIMIZE` 语句主动触发合并，但 `OPTIMIZE` 会引发大量读写，并不推荐使用。

:::

ReplacingMergeTree 的创表语句示例如下：

```sql
CREATE TABLE [IF NOT EXISTS] [db.]table_name [ON CLUSTER cluster]
(
    name1 [type1] [DEFAULT|MATERIALIZED|ALIAS expr1],
    name2 [type2] [DEFAULT|MATERIALIZED|ALIAS expr2],
    ...
) ENGINE = ReplacingMergeTree([ver])
[PARTITION BY expr]
[ORDER BY expr]
[SAMPLE BY expr]
[SETTINGS name=value, ...]

```

其子句部分与 MergeTree 相同，但入参部分有所区别。

ReplacingMergeTree 的入参表示版本号，类型为 `UInt*`、`Date` 或 `DateTime`，它决定了数据去重时的保留对象：

- 若版本号 `ver` 未指定，默认保留最后一条数据
- 若版本号 `ver` 已指定，则保留 ver 值最大的数据

### SummingMergeTree

SummingMergeTree 继承自 MergeTree，主要区别在于：当合并 SummingMergeTree 的数据片段时，ClickHouse 会把多个具有 **相同排序键** 的行记录 **合并成一行**，且该行数值型列的值为合并前 **同一列的 ****`sum`**** 值**。

SummingMergeTree 的创表语句示例如下：

```sql
CREATE TABLE [IF NOT EXISTS] [db.]table_name [ON CLUSTER cluster]
(
    name1 [type1] [DEFAULT|MATERIALIZED|ALIAS expr1],
    name2 [type2] [DEFAULT|MATERIALIZED|ALIAS expr2],
    ...
) ENGINE = SummingMergeTree([columns])
[PARTITION BY expr]
[ORDER BY expr]
[SAMPLE BY expr]
[SETTINGS name=value, ...]
```

其子句部分也与 MergeTree 相同，但入参部分有所区别。

SummingMergeTree 的入参为数组 `[columns]`，该数组指定的列将在合并时进行汇总，其取值注意事项如下：

- 指定列的数据类型必须为数值型
- 指定列不可存在与排序键中
- 若该参数为空，默认汇总所有数据类型为数值型的列（排序键包含的列除外）

此外，SummingMergeTree 对汇总列具有以下规定：

- 若某一行用于汇总的所有列中的值为 0，则汇总后该行删除
- 若列无法被汇总（且不被排序键包含），则汇总时从现有的值中任选一个

### AggregatingMergeTree

AggregatingMergeTree 是 SummingMergeTree 的升级版，它们的区别在于：SummingMergeTree 只能对非排序键列进行 `sum` 聚合，而 **AggregatingMergeTree 可以指定各种聚合函数**，灵活性更高。

AggregatingMergeTree 的创表语句示例如下：

```sql
CREATE TABLE [IF NOT EXISTS] [db.]table_name [ON CLUSTER cluster]
(
    name1 [type1] [DEFAULT|MATERIALIZED|ALIAS expr1],
    name2 [type2] [DEFAULT|MATERIALIZED|ALIAS expr2],
    ...
) ENGINE = AggregatingMergeTree()
[PARTITION BY expr]
[ORDER BY expr]
[SAMPLE BY expr]
[TTL expr]
[SETTINGS name=value, ...]
```

与 SummingMergeTree 不同，AggregatingMergeTree 并没有入参，但这并不意味着 AggregatingMergeTree 更易于使用，相反地，它的使用方式比较复杂。

假设我们创建了基于 AggregatingMergeTree 的明细表：

```sql
CREATE TABLE agg_table
(
    `user_id` UInt8,
    `start_date` Date,
    `count` AggregateFunction(sum, Int8)
)
ENGINE = AggregatingMergeTree
PARTITION BY toYYYYMM(start_date)
ORDER BY user_id
```

:::caution

AggregateFunction 是特殊的数据类型，能够以二进制的形式存储中间状态结果，但是它的写入与查询需要调用聚合函数。

:::

新增数据时，需要使用带有 `-State-` 的聚合函数：

```sql
INSERT INTO agg_table SELECT
    '1',
    '2021-01-01',
    sumState(toInt8(1))
```

查询数据时，需要使用带有 `-Merge-` 的聚合函数，同时要加上 `GROUP BY` 子句：

```sql
SELECT
    user_id,
    start_date,
    sumMerge(count)
FROM agg_table
GROUP BY
    user_id,
    start_date
```

可见，AggregatingMergeTree 的使用方式非常繁琐。因此，通常情况下我们不直接以 AggregatingMergeTree 为引擎创建表，而是通过 **在基础表上创建物理视图** 来使用它。

还是以上述字段为例，这个流程大概是：

**STEP 01：**创建基础表

```sql
CREATE TABLE base_table
(
    `user_id` UInt8,
    `start_date` Date,
    `count` Int8
)
ENGINE = MergeTree
ORDER BY user_id
```

**STEP 02：**创建物理视图

```sql
CREATE MATERIALIZED VIEW agg_view
ENGINE = AggregatingMergeTree
PARTITION BY toYYYYMM(start_date)
ORDER BY user_id AS
SELECT
    user_id,
    start_date,
    sumState(count) AS counts
FROM base_table
GROUP BY
    user_id,
    start_date
```

**STEP 03：**插入数据到基础表

```sql
INSERT INTO base_table VALUES(1, '2021-01-01', 1);
```

**STEP 04：**从视图中查询数据

```sql
SELECT
    user_id,
    start_date,
    sumMerge(counts)
FROM agg_view
GROUP BY
    user_id,
    start_date
```

:::info

尽管增加了视图创建的步骤，但是新增数据时不再需要聚合函数，可以使数据插入变得更加简单。

:::

### CollapsingMergeTree

CollapsingMergeTree 是一种基于 **以增代删** 思想实现行级数据修改和删除的引擎。

它会通过标记字段 `sign` 来标记数据的状态：

- 若 `sign` 为 `-1`，表示当前行数据需要删除
- 若 `sign` 为 `1`，表示当前行数据是有效数据

当数据合并时，**同一分区** 内 `sign` 标记为 `-1` 和 `1` 的一组数据会折叠删除。

:::info

在快速写入数据的场景下，数据的修改和删除往往是不可接受的，因为它需要耗费大量的资源以重写存储中的数据。CollapsingMergeTree 以增代删的机制，可以在支持数据修改与删除的前提下，尽可能地提高性能。

:::

CollapsingMergeTree 的创表语句示例如下：

```sql
CREATE TABLE [IF NOT EXISTS] [db.]table_name [ON CLUSTER cluster]
(
    name1 [type1] [DEFAULT|MATERIALIZED|ALIAS expr1],
    name2 [type2] [DEFAULT|MATERIALIZED|ALIAS expr2],
    ...
) ENGINE = CollapsingMergeTree(sign)
[PARTITION BY expr]
[ORDER BY expr]
[SAMPLE BY expr]
[SETTINGS name=value, ...]
```

我们通过一个例子 ，来展示 CollapsingMergeTree 折叠删除的过程：

**STEP 01：**创建表

```sql
CREATE TABLE collapse_table
(
    `user_id` UInt8,
    `name` String,
    `age` UInt8,
    `sign` Int8
)
ENGINE = CollapsingMergeTree(sign)
PARTITION BY name
ORDER BY user_id
```

**STEP 02：**插入 `sign` 为 `1` 的旧数据

```sql
INSERT INTO collapse_table VALUES(1, 'panda', 18, 1);
```

**STEP 03：**插入 `sign` 为 `-1` 的旧数据，标记删除状态

```sql
INSERT INTO collapse_table VALUES(1, 'panda', 18, -1);
```

**STEP 04：**插入新数据

```sql
INSERT INTO collapse_table VALUES(1, 'panda', 28, 1);
```

**STEP 05：**触发合并，查看结果

```sql
OPTIMIZE TABLE collapse_table;
SELECT * FROM collapse_table;

```

可见，CollapsingMergeTree 以增代删的机制是生效的。但是，我们注意到，该机制实时生效的前提是手动触发合并（这会导致大量资源的耗费），若没有手动触发，则需要等待后台合并线程完成合并，这意味着 **修改和删除无法实时可见**。

那么，有没有什么办法，可以在不影响性能的同时，又保证数据变更的实时可见？我们可以通过聚合函数来解决这个问题：

```sql
SELECT
    user_id,
    name,
    sum(age * sign)
FROM collapse_table
GROUP BY
    user_id,
    name
HAVING sum(sign) > 0
```

:::caution

CollapsingMergeTree 对写入数据的顺序有着严格的要求，若数据以乱序写入（如 `sign` 为 `-1` 的旧数据先写入），将导致折叠失败。这使得 CollapsingMergeTree 的工作机制在并发写入的场景下可能会出现问题。

:::

### VersionedCollapsingMergeTree

VersionedCollapsingMergeTree 的工作目标与 CollapsingMergeTree 是一致的，主要区别在于：前者在标记位 `sign` 的基础上引入了版本号 `version`，以支持多线程下的乱序写入。

VersionedCollapsingMergeTree 的创表语句示例如下：

```sql
CREATE TABLE [IF NOT EXISTS] [db.]table_name [ON CLUSTER cluster]
(
    name1 [type1] [DEFAULT|MATERIALIZED|ALIAS expr1],
    name2 [type2] [DEFAULT|MATERIALIZED|ALIAS expr2],
    ...
) ENGINE = VersionedCollapsingMergeTree(sign, version)
[PARTITION BY expr]
[ORDER BY expr]
[SAMPLE BY expr]
[SETTINGS name=value, ...]
```

其中，`sign` 的定义与 CollapsingMergeTree 相同，`version` 表示状态版本号，类型为 `UInt*`。

同样地，我们通过一个例子 ，来展示 VersionedCollapsingMergeTree 折叠删除的过程：

**STEP 01：**创建表

```sql
CREATE TABLE version_table
(
    `user_id` UInt8,
    `name` String,
    `age` UInt8,
    `sign` Int8,
    `version` UInt8
)
ENGINE = VersionedCollapsingMergeTree(sign, version)
PARTITION BY name
ORDER BY user_id
```

**STEP 02：**乱序插入数据（`sign` 为 `-1` 的数据先插入）

```sql
INSERT INTO version_table VALUES(1, 'panda', 18, -1, 1);
INSERT INTO version_table VALUES(1, 'panda', 18, 1, 1);
INSERT INTO version_table VALUES(1, 'panda', 28, 1, 2);

```

**STEP 03：**触发合并，查看结果

```sql
OPTIMIZE TABLE version_table;
SELECT * FROM version_table;

```

:::info

尽管 VersionedCollapsingMergeTree 解决了乱序合并的问题，但需要业务层维护好 version 的变更。

:::



