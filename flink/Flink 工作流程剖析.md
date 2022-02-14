---
sidebar_position: 2
---

# Flink 工作流程剖析

## Anatomy of a Flink Cluster

Flink 运行时由两种类型的进程组成：一个 JobManager 和一个或者多个 TaskManager。

![](image/processes.svg)

如图所示，一个 Flink 应用程序从提交到完成的流程大致上可以表述为：

1. Client 提取应用程序中的 JobGraph，下载依赖包，并将它们发送给 JobManager
2. JobManager 接收到 JobGraph 后，会将其转换为 ExecutionGraph，然后向集群申请资源并将 ExecutionGraph 分发给对应的 TaskManager
3. TaskManager 接收到 ExecutionGraph 后，会将作业流进行拆分并交由 Task Slot 处理
4. Task Slot 完成计算后，由 Sink 任务实现结果的输出

:::info

步骤 1 的执行位置与部署模式有关，若集群部署模式为 Application Mode，那么步骤 1 的大部分工作会交由 JobManager 完成，这样可以有效降低 Client 的负载。

:::

## Flink Component

上节我们简单地介绍了 Flink 作业的工作流程，本节将对该流程中的核心组件作简要介绍。

### JobManager

Flink 的架构采用的也是常见的 Master - Slave 架构。

在 Flink 中，JobManager 的地位即为 Master，与 HDFS 中的 NameNode、HBase 中的 Master 等处于同一级别。它负责分布式环境下 Flink 作业的协调与执行，例如：决定何时调度下一个 task（或一组 task）、对完成的 task 或执行失败做出反应、协调 checkpoint 并且协调从失败中恢复等等。<br />

Job Manager 由三个不同的组件组成：ResourceManager、Dispatcher、JobMaster。

#### ResourceManager

ResourceManager 负责 Flink 集群中的资源提供、回收与分配。

它是 Task Slot （Flink 集群中资源调度的单位，位于 TaskManager 中）的管理者。当 ResourceManager 接收来自 JobManager 的资源请求时，会将存在空闲 slot 的 TaskManager 分配给 JobManager 执行任务。

:::info

Flink 为不同的环境和资源提供者（例如 YARN、Mesos、Kubernetes 和 standalone 部署）实现了对应的 ResourceManager。

:::

#### Dispatcher

Dispatcher 提供了一个 REST 接口，用来提交 Flink 应用程序，并为每个提交的作业启动一个新的 JobMaster。此外，它还会启动 Flink Web UI 用来显示作业执行信息。

#### JobMaster

JobMaster 负责管理单个 JobGraph 的执行。Flink 集群中可以同时运行多个作业，每个作业都有自己的 JobMaster。

### TaskManager

**TaskManager（也称为 worker）负责实际子任务（Subtask）的执行**，并且缓存和交换数据流。

每个 TaskManager 都拥有一定数量的 Task Slot，其数量也代表着 TaskManager 的并发能力。当 TaskManager 启动后，会将其所拥有的 Task Slot 注册到 ResourceManager 上，由 ResourceManager 进行统一管理。

:::info

Task Slot 是一组固定大小的资源的合集，下文会详细介绍。

:::

## Task & Subtask

在 TaskManager 中我们提到，TaskManager 实际执行的是 Subtask 而不是 Task。本节将对两者进行比较说明，以更好地理解 TaskManager 执行任务的本质。

在执行分布式计算时，Flink 将可以算子（operator）链接到一起，这样的一个算子链被称作一个 Task。之所以这样做， 是为了减少线程间切换和缓冲而导致的开销，在降低延迟的同时可以提高整体的吞吐量。 

:::info

不是所有的算子都可以被链接，例如 keyBy 等操作会导致网络 shuffle 和重分区，因此其就不能被链接，只能被算作单独的 Task。

:::

简单来说，**一个 Task 就是一个可以链接的最小的算子链 (Operator Chains) 。**但需要注意的是，Task 更像是一个概念性的任务，并不是真实存在的任务。

如下图，假设我们的作业有 source、map、keyBy、sink 等算子，那么在概念上，我们可以将其切分成 3 个算子链（即 3 个 Task）。但这是概念上的，在实际流程中，我们的算子链会根据并行度形成一个或多个的 Subtask（`A subtask is one parallel slice of a task`）。

![](image/tasks_chains.svg)

为方便我们更好地理解 Task 和 Subtask 的区别，官方文档中的示例图特意将图例中的并行度设置为 2。很显然，在并行度为 2 的情况下，我们的作业被拆分成了 2 个 source&map 子任务、2 个 keyBy 子任务、1 个 sink 子任务，总计有 5 个 Subtask。这 5 个 Subtask，是实际提交给 Task Slots 执行计算的任务，所以我们说 Task 是概念上的任务而 Subtask 是实际存在的任务。<br />

综上，**一个 Subtask 就是一个实际提交给 Task Slots 的可以链接的最小的算子链 (Operator Chains)**，且每个 SubTask 都是一个单独的线程。

## Task Slot

顾名思义，我们可以将 Task Slot 理解为 TaskManager 中用于执行 Subtask 的槽位，每个 TaskManager 可以拥有 1 个以上的 Task Slot。

### Why Use It

那么，这种设计有什么优势呢？

**第一点，是资源隔离。**

Task Slot 是 TaskManager 中资源的固定子集。例如，具有 3 个 slot 的 TaskManager，会将其托管内存的 1/3 用于每个 slot，这意味着分配在某个 slot 上的 Subtask 不会与其他槽位的 Subtask 竞争托管内存。

:::info

需要注意的是，此处没有 CPU 隔离，Task Slot 仅分离 TaskManager 的托管内存。

:::

**第二点，是减少开销。**

假设一个 TaskManager 开启了多个 Task Slot，那么就意味着有多个 Subtask 共享同一个 JVM 进程。在这个进程中，所有的 Subtask 共享 TCP 连接（通过多路复用）和心跳信息，此外还可以共享数据集和数据结构，从而减少了每个 Subtask 的开销。

现在，我们结合官网的示例图，来看看 SubTask 和 Task Slot 具体的关系究竟是怎样的。

![](image/tasks_slots.svg)

假设现在有 2 个 TaskManager，且每个 TaskManager 有 3 个 Task Slot，那么我们在 Task&Subtask 部分中拆分出的 5 个 Subtask 将分布在不同的 5 个 Task Slot 中。

### Slot Share

在上述示例图中，我们发现有个 Task Slot 处于空闲状态，这显然是一种资源浪费。假如每个 Task Slot 只能执行一个 Subtask，那么为了使这个空闲的 Slot 得以利用，我们在进行 Flink 应用程序开发时就不得不分析并行度与集群 Task Slot 的关系，这显然会急剧增加开发的复杂度和不确定性。

因此，默认情况下 Flink 支持了槽位共享，即允许 Subtask 共享 Task Slot，即便它们是不同 Task 的 Subtask，只要是来自于 **同一应用程序** 即可。

有了槽位共享的支撑，我们将示例程序的并行度设置为 6，看看 Subtask 在 Task Slot 中的分布是怎样的。

![](image/slot_sharing.svg)

很显然，槽位共享确实带来了优势。

**优势一：获得更好的资源利用和资源分配。**

一方面，TaskManager 得到了尽可能的利用；另一方面，避免非密集 Subtask（如 source&map）占用和密集型 Subtask（如 window） 一样多的资源。

**优势二：降低并行度设置的复杂度。**

Flink 应用程序中的最大并行度和 Flink 集群的 Task Slot 数量恰好一样，无需开发人员去计算程序总共包含多少个 Subtask。

:::caution

并行度尽量不要大于 Task Slot 数量，否则容易导致集群没有足够的可分配资源。

:::

最后，我们总结一下 TaskManager、Task Slot、Subtask 等概念的对照关系，来加深我们对这些概念的理解：

- 1 个 TaskManager 可以包含 N（N > 1） 个 Task Slot
- 1 个 Task Slot 可以包含 N（N > 1） 个 Subtask
- 1 个 Subtask 对应 1 个线程
