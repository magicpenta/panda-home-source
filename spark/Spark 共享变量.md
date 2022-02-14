---
sidebar_position: 5
---

# Spark 共享变量

大多数 Spark 初学者可能都遇到过这个问题：在算子中对算子外的变量进行计算，然而最终的计算结果不符合预期。

举个例子，假设当前有一个数字集合，我们想对该集合进行求和计算，那么根据第一直觉我们可能编写出如下代码：

```scala
val rdd: RDD[Int] = sc.makeRDD(List(1, 2, 3, 4))

var sum: Int = 0
rdd.foreach(num => {
  sum += num
})

println("sum => " + sum)

```


然而，使用这段代码进行求和计算，`sum` 的最终结果为 `0`，并非是 RDD 中各数值的总和。对于初学者来说，对这个结果可能感到难以接受。实际上，只要了解了 Driver 与 Executor 所扮演的角色，以及计算任务在这两者间的流转过程，自然能明白这个结果产生的原因。

示例中 `sum += num` 是分发到 Executor 端计算的。在各节点的 Executor 开始计算前，会拷贝一份 `sum` 到其本地，然后执行 `sum += num`。但是，在最终 Executor 返回计算结果给 Driver 时，并不会将 `sum` 这种非 RDD 内部数据的普通变量一并返回，因此我们在 Driver 中所看到的 `sum` 变量实际上并没有参与计算，依旧是初始值 `0`。

上述的现象会导致一个问题，在 Spark 应用中想要实现跨任务的数据读写都将面临困难。为了解决这个问题，Spark 在 RDD 之外又引入了两种数据结构，作为共享变量的实现，它们分别是累加器与广播变量。

## 累加器

累加器（Accumulators）是一个支持在分布式计算中实现聚合的变量。

### 实现原理



### 使用示例

还记得本文一开始的求和计算吗？现在，使用累加器，我们可以轻松地实现它：

```scala
    val rdd: RDD[Int] = sc.makeRDD(List(1, 2, 3, 4))
    
    val sumAccumulator: LongAccumulator = sc.longAccumulator("sum")
    rdd.foreach(num => {
      sumAccumulator.add(num)
    })

    println("sum => " + sumAccumulator.value)
```


执行完这段代码后返回的 `sum` 值为 `10`，正是我们想要的结果。

初始化累加器时，可以选择为其命名，也可以选择留空，但是为了可以在 Web UI 中快速识别累加器，建议还是使用命名的方式初始化累加器。

累加器一般都在行动算子里面计算。如果我们是在转换算子中（如 `map`、`flatMap` 等）使用它，那么一定要记得触发行动算子，否则累加器无法执行计算。

### 自定义累加器

## 广播变量

广播变量（Broadcast Variables）

### 实现原理

### 使用示例

