---
sidebar_position: 5
---

# ClickHouse SQL

:::info

ClickHouse 的 SQL 语法与常见数据库大同小异。本文记录 ClickHouse 中一些比较基础、比较常见的 SQL 示例，更多 SQL 语法可参考官方文档：[https://clickhouse.com/docs/en/sql-reference/statements/select](https://clickhouse.com/docs/en/sql-reference/statements/select/)。

:::

## CREATE

`CREATE` 语句可以用于创建库、表、视图等。

创建库：

```sql
CREATE DATABASE [IF NOT EXISTS] db_name [ON CLUSTER cluster] [ENGINE = engine(...)]
```

创建表：

```sql
CREATE TABLE [IF NOT EXISTS] [db.]table_name [ON CLUSTER cluster]
(
    name1 [type1] [NULL|NOT NULL] [DEFAULT|MATERIALIZED|ALIAS expr1] [compression_codec] [TTL expr1],
    name2 [type2] [NULL|NOT NULL] [DEFAULT|MATERIALIZED|ALIAS expr2] [compression_codec] [TTL expr2],
    ...
) ENGINE = engine
```

创建视图：

```SQL
CREATE [OR REPLACE] VIEW [IF NOT EXISTS] [db.]table_name [ON CLUSTER] AS SELECT ...
```

创建用户 `panda`：

```sql
CREATE USER panda HOST IP '127.0.0.1' IDENTIFIED WITH sha256_password BY 'panda';
```

## SELECT

`SELECT` 语句支持 `GROUP BY`、`ORDER BY`、`HAVING`、`LIMIT` 等子句，其示例如下：

```sql
[WITH expr_list|(subquery)]
SELECT [DISTINCT [ON (column1, column2, ...)]] expr_list
[FROM [db.]table | (subquery) | table_function] [FINAL]
[SAMPLE sample_coeff]
[ARRAY JOIN ...]
[GLOBAL] [ANY|ALL|ASOF] [INNER|LEFT|RIGHT|FULL|CROSS] [OUTER|SEMI|ANTI] JOIN (subquery)|table (ON <expr_list>)|(USING <column_list>)
[PREWHERE expr]
[WHERE expr]
[GROUP BY expr_list] [WITH ROLLUP|WITH CUBE] [WITH TOTALS]
[HAVING expr]
[ORDER BY expr_list] [WITH FILL] [FROM expr] [TO expr] [STEP expr]
[LIMIT [offset_value, ]n BY columns]
[LIMIT [n, ]m] [WITH TIES]
[SETTINGS ...]
[UNION  ...]
[INTO OUTFILE filename]
[FORMAT format]
```

## INSERT

`INSERT` 语句用于数据插入：

```sql
INSERT INTO [db.]table [(c1, c2, c3)] VALUES (v11, v12, v13), (v21, v22, v23), ...
```

也可以插入其他表的数据：

```sql
INSERT INTO [db.]table [(c1, c2, c3)] SELECT ...
```

## ALTER

`ALTER` 语句可以用于表结构修改、行数据更新、行数据删除等。

:::caution

大部分的 `ALTER` 语句仅在 MergeTree 系列引擎中得到支持。 

:::

更新行数据：

```sql
ALTER TABLE [db.]table UPDATE column1 = expr1 [, ...] WHERE filter_expr
```

删除行数据：

```sql
ALTER TABLE [db.]table [ON CLUSTER cluster] DELETE WHERE filter_expr
```

## DROP

`DROP` 语句可以用于删除库、表、视图等。

删除库：

```sql
DROP DATABASE [IF EXISTS] db [ON CLUSTER cluster]
```

删除表：

```sql
DROP [TEMPORARY] TABLE [IF EXISTS] [db.]name [ON CLUSTER cluster]
```

删除视图：

```sql
DROP VIEW [IF EXISTS] [db.]name [ON CLUSTER cluster]
```

删除用户：

```sql
DROP USER [IF EXISTS] name [,...] [ON CLUSTER cluster_name]
```

## TRUNCATE

`TRUNCATE` 语句可以删除目标表的所有数据：

```sql
TRUNCATE TABLE [IF EXISTS] [db.]name [ON CLUSTER cluster]
```




