# Features

Public package and module surface area to be aware of when researching or implementing a solution. Each module entry includes its vendored repo path so it can be located quickly.

## `effect` Package

Package path: `packages/effect`

- `Array` - `packages/effect/src/Array.ts` - Immutable array utilities. Use: transform arrays immutably.
- `BigDecimal` - `packages/effect/src/BigDecimal.ts` - Arbitrary-precision decimal arithmetic. Use: avoid floating-point errors.
- `BigInt` - `packages/effect/src/BigInt.ts` - `bigint` utilities and instances. Use: work with large integers.
- `Boolean` - `packages/effect/src/Boolean.ts` - Boolean utilities and instances. Use: compose boolean logic.
- `Brand` - `packages/effect/src/Brand.ts` - Branded type helpers. Use: prevent accidental type mixing.
- `Cache` - `packages/effect/src/Cache.ts` - Effect cache utilities. Use: memoize effectful lookups.
- `Cause` - `packages/effect/src/Cause.ts` - Structured effect failure representation. Use: inspect failures and defects.
- `Channel` - `packages/effect/src/Channel.ts` - Bidirectional streaming I/O abstraction. Use: build stream pipelines.
- `ChannelSchema` - `packages/effect/src/ChannelSchema.ts` - Schema helpers for channels. Use: type channel protocols.
- `Chunk` - `packages/effect/src/Chunk.ts` - Immutable high-performance sequence. Use: efficient functional sequences.
- `Clock` - `packages/effect/src/Clock.ts` - Time service and sleep utilities. Use: schedule and measure time.
- `Combiner` - `packages/effect/src/Combiner.ts` - Combine two values of one type. Use: merge values consistently.
- `Config` - `packages/effect/src/Config.ts` - Schema-driven configuration loading. Use: read typed app config.
- `ConfigProvider` - `packages/effect/src/ConfigProvider.ts` - Configuration data source abstraction. Use: load config from env/files.
- `Console` - `packages/effect/src/Console.ts` - Effectful console operations. Use: log and debug safely.
- `Context` - `packages/effect/src/Context.ts` - Dependency injection context table. Use: provide and access services.
- `Cron` - `packages/effect/src/Cron.ts` - Cron scheduling utilities. Use: express recurring schedules.
- `Data` - `packages/effect/src/Data.ts` - Immutable data and tagged unions. Use: model domain data and errors.
- `DateTime` - `packages/effect/src/DateTime.ts` - Date-time utilities. Use: handle timestamps and calendars.
- `Deferred` - `packages/effect/src/Deferred.ts` - Single-assignment async variable. Use: coordinate concurrent fibers.
- `Differ` - `packages/effect/src/Differ.ts` - Value diffing utilities. Use: compute incremental updates.
- `Duration` - `packages/effect/src/Duration.ts` - Precise time span type. Use: represent delays and intervals.
- `Effect` - `packages/effect/src/Effect.ts` - Core effect type and operators. Use: model async and concurrent work.
- `Effectable` - `packages/effect/src/Effectable.ts` - Protocols for effect-like values. Use: integrate custom yieldables.
- `Encoding` - `packages/effect/src/Encoding.ts` - Base64, Base64Url, and Hex codecs. Use: encode binary/text values.
- `Equal` - `packages/effect/src/Equal.ts` - Structural and custom equality. Use: compare immutable values deeply.
- `Equivalence` - `packages/effect/src/Equivalence.ts` - Equivalence relation helpers. Use: dedupe or compare with custom rules.
- `ErrorReporter` - `packages/effect/src/ErrorReporter.ts` - Pluggable error reporting. Use: forward failures to observability tools.
- `ExecutionPlan` - `packages/effect/src/ExecutionPlan.ts` - Execution plan utilities. Use: inspect planned work.
- `Exit` - `packages/effect/src/Exit.ts` - Synchronous effect outcome value. Use: inspect success or failure.
- `Fiber` - `packages/effect/src/Fiber.ts` - Lightweight concurrency primitive. Use: fork and join work.
- `FiberHandle` - `packages/effect/src/FiberHandle.ts` - Managed fiber handle helpers. Use: control child fibers.
- `FiberMap` - `packages/effect/src/FiberMap.ts` - Fiber map utilities. Use: track fibers by key.
- `FiberSet` - `packages/effect/src/FiberSet.ts` - Fiber set utilities. Use: manage groups of fibers.
- `FileSystem` - `packages/effect/src/FileSystem.ts` - Effectful file system abstraction. Use: read and write files safely.
- `Filter` - `packages/effect/src/Filter.ts` - Filter result utilities. Use: compose filtering operations.
- `Formatter` - `packages/effect/src/Formatter.ts` - Human-readable value formatting. Use: pretty-print data for logs.
- `Function` - `packages/effect/src/Function.ts` - Core function helpers. Use: pipe and compose functions.
- `Graph` - `packages/effect/src/Graph.ts` - Graph utilities. Use: model dependency graphs.
- `Hash` - `packages/effect/src/Hash.ts` - Hashing utilities. Use: hash values for collections.
- `HashMap` - `packages/effect/src/HashMap.ts` - Immutable hash map. Use: keyed immutable storage.
- `HashRing` - `packages/effect/src/HashRing.ts` - Consistent hashing utilities. Use: distribute keys across nodes.
- `HashSet` - `packages/effect/src/HashSet.ts` - Immutable hash set. Use: store unique immutable values.
- `HKT` - `packages/effect/src/HKT.ts` - Higher-kinded type utilities. Use: define generic type classes.
- `Inspectable` - `packages/effect/src/Inspectable.ts` - Custom inspection helpers. Use: improve debugging output.
- `Iterable` - `packages/effect/src/Iterable.ts` - Functional iterable utilities. Use: process lazy iterables.
- `JsonPatch` - `packages/effect/src/JsonPatch.ts` - JSON Patch operations. Use: diff and patch JSON documents.
- `JsonPointer` - `packages/effect/src/JsonPointer.ts` - JSON Pointer token helpers. Use: escape pointer path segments.
- `JsonSchema` - `packages/effect/src/JsonSchema.ts` - JSON Schema dialect conversion. Use: convert schemas between formats.
- `Latch` - `packages/effect/src/Latch.ts` - Latch synchronization primitive. Use: gate concurrent progress.
- `Layer` - `packages/effect/src/Layer.ts` - Service construction recipes. Use: build and wire dependencies.
- `LayerMap` - `packages/effect/src/LayerMap.ts` - Layer registry helpers. Use: share and look up layers.
- `Logger` - `packages/effect/src/Logger.ts` - Structured logging system. Use: emit runtime logs.
- `LogLevel` - `packages/effect/src/LogLevel.ts` - Log level utilities. Use: filter logs by severity.
- `ManagedRuntime` - `packages/effect/src/ManagedRuntime.ts` - Managed runtime helpers. Use: own runtime lifecycle.
- `Match` - `packages/effect/src/Match.ts` - Type-safe pattern matching. Use: replace switch-heavy branching.
- `Metric` - `packages/effect/src/Metric.ts` - Application metrics system. Use: count, gauge, and histogram events.
- `MutableHashMap` - `packages/effect/src/MutableHashMap.ts` - Mutable hash map. Use: high-performance mutable key-value storage.
- `MutableHashSet` - `packages/effect/src/MutableHashSet.ts` - Mutable hash set. Use: high-performance mutable uniqueness checks.
- `MutableList` - `packages/effect/src/MutableList.ts` - Mutable linked-list-like buffer. Use: efficient append/prepend workloads.
- `MutableRef` - `packages/effect/src/MutableRef.ts` - Mutable reference container. Use: hold local mutable state.
- `Newtype` - `packages/effect/src/Newtype.ts` - Zero-cost wrapper types. Use: distinguish same-shaped values.
- `NonEmptyIterable` - `packages/effect/src/NonEmptyIterable.ts` - Non-empty iterable helpers. Use: require at least one element.
- `Number` - `packages/effect/src/Number.ts` - Number utilities and instances. Use: do typed numeric operations.
- `Optic` - `packages/effect/src/Optic.ts` - Immutable data accessors and updaters. Use: read or update nested state.
- `Option` - `packages/effect/src/Option.ts` - Optional value type. Use: model absence safely.
- `Order` - `packages/effect/src/Order.ts` - Total ordering type class. Use: sort and compare values.
- `Ordering` - `packages/effect/src/Ordering.ts` - Comparison result helpers. Use: combine sort outcomes.
- `PartitionedSemaphore` - `packages/effect/src/PartitionedSemaphore.ts` - Partition-aware semaphore. Use: limit concurrency by key.
- `Path` - `packages/effect/src/Path.ts` - Path utilities. Use: work with filesystem-style paths.
- `Pipeable` - `packages/effect/src/Pipeable.ts` - Pipeable protocol helpers. Use: support fluent pipelines.
- `PlatformError` - `packages/effect/src/PlatformError.ts` - Platform error types. Use: normalize platform-specific failures.
- `Pool` - `packages/effect/src/Pool.ts` - Resource pool utilities. Use: reuse scarce resources.
- `Predicate` - `packages/effect/src/Predicate.ts` - Predicate and refinement helpers. Use: filter and narrow values.
- `PrimaryKey` - `packages/effect/src/PrimaryKey.ts` - Primary key helpers. Use: define stable string identifiers.
- `PubSub` - `packages/effect/src/PubSub.ts` - Publish-subscribe hub. Use: broadcast messages to subscribers.
- `Pull` - `packages/effect/src/Pull.ts` - Pull protocol helpers. Use: model pull-based streaming.
- `Queue` - `packages/effect/src/Queue.ts` - Effect queue utilities. Use: buffer producer-consumer work.
- `Random` - `packages/effect/src/Random.ts` - Randomness service. Use: generate testable random values.
- `RcMap` - `packages/effect/src/RcMap.ts` - Reference-counted map. Use: share keyed resources.
- `RcRef` - `packages/effect/src/RcRef.ts` - Reference-counted ref. Use: share scoped resources.
- `Record` - `packages/effect/src/Record.ts` - Record utilities. Use: transform string-keyed objects.
- `Redactable` - `packages/effect/src/Redactable.ts` - Context-aware redaction protocol. Use: mask sensitive values.
- `Redacted` - `packages/effect/src/Redacted.ts` - Sensitive value wrapper. Use: keep secrets out of logs.
- `Reducer` - `packages/effect/src/Reducer.ts` - Fold values into one result. Use: aggregate collections.
- `Ref` - `packages/effect/src/Ref.ts` - Atomic mutable reference. Use: manage concurrent state.
- `References` - `packages/effect/src/References.ts` - Runtime reference services. Use: tune runtime configuration.
- `RegExp` - `packages/effect/src/RegExp.ts` - RegExp utilities. Use: work with regular expressions.
- `Request` - `packages/effect/src/Request.ts` - External request description. Use: batch and cache data fetching.
- `RequestResolver` - `packages/effect/src/RequestResolver.ts` - Request execution abstraction. Use: resolve batched requests.
- `Resource` - `packages/effect/src/Resource.ts` - Resource utilities. Use: acquire and release shared resources.
- `Result` - `packages/effect/src/Result.ts` - Synchronous success/failure type. Use: validate without effects.
- `Runtime` - `packages/effect/src/Runtime.ts` - Effect runtime helpers. Use: run main programs.
- `Schedule` - `packages/effect/src/Schedule.ts` - Retry and repetition schedules. Use: control retry timing.
- `Scheduler` - `packages/effect/src/Scheduler.ts` - Scheduler utilities. Use: control task execution.
- `Schema` - `packages/effect/src/Schema.ts` - Data schema, validation, and codecs. Use: decode and encode typed data.
- `SchemaAST` - `packages/effect/src/SchemaAST.ts` - Runtime schema AST. Use: inspect or transform schemas.
- `SchemaGetter` - `packages/effect/src/SchemaGetter.ts` - One-way schema transformations. Use: decode individual fields.
- `SchemaIssue` - `packages/effect/src/SchemaIssue.ts` - Structured schema validation errors. Use: inspect parse failures.
- `SchemaParser` - `packages/effect/src/SchemaParser.ts` - Schema parsing helpers. Use: build parsing workflows.
- `SchemaRepresentation` - `packages/effect/src/SchemaRepresentation.ts` - Serializable schema IR. Use: round-trip schemas through JSON/codegen.
- `SchemaTransformation` - `packages/effect/src/SchemaTransformation.ts` - Bidirectional schema transformations. Use: map encoded and decoded forms.
- `SchemaUtils` - `packages/effect/src/SchemaUtils.ts` - Schema utility helpers. Use: support schema internals.
- `Scope` - `packages/effect/src/Scope.ts` - Resource lifetime scope. Use: ensure cleanup of acquired resources.
- `ScopedCache` - `packages/effect/src/ScopedCache.ts` - Scoped cache utilities. Use: cache scoped resources.
- `ScopedRef` - `packages/effect/src/ScopedRef.ts` - Scoped mutable reference. Use: swap scoped resources safely.
- `Semaphore` - `packages/effect/src/Semaphore.ts` - Concurrency semaphore. Use: limit parallel access.
- `Sink` - `packages/effect/src/Sink.ts` - Stream consumer abstraction. Use: fold or write stream inputs.
- `Stdio` - `packages/effect/src/Stdio.ts` - Standard I/O utilities. Use: access stdin/stdout/stderr.
- `Stream` - `packages/effect/src/Stream.ts` - Functional stream abstraction. Use: process streaming data.
- `String` - `packages/effect/src/String.ts` - String utilities and instances. Use: manipulate text functionally.
- `Struct` - `packages/effect/src/Struct.ts` - Immutable object utilities. Use: transform plain objects.
- `SubscriptionRef` - `packages/effect/src/SubscriptionRef.ts` - Subscribable reference. Use: observe state changes.
- `Symbol` - `packages/effect/src/Symbol.ts` - Symbol utilities. Use: work with JavaScript symbols.
- `SynchronizedRef` - `packages/effect/src/SynchronizedRef.ts` - Effect-synchronized ref. Use: update state with effects.
- `Take` - `packages/effect/src/Take.ts` - Stream take representation. Use: carry chunk, end, or error.
- `Terminal` - `packages/effect/src/Terminal.ts` - Terminal interaction utilities. Use: build CLI prompts/output.
- `Tracer` - `packages/effect/src/Tracer.ts` - Tracing abstractions. Use: create spans and traces.
- `Trie` - `packages/effect/src/Trie.ts` - Prefix tree for strings. Use: do prefix lookups.
- `Tuple` - `packages/effect/src/Tuple.ts` - Immutable tuple utilities. Use: transform fixed-length arrays.
- `TxChunk` - `packages/effect/src/TxChunk.ts` - Transactional chunk. Use: mutate chunk state in STM.
- `TxDeferred` - `packages/effect/src/TxDeferred.ts` - Transactional deferred cell. Use: coordinate STM completion.
- `TxHashMap` - `packages/effect/src/TxHashMap.ts` - Transactional hash map. Use: keyed STM state.
- `TxHashSet` - `packages/effect/src/TxHashSet.ts` - Transactional hash set. Use: unique STM state.
- `TxPriorityQueue` - `packages/effect/src/TxPriorityQueue.ts` - Transactional priority queue. Use: ordered STM queueing.
- `TxPubSub` - `packages/effect/src/TxPubSub.ts` - Transactional pub-sub hub. Use: broadcast within STM.
- `TxQueue` - `packages/effect/src/TxQueue.ts` - Transactional queue. Use: queue data within STM.
- `TxReentrantLock` - `packages/effect/src/TxReentrantLock.ts` - Transactional reentrant RW lock. Use: coordinate STM access.
- `TxRef` - `packages/effect/src/TxRef.ts` - Transactional reference. Use: read and write STM state.
- `TxSemaphore` - `packages/effect/src/TxSemaphore.ts` - Transactional semaphore. Use: limit STM concurrency.
- `TxSubscriptionRef` - `packages/effect/src/TxSubscriptionRef.ts` - Transactional subscribable ref. Use: observe committed STM changes.
- `Types` - `packages/effect/src/Types.ts` - Type-level utility aliases. Use: shape complex TypeScript types.
- `UndefinedOr` - `packages/effect/src/UndefinedOr.ts` - Helpers for `A | undefined`. Use: model lightweight optional values.
- `Unify` - `packages/effect/src/Unify.ts` - Type unification helpers. Use: simplify inferred types.
- `Utils` - `packages/effect/src/Utils.ts` - Generator and HKT internals. Use: support yieldable APIs.

### `effect/testing`

- `FastCheck` - `packages/effect/src/testing/FastCheck.ts` - Re-export of fast-check for property testing. Use: generate random test cases.
- `TestClock` - `packages/effect/src/testing/TestClock.ts` - Controllable clock for tests. Use: advance time deterministically.
- `TestConsole` - `packages/effect/src/testing/TestConsole.ts` - Test console implementation. Use: assert console output.
- `TestSchema` - `packages/effect/src/testing/TestSchema.ts` - Schema assertion helpers. Use: verify decode/encode behavior.

### `effect/unstable/ai`

- `AiError` - `packages/effect/src/unstable/ai/AiError.ts` - AI-related error types. Use: handle model failures.
- `AnthropicStructuredOutput` - `packages/effect/src/unstable/ai/AnthropicStructuredOutput.ts` - Anthropic structured-output codec helpers. Use: parse structured model responses.
- `Chat` - `packages/effect/src/unstable/ai/Chat.ts` - Stateful AI conversation API. Use: manage chat sessions.
- `EmbeddingModel` - `packages/effect/src/unstable/ai/EmbeddingModel.ts` - Provider-agnostic embedding API. Use: generate text vectors.
- `IdGenerator` - `packages/effect/src/unstable/ai/IdGenerator.ts` - Pluggable ID generation. Use: issue stable request IDs.
- `LanguageModel` - `packages/effect/src/unstable/ai/LanguageModel.ts` - AI text generation with tools. Use: call LLMs.
- `McpSchema` - `packages/effect/src/unstable/ai/McpSchema.ts` - MCP schema helpers. Use: type MCP messages.
- `McpServer` - `packages/effect/src/unstable/ai/McpServer.ts` - MCP server support. Use: expose model context tools.
- `Model` - `packages/effect/src/unstable/ai/Model.ts` - Unified AI provider interface. Use: swap AI backends.
- `OpenAiStructuredOutput` - `packages/effect/src/unstable/ai/OpenAiStructuredOutput.ts` - OpenAI structured-output codecs. Use: decode typed model output.
- `Prompt` - `packages/effect/src/unstable/ai/Prompt.ts` - Prompt-building data structures. Use: compose prompts.
- `Response` - `packages/effect/src/unstable/ai/Response.ts` - AI response data structures. Use: inspect completions.
- `ResponseIdTracker` - `packages/effect/src/unstable/ai/ResponseIdTracker.ts` - Response ID tracking utilities. Use: correlate model replies.
- `Telemetry` - `packages/effect/src/unstable/ai/Telemetry.ts` - OpenTelemetry integration for AI operations. Use: trace model calls.
- `Tokenizer` - `packages/effect/src/unstable/ai/Tokenizer.ts` - Tokenization and truncation utilities. Use: enforce token budgets.
- `Tool` - `packages/effect/src/unstable/ai/Tool.ts` - Tool definition and management. Use: expose callable tools.
- `Toolkit` - `packages/effect/src/unstable/ai/Toolkit.ts` - Collection of tools. Use: bundle tool implementations.

### `effect/unstable/cli`

- `Argument` - `packages/effect/src/unstable/cli/Argument.ts` - CLI argument definitions. Use: positional arguments.
- `CliError` - `packages/effect/src/unstable/cli/CliError.ts` - CLI error types. Use: report parse failures.
- `CliOutput` - `packages/effect/src/unstable/cli/CliOutput.ts` - CLI rendering/output helpers. Use: format command output.
- `Command` - `packages/effect/src/unstable/cli/Command.ts` - CLI command definitions. Use: build subcommands.
- `Completions` - `packages/effect/src/unstable/cli/Completions.ts` - Shell completion generation. Use: generate completion scripts.
- `Flag` - `packages/effect/src/unstable/cli/Flag.ts` - CLI flag definitions. Use: parse options.
- `GlobalFlag` - `packages/effect/src/unstable/cli/GlobalFlag.ts` - Global CLI flags. Use: shared top-level options.
- `HelpDoc` - `packages/effect/src/unstable/cli/HelpDoc.ts` - CLI help document model. Use: render usage text.
- `Param` - `packages/effect/src/unstable/cli/Param.ts` - CLI parameter helpers. Use: define typed params.
- `Primitive` - `packages/effect/src/unstable/cli/Primitive.ts` - Primitive CLI parsers. Use: parse numbers or strings.
- `Prompt` - `packages/effect/src/unstable/cli/Prompt.ts` - Interactive CLI prompts. Use: ask users for input.

### `effect/unstable/cluster`

- `ClusterCron` - `packages/effect/src/unstable/cluster/ClusterCron.ts` - Cluster cron scheduling. Use: distributed recurring jobs.
- `ClusterError` - `packages/effect/src/unstable/cluster/ClusterError.ts` - Cluster error types. Use: classify cluster failures.
- `ClusterMetrics` - `packages/effect/src/unstable/cluster/ClusterMetrics.ts` - Cluster metrics helpers. Use: observe cluster health.
- `ClusterSchema` - `packages/effect/src/unstable/cluster/ClusterSchema.ts` - Cluster schema types. Use: encode cluster messages.
- `ClusterWorkflowEngine` - `packages/effect/src/unstable/cluster/ClusterWorkflowEngine.ts` - Workflow engine for clusters. Use: run distributed workflows.
- `DeliverAt` - `packages/effect/src/unstable/cluster/DeliverAt.ts` - Deferred delivery scheduling. Use: schedule message delivery.
- `Entity` - `packages/effect/src/unstable/cluster/Entity.ts` - Cluster entity abstraction. Use: model sharded actors.
- `EntityAddress` - `packages/effect/src/unstable/cluster/EntityAddress.ts` - Entity addressing types. Use: route entity messages.
- `EntityId` - `packages/effect/src/unstable/cluster/EntityId.ts` - Typed entity identifiers. Use: identify actor instances.
- `EntityProxy` - `packages/effect/src/unstable/cluster/EntityProxy.ts` - Client proxy for entities. Use: call remote entities.
- `EntityProxyServer` - `packages/effect/src/unstable/cluster/EntityProxyServer.ts` - Server for entity proxies. Use: serve entity calls.
- `EntityResource` - `packages/effect/src/unstable/cluster/EntityResource.ts` - Entity-backed resource helpers. Use: manage entity state.
- `EntityType` - `packages/effect/src/unstable/cluster/EntityType.ts` - Entity type descriptors. Use: register entity kinds.
- `Envelope` - `packages/effect/src/unstable/cluster/Envelope.ts` - Message envelope types. Use: wrap cluster messages.
- `HttpRunner` - `packages/effect/src/unstable/cluster/HttpRunner.ts` - HTTP-based runner. Use: transport cluster traffic over HTTP.
- `K8sHttpClient` - `packages/effect/src/unstable/cluster/K8sHttpClient.ts` - Kubernetes HTTP client helpers. Use: discover cluster peers.
- `MachineId` - `packages/effect/src/unstable/cluster/MachineId.ts` - Machine identifier utilities. Use: label cluster nodes.
- `Message` - `packages/effect/src/unstable/cluster/Message.ts` - Cluster message model. Use: send typed payloads.
- `MessageStorage` - `packages/effect/src/unstable/cluster/MessageStorage.ts` - Message persistence abstraction. Use: durable message storage.
- `Reply` - `packages/effect/src/unstable/cluster/Reply.ts` - Reply message helpers. Use: respond to cluster requests.
- `Runner` - `packages/effect/src/unstable/cluster/Runner.ts` - Cluster runner abstraction. Use: host cluster workloads.
- `RunnerAddress` - `packages/effect/src/unstable/cluster/RunnerAddress.ts` - Runner addressing types. Use: locate a runner.
- `RunnerHealth` - `packages/effect/src/unstable/cluster/RunnerHealth.ts` - Runner health reporting. Use: track node readiness.
- `Runners` - `packages/effect/src/unstable/cluster/Runners.ts` - Runner collection utilities. Use: manage active runners.
- `RunnerServer` - `packages/effect/src/unstable/cluster/RunnerServer.ts` - Runner server implementation. Use: expose runner endpoints.
- `RunnerStorage` - `packages/effect/src/unstable/cluster/RunnerStorage.ts` - Runner persistence abstraction. Use: store runner metadata.
- `ShardId` - `packages/effect/src/unstable/cluster/ShardId.ts` - Shard identifier type. Use: map keys to shards.
- `Sharding` - `packages/effect/src/unstable/cluster/Sharding.ts` - Sharding utilities. Use: distribute entities.
- `ShardingConfig` - `packages/effect/src/unstable/cluster/ShardingConfig.ts` - Sharding configuration. Use: tune partitioning behavior.
- `ShardingRegistrationEvent` - `packages/effect/src/unstable/cluster/ShardingRegistrationEvent.ts` - Sharding registration events. Use: observe topology changes.
- `SingleRunner` - `packages/effect/src/unstable/cluster/SingleRunner.ts` - Single-process runner. Use: local cluster execution.
- `Singleton` - `packages/effect/src/unstable/cluster/Singleton.ts` - Cluster singleton abstraction. Use: one active service instance.
- `SingletonAddress` - `packages/effect/src/unstable/cluster/SingletonAddress.ts` - Singleton addressing types. Use: route singleton calls.
- `Snowflake` - `packages/effect/src/unstable/cluster/Snowflake.ts` - Snowflake-style ID generation. Use: unique distributed IDs.
- `SocketRunner` - `packages/effect/src/unstable/cluster/SocketRunner.ts` - Socket-based runner. Use: cluster transport over sockets.
- `SqlMessageStorage` - `packages/effect/src/unstable/cluster/SqlMessageStorage.ts` - SQL-backed message storage. Use: persist cluster messages.
- `SqlRunnerStorage` - `packages/effect/src/unstable/cluster/SqlRunnerStorage.ts` - SQL-backed runner storage. Use: persist runner state.
- `TestRunner` - `packages/effect/src/unstable/cluster/TestRunner.ts` - Test runner utilities. Use: simulate cluster execution.

### `effect/unstable/devtools`

- `DevTools` - `packages/effect/src/unstable/devtools/DevTools.ts` - Devtools integration. Use: inspect runtime behavior.
- `DevToolsClient` - `packages/effect/src/unstable/devtools/DevToolsClient.ts` - Devtools client API. Use: connect to devtools server.
- `DevToolsSchema` - `packages/effect/src/unstable/devtools/DevToolsSchema.ts` - Devtools message schemas. Use: type devtools payloads.
- `DevToolsServer` - `packages/effect/src/unstable/devtools/DevToolsServer.ts` - Devtools server API. Use: expose inspection endpoints.

### `effect/unstable/encoding`

- `Msgpack` - `packages/effect/src/unstable/encoding/Msgpack.ts` - MessagePack encoding helpers. Use: compact binary serialization.
- `Ndjson` - `packages/effect/src/unstable/encoding/Ndjson.ts` - NDJSON encoding helpers. Use: stream JSON lines.
- `Sse` - `packages/effect/src/unstable/encoding/Sse.ts` - Server-sent event encoding helpers. Use: emit SSE streams.

### `effect/unstable/eventlog`

- `Event` - `packages/effect/src/unstable/eventlog/Event.ts` - Event model types. Use: represent domain events.
- `EventGroup` - `packages/effect/src/unstable/eventlog/EventGroup.ts` - Event grouping helpers. Use: batch related events.
- `EventJournal` - `packages/effect/src/unstable/eventlog/EventJournal.ts` - Event journal abstraction. Use: append and read events.
- `EventLog` - `packages/effect/src/unstable/eventlog/EventLog.ts` - Event log API. Use: stream recorded events.
- `EventLogEncryption` - `packages/effect/src/unstable/eventlog/EventLogEncryption.ts` - Event log encryption helpers. Use: protect event payloads.
- `EventLogMessage` - `packages/effect/src/unstable/eventlog/EventLogMessage.ts` - Event log message types. Use: transport log entries.
- `EventLogRemote` - `packages/effect/src/unstable/eventlog/EventLogRemote.ts` - Remote event log client/server helpers. Use: access remote logs.
- `EventLogServer` - `packages/effect/src/unstable/eventlog/EventLogServer.ts` - Event log server support. Use: host event streams.
- `EventLogServerEncrypted` - `packages/effect/src/unstable/eventlog/EventLogServerEncrypted.ts` - Encrypted event log server. Use: secure event serving.
- `EventLogServerUnencrypted` - `packages/effect/src/unstable/eventlog/EventLogServerUnencrypted.ts` - Unencrypted event log server. Use: plain local serving.
- `EventLogSessionAuth` - `packages/effect/src/unstable/eventlog/EventLogSessionAuth.ts` - Event log session auth helpers. Use: authorize event sessions.
- `SqlEventJournal` - `packages/effect/src/unstable/eventlog/SqlEventJournal.ts` - SQL-backed event journal. Use: persist events in SQL.
- `SqlEventLogServerEncrypted` - `packages/effect/src/unstable/eventlog/SqlEventLogServerEncrypted.ts` - SQL-backed encrypted event server. Use: secure persisted logs.
- `SqlEventLogServerUnencrypted` - `packages/effect/src/unstable/eventlog/SqlEventLogServerUnencrypted.ts` - SQL-backed plain event server. Use: simple persisted logs.

### `effect/unstable/http`

- `Cookies` - `packages/effect/src/unstable/http/Cookies.ts` - HTTP cookie helpers. Use: parse and set cookies.
- `Etag` - `packages/effect/src/unstable/http/Etag.ts` - ETag utilities. Use: cache validation headers.
- `FetchHttpClient` - `packages/effect/src/unstable/http/FetchHttpClient.ts` - Fetch-based HTTP client. Use: run requests in browsers.
- `FindMyWay` - `packages/effect/src/unstable/http/FindMyWay.ts` - `find-my-way` router integration. Use: path routing.
- `Headers` - `packages/effect/src/unstable/http/Headers.ts` - HTTP header utilities. Use: manage request headers.
- `HttpBody` - `packages/effect/src/unstable/http/HttpBody.ts` - HTTP body representations. Use: send JSON or bytes.
- `HttpClient` - `packages/effect/src/unstable/http/HttpClient.ts` - Effect HTTP client API. Use: perform outbound requests.
- `HttpClientError` - `packages/effect/src/unstable/http/HttpClientError.ts` - HTTP client error types. Use: handle request failures.
- `HttpClientRequest` - `packages/effect/src/unstable/http/HttpClientRequest.ts` - HTTP client request builders. Use: construct requests.
- `HttpClientResponse` - `packages/effect/src/unstable/http/HttpClientResponse.ts` - HTTP client response utilities. Use: read status and body.
- `HttpEffect` - `packages/effect/src/unstable/http/HttpEffect.ts` - HTTP-specific effect helpers. Use: compose HTTP workflows.
- `HttpIncomingMessage` - `packages/effect/src/unstable/http/HttpIncomingMessage.ts` - Incoming message abstraction. Use: read request bodies.
- `HttpMethod` - `packages/effect/src/unstable/http/HttpMethod.ts` - HTTP method helpers. Use: branch on verbs.
- `HttpMiddleware` - `packages/effect/src/unstable/http/HttpMiddleware.ts` - HTTP middleware utilities. Use: add auth or logging.
- `HttpPlatform` - `packages/effect/src/unstable/http/HttpPlatform.ts` - Platform HTTP integration. Use: supply runtime adapters.
- `HttpRouter` - `packages/effect/src/unstable/http/HttpRouter.ts` - HTTP routing abstraction. Use: define endpoints.
- `HttpServer` - `packages/effect/src/unstable/http/HttpServer.ts` - HTTP server API. Use: serve requests.
- `HttpServerError` - `packages/effect/src/unstable/http/HttpServerError.ts` - HTTP server error types. Use: render server failures.
- `HttpServerRequest` - `packages/effect/src/unstable/http/HttpServerRequest.ts` - Server request utilities. Use: inspect inbound requests.
- `HttpServerRespondable` - `packages/effect/src/unstable/http/HttpServerRespondable.ts` - Response conversion protocol. Use: return custom response types.
- `HttpServerResponse` - `packages/effect/src/unstable/http/HttpServerResponse.ts` - Server response builders. Use: send JSON or text.
- `HttpStaticServer` - `packages/effect/src/unstable/http/HttpStaticServer.ts` - Static file serving helpers. Use: serve assets.
- `HttpTraceContext` - `packages/effect/src/unstable/http/HttpTraceContext.ts` - HTTP trace-context propagation. Use: carry tracing headers.
- `Multipart` - `packages/effect/src/unstable/http/Multipart.ts` - Multipart form-data helpers. Use: file uploads.
- `Multipasta` - `packages/effect/src/unstable/http/Multipasta.ts` - Multipasta integration. Use: parse multipart streams.
- `Template` - `packages/effect/src/unstable/http/Template.ts` - HTTP templating helpers. Use: generate responses from templates.
- `Url` - `packages/effect/src/unstable/http/Url.ts` - URL utilities. Use: parse and build URLs.
- `UrlParams` - `packages/effect/src/unstable/http/UrlParams.ts` - URL parameter helpers. Use: encode query strings.

### `effect/unstable/httpapi`

- `HttpApi` - `packages/effect/src/unstable/httpapi/HttpApi.ts` - Typed HTTP API description. Use: define an API contract.
- `HttpApiBuilder` - `packages/effect/src/unstable/httpapi/HttpApiBuilder.ts` - Build servers from `HttpApi`. Use: implement typed endpoints.
- `HttpApiClient` - `packages/effect/src/unstable/httpapi/HttpApiClient.ts` - Client generation for `HttpApi`. Use: call typed APIs.
- `HttpApiEndpoint` - `packages/effect/src/unstable/httpapi/HttpApiEndpoint.ts` - Endpoint descriptors. Use: define route inputs/outputs.
- `HttpApiError` - `packages/effect/src/unstable/httpapi/HttpApiError.ts` - HTTP API error types. Use: model typed API failures.
- `HttpApiGroup` - `packages/effect/src/unstable/httpapi/HttpApiGroup.ts` - Group API endpoints. Use: organize related routes.
- `HttpApiMiddleware` - `packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts` - API middleware helpers. Use: add auth policies.
- `HttpApiScalar` - `packages/effect/src/unstable/httpapi/HttpApiScalar.ts` - Scalar UI/integration helpers. Use: expose API docs tooling.
- `HttpApiSchema` - `packages/effect/src/unstable/httpapi/HttpApiSchema.ts` - Schema annotations for HTTP metadata. Use: tag schema fields for APIs.
- `HttpApiSecurity` - `packages/effect/src/unstable/httpapi/HttpApiSecurity.ts` - Security scheme helpers. Use: define auth requirements.
- `HttpApiSwagger` - `packages/effect/src/unstable/httpapi/HttpApiSwagger.ts` - Swagger/OpenAPI integration. Use: serve interactive docs.
- `HttpApiTest` - `packages/effect/src/unstable/httpapi/HttpApiTest.ts` - HttpApi test helpers. Use: test typed endpoints.
- `OpenApi` - `packages/effect/src/unstable/httpapi/OpenApi.ts` - OpenAPI generation helpers. Use: export API specs.

### `effect/unstable/observability`

- `Otlp` - `packages/effect/src/unstable/observability/Otlp.ts` - OTLP integration entrypoint. Use: configure OTLP telemetry.
- `OtlpExporter` - `packages/effect/src/unstable/observability/OtlpExporter.ts` - OTLP exporter utilities. Use: send telemetry externally.
- `OtlpLogger` - `packages/effect/src/unstable/observability/OtlpLogger.ts` - OTLP log export support. Use: ship structured logs.
- `OtlpMetrics` - `packages/effect/src/unstable/observability/OtlpMetrics.ts` - OTLP metrics export support. Use: export counters and histograms.
- `OtlpResource` - `packages/effect/src/unstable/observability/OtlpResource.ts` - OTLP resource metadata helpers. Use: tag service identity.
- `OtlpSerialization` - `packages/effect/src/unstable/observability/OtlpSerialization.ts` - OTLP serialization helpers. Use: encode telemetry payloads.
- `OtlpTracer` - `packages/effect/src/unstable/observability/OtlpTracer.ts` - OTLP tracing export support. Use: export spans.
- `PrometheusMetrics` - `packages/effect/src/unstable/observability/PrometheusMetrics.ts` - Prometheus metrics exporter. Use: expose scrape endpoint.

### `effect/unstable/persistence`

- `KeyValueStore` - `packages/effect/src/unstable/persistence/KeyValueStore.ts` - Key-value storage abstraction. Use: persist simple state.
- `Persistable` - `packages/effect/src/unstable/persistence/Persistable.ts` - Persistable type helpers. Use: encode stored values.
- `PersistedCache` - `packages/effect/src/unstable/persistence/PersistedCache.ts` - Durable cache. Use: cache across restarts.
- `PersistedQueue` - `packages/effect/src/unstable/persistence/PersistedQueue.ts` - Durable queue. Use: persist work items.
- `Persistence` - `packages/effect/src/unstable/persistence/Persistence.ts` - Persistence service APIs. Use: back durable components.
- `RateLimiter` - `packages/effect/src/unstable/persistence/RateLimiter.ts` - Persistent rate limiter. Use: enforce cross-process limits.
- `Redis` - `packages/effect/src/unstable/persistence/Redis.ts` - Redis-backed persistence helpers. Use: store state in Redis.

### `effect/unstable/process`

- `ChildProcess` - `packages/effect/src/unstable/process/ChildProcess.ts` - Child process abstractions. Use: manage spawned commands.
- `ChildProcessSpawner` - `packages/effect/src/unstable/process/ChildProcessSpawner.ts` - Generic child-process spawning service. Use: launch subprocesses.

### `effect/unstable/reactivity`

- `AsyncResult` - `packages/effect/src/unstable/reactivity/AsyncResult.ts` - Reactive async result type. Use: represent loading/error/data.
- `Atom` - `packages/effect/src/unstable/reactivity/Atom.ts` - Reactive atom state primitive. Use: local reactive state.
- `AtomHttpApi` - `packages/effect/src/unstable/reactivity/AtomHttpApi.ts` - HttpApi integration for atoms. Use: sync state over HTTP.
- `AtomRef` - `packages/effect/src/unstable/reactivity/AtomRef.ts` - Ref-backed atom helpers. Use: bridge refs to reactivity.
- `AtomRegistry` - `packages/effect/src/unstable/reactivity/AtomRegistry.ts` - Atom registry utilities. Use: track application atoms.
- `AtomRpc` - `packages/effect/src/unstable/reactivity/AtomRpc.ts` - RPC integration for atoms. Use: sync state over RPC.
- `Hydration` - `packages/effect/src/unstable/reactivity/Hydration.ts` - Hydration helpers. Use: restore reactive state.
- `Reactivity` - `packages/effect/src/unstable/reactivity/Reactivity.ts` - Core reactivity utilities. Use: compose reactive computations.

### `effect/unstable/rpc`

- `Rpc` - `packages/effect/src/unstable/rpc/Rpc.ts` - Typed RPC description. Use: define RPC contracts.
- `RpcClient` - `packages/effect/src/unstable/rpc/RpcClient.ts` - RPC client API. Use: call remote procedures.
- `RpcClientError` - `packages/effect/src/unstable/rpc/RpcClientError.ts` - RPC client error types. Use: handle transport failures.
- `RpcGroup` - `packages/effect/src/unstable/rpc/RpcGroup.ts` - Group RPC endpoints. Use: organize procedures.
- `RpcMessage` - `packages/effect/src/unstable/rpc/RpcMessage.ts` - RPC message model. Use: encode request/response payloads.
- `RpcMiddleware` - `packages/effect/src/unstable/rpc/RpcMiddleware.ts` - RPC middleware helpers. Use: add auth or tracing.
- `RpcSchema` - `packages/effect/src/unstable/rpc/RpcSchema.ts` - Schema helpers for RPC. Use: type RPC payloads.
- `RpcSerialization` - `packages/effect/src/unstable/rpc/RpcSerialization.ts` - RPC serialization helpers. Use: encode wire formats.
- `RpcServer` - `packages/effect/src/unstable/rpc/RpcServer.ts` - RPC server API. Use: expose procedures.
- `RpcTest` - `packages/effect/src/unstable/rpc/RpcTest.ts` - RPC testing helpers. Use: test RPC handlers.
- `RpcWorker` - `packages/effect/src/unstable/rpc/RpcWorker.ts` - Worker integration for RPC. Use: run RPC over workers.
- `Utils` - `packages/effect/src/unstable/rpc/Utils.ts` - Shared RPC utilities. Use: support custom RPC plumbing.

### `effect/unstable/schema`

- `Model` - `packages/effect/src/unstable/schema/Model.ts` - Unstable schema model helpers. Use: define schema-backed models.
- `VariantSchema` - `packages/effect/src/unstable/schema/VariantSchema.ts` - Variant/discriminated schema helpers. Use: model tagged unions.

### `effect/unstable/socket`

- `Socket` - `packages/effect/src/unstable/socket/Socket.ts` - Socket abstractions. Use: connect stream transports.
- `SocketServer` - `packages/effect/src/unstable/socket/SocketServer.ts` - Socket server helpers. Use: accept socket clients.

### `effect/unstable/sql`

- `Migrator` - `packages/effect/src/unstable/sql/Migrator.ts` - SQL migration helpers. Use: run schema migrations.
- `SqlClient` - `packages/effect/src/unstable/sql/SqlClient.ts` - SQL client API. Use: execute queries.
- `SqlConnection` - `packages/effect/src/unstable/sql/SqlConnection.ts` - SQL connection abstraction. Use: manage DB sessions.
- `SqlError` - `packages/effect/src/unstable/sql/SqlError.ts` - SQL error types. Use: classify database failures.
- `SqlModel` - `packages/effect/src/unstable/sql/SqlModel.ts` - SQL-backed model helpers. Use: map tables to models.
- `SqlResolver` - `packages/effect/src/unstable/sql/SqlResolver.ts` - SQL request resolution helpers. Use: batch DB-backed requests.
- `SqlSchema` - `packages/effect/src/unstable/sql/SqlSchema.ts` - Schema helpers for SQL. Use: type query values.
- `SqlStream` - `packages/effect/src/unstable/sql/SqlStream.ts` - Streaming SQL query helpers. Use: consume large result sets.
- `Statement` - `packages/effect/src/unstable/sql/Statement.ts` - SQL statement builders/types. Use: prepare typed statements.

### `effect/unstable/workers`

- `Transferable` - `packages/effect/src/unstable/workers/Transferable.ts` - Transferable value helpers. Use: send data between workers.
- `Worker` - `packages/effect/src/unstable/workers/Worker.ts` - Worker abstractions. Use: run isolated tasks.
- `WorkerError` - `packages/effect/src/unstable/workers/WorkerError.ts` - Worker error types. Use: handle worker failures.
- `WorkerRunner` - `packages/effect/src/unstable/workers/WorkerRunner.ts` - Worker runner utilities. Use: host jobs in workers.

### `effect/unstable/workflow`

- `Activity` - `packages/effect/src/unstable/workflow/Activity.ts` - Workflow activity helpers. Use: define durable steps.
- `DurableClock` - `packages/effect/src/unstable/workflow/DurableClock.ts` - Durable clock API. Use: schedule workflow time.
- `DurableDeferred` - `packages/effect/src/unstable/workflow/DurableDeferred.ts` - Durable deferred primitive. Use: await external completion.
- `DurableQueue` - `packages/effect/src/unstable/workflow/DurableQueue.ts` - Durable queue primitive. Use: persist workflow worklists.
- `Workflow` - `packages/effect/src/unstable/workflow/Workflow.ts` - Workflow definition API. Use: declare durable workflows.
- `WorkflowEngine` - `packages/effect/src/unstable/workflow/WorkflowEngine.ts` - Workflow engine runtime. Use: execute workflows.
- `WorkflowProxy` - `packages/effect/src/unstable/workflow/WorkflowProxy.ts` - Workflow client proxy. Use: call workflow instances.
- `WorkflowProxyServer` - `packages/effect/src/unstable/workflow/WorkflowProxyServer.ts` - Workflow proxy server. Use: expose workflow endpoints.

## `@effect/opentelemetry` Package

Package path: `packages/opentelemetry`

- `Logger` - `packages/opentelemetry/src/Logger.ts` - OpenTelemetry logging integration. Use: export structured logs.
- `Metrics` - `packages/opentelemetry/src/Metrics.ts` - OpenTelemetry metrics integration. Use: publish application metrics.
- `NodeSdk` - `packages/opentelemetry/src/NodeSdk.ts` - Node OpenTelemetry SDK wiring. Use: bootstrap telemetry in Node.
- `Resource` - `packages/opentelemetry/src/Resource.ts` - OpenTelemetry resource helpers. Use: describe service metadata.
- `Tracer` - `packages/opentelemetry/src/Tracer.ts` - OpenTelemetry tracing integration. Use: create and export spans.
- `WebSdk` - `packages/opentelemetry/src/WebSdk.ts` - Web OpenTelemetry SDK wiring. Use: bootstrap telemetry in browsers.

## `@effect/platform-browser` Package

Package path: `packages/platform-browser`

- `BrowserHttpClient` - `packages/platform-browser/src/BrowserHttpClient.ts` - Browser HTTP client implementation. Use: make fetch-based requests.
- `BrowserKeyValueStore` - `packages/platform-browser/src/BrowserKeyValueStore.ts` - Browser key-value storage adapter. Use: persist small client values.
- `BrowserPersistence` - `packages/platform-browser/src/BrowserPersistence.ts` - Browser persistence services. Use: store app state locally.
- `BrowserRuntime` - `packages/platform-browser/src/BrowserRuntime.ts` - Browser runtime entrypoints. Use: run Effect apps in browsers.
- `BrowserSocket` - `packages/platform-browser/src/BrowserSocket.ts` - Browser socket implementation. Use: open WebSocket-style connections.
- `BrowserStream` - `packages/platform-browser/src/BrowserStream.ts` - Browser stream adapters. Use: bridge web streams.
- `BrowserWorker` - `packages/platform-browser/src/BrowserWorker.ts` - Browser worker integration. Use: communicate with web workers.
- `BrowserWorkerRunner` - `packages/platform-browser/src/BrowserWorkerRunner.ts` - Worker-side runtime helpers. Use: run Effect code inside workers.
- `Clipboard` - `packages/platform-browser/src/Clipboard.ts` - Clipboard API wrappers. Use: read or write clipboard data.
- `Geolocation` - `packages/platform-browser/src/Geolocation.ts` - Geolocation API wrappers. Use: access device location.
- `IndexedDb` - `packages/platform-browser/src/IndexedDb.ts` - IndexedDB integration. Use: build browser databases.
- `IndexedDbDatabase` - `packages/platform-browser/src/IndexedDbDatabase.ts` - IndexedDB database helpers. Use: define database handles.
- `IndexedDbQueryBuilder` - `packages/platform-browser/src/IndexedDbQueryBuilder.ts` - IndexedDB query builder. Use: compose indexed queries.
- `IndexedDbTable` - `packages/platform-browser/src/IndexedDbTable.ts` - IndexedDB table helpers. Use: work with object stores.
- `IndexedDbVersion` - `packages/platform-browser/src/IndexedDbVersion.ts` - IndexedDB versioning helpers. Use: manage schema upgrades.
- `Permissions` - `packages/platform-browser/src/Permissions.ts` - Permissions API wrappers. Use: query browser permissions.

## `@effect/platform-bun` Package

Package path: `packages/platform-bun`

- `BunChildProcessSpawner` - `packages/platform-bun/src/BunChildProcessSpawner.ts` - Bun child-process spawner. Use: launch subprocesses.
- `BunClusterHttp` - `packages/platform-bun/src/BunClusterHttp.ts` - Bun clustered HTTP helpers. Use: scale HTTP servers.
- `BunClusterSocket` - `packages/platform-bun/src/BunClusterSocket.ts` - Bun clustered socket helpers. Use: scale socket servers.
- `BunFileSystem` - `packages/platform-bun/src/BunFileSystem.ts` - Bun file system implementation. Use: do Bun-based file I/O.
- `BunHttpClient` - `packages/platform-bun/src/BunHttpClient.ts` - Bun HTTP client implementation. Use: make outbound HTTP requests.
- `BunHttpPlatform` - `packages/platform-bun/src/BunHttpPlatform.ts` - Bun HTTP platform services. Use: provide HTTP runtime pieces.
- `BunHttpServer` - `packages/platform-bun/src/BunHttpServer.ts` - Bun HTTP server implementation. Use: serve HTTP endpoints.
- `BunHttpServerRequest` - `packages/platform-bun/src/BunHttpServerRequest.ts` - Bun request adapters. Use: read incoming HTTP requests.
- `BunMultipart` - `packages/platform-bun/src/BunMultipart.ts` - Bun multipart parsing. Use: handle form uploads.
- `BunPath` - `packages/platform-bun/src/BunPath.ts` - Bun path service. Use: resolve filesystem paths.
- `BunRedis` - `packages/platform-bun/src/BunRedis.ts` - Bun Redis integration. Use: talk to Redis.
- `BunRuntime` - `packages/platform-bun/src/BunRuntime.ts` - Bun runtime entrypoints. Use: run Effect apps on Bun.
- `BunServices` - `packages/platform-bun/src/BunServices.ts` - Bun service bundle. Use: provide common Bun services.
- `BunSink` - `packages/platform-bun/src/BunSink.ts` - Bun sink adapters. Use: write streamed output.
- `BunSocket` - `packages/platform-bun/src/BunSocket.ts` - Bun socket implementation. Use: manage socket connections.
- `BunSocketServer` - `packages/platform-bun/src/BunSocketServer.ts` - Bun socket server implementation. Use: accept socket clients.
- `BunStdio` - `packages/platform-bun/src/BunStdio.ts` - Bun stdio integration. Use: access stdin/stdout/stderr.
- `BunStream` - `packages/platform-bun/src/BunStream.ts` - Bun stream adapters. Use: bridge Bun streams.
- `BunTerminal` - `packages/platform-bun/src/BunTerminal.ts` - Bun terminal integration. Use: build CLI terminal interactions.
- `BunWorker` - `packages/platform-bun/src/BunWorker.ts` - Bun worker integration. Use: communicate with workers.
- `BunWorkerRunner` - `packages/platform-bun/src/BunWorkerRunner.ts` - Bun worker runtime helpers. Use: run Effect code in workers.

## `@effect/platform-node` Package

Package path: `packages/platform-node`

- `Mime` - `packages/platform-node/src/Mime.ts` - MIME type helpers. Use: detect or assign content types.
- `NodeChildProcessSpawner` - `packages/platform-node/src/NodeChildProcessSpawner.ts` - Node child-process spawner. Use: launch subprocesses.
- `NodeClusterHttp` - `packages/platform-node/src/NodeClusterHttp.ts` - Node clustered HTTP helpers. Use: scale HTTP servers.
- `NodeClusterSocket` - `packages/platform-node/src/NodeClusterSocket.ts` - Node clustered socket helpers. Use: scale socket servers.
- `NodeFileSystem` - `packages/platform-node/src/NodeFileSystem.ts` - Node file system implementation. Use: do Node-based file I/O.
- `NodeHttpClient` - `packages/platform-node/src/NodeHttpClient.ts` - Node HTTP client implementation. Use: make outbound HTTP requests.
- `NodeHttpIncomingMessage` - `packages/platform-node/src/NodeHttpIncomingMessage.ts` - Node incoming message adapters. Use: read raw Node HTTP messages.
- `NodeHttpPlatform` - `packages/platform-node/src/NodeHttpPlatform.ts` - Node HTTP platform services. Use: provide HTTP runtime pieces.
- `NodeHttpServer` - `packages/platform-node/src/NodeHttpServer.ts` - Node HTTP server implementation. Use: serve HTTP endpoints.
- `NodeHttpServerRequest` - `packages/platform-node/src/NodeHttpServerRequest.ts` - Node request adapters. Use: read incoming HTTP requests.
- `NodeMultipart` - `packages/platform-node/src/NodeMultipart.ts` - Node multipart parsing. Use: handle form uploads.
- `NodePath` - `packages/platform-node/src/NodePath.ts` - Node path service. Use: resolve filesystem paths.
- `NodeRedis` - `packages/platform-node/src/NodeRedis.ts` - Node Redis integration. Use: talk to Redis.
- `NodeRuntime` - `packages/platform-node/src/NodeRuntime.ts` - Node runtime entrypoints. Use: run Effect apps on Node.
- `NodeServices` - `packages/platform-node/src/NodeServices.ts` - Node service bundle. Use: provide common Node services.
- `NodeSink` - `packages/platform-node/src/NodeSink.ts` - Node sink adapters. Use: write streamed output.
- `NodeSocket` - `packages/platform-node/src/NodeSocket.ts` - Node socket implementation. Use: manage socket connections.
- `NodeSocketServer` - `packages/platform-node/src/NodeSocketServer.ts` - Node socket server implementation. Use: accept socket clients.
- `NodeStdio` - `packages/platform-node/src/NodeStdio.ts` - Node stdio integration. Use: access stdin/stdout/stderr.
- `NodeStream` - `packages/platform-node/src/NodeStream.ts` - Node stream adapters. Use: bridge Node streams.
- `NodeTerminal` - `packages/platform-node/src/NodeTerminal.ts` - Node terminal integration. Use: build CLI terminal interactions.
- `NodeWorker` - `packages/platform-node/src/NodeWorker.ts` - Node worker integration. Use: communicate with worker threads.
- `NodeWorkerRunner` - `packages/platform-node/src/NodeWorkerRunner.ts` - Node worker runtime helpers. Use: run Effect code in workers.
- `Undici` - `packages/platform-node/src/Undici.ts` - Undici integration helpers. Use: use Undici-based HTTP features.

## `@effect/platform-node-shared` Package

Package path: `packages/platform-node-shared`

- No public `src/index.ts` barrel is present in this vendored repo, so there are no barrel exports to inventory here.

## `@effect/vitest` Package

Package path: `packages/vitest`

- `vitest` - `packages/vitest/src/index.ts` - Re-export of `vitest` APIs. Use: use standard Vitest APIs.
- `API` - `packages/vitest/src/index.ts` - Test API type alias. Use: type custom test helpers.
- `Vitest` - `packages/vitest/src/index.ts` - Effect-aware Vitest namespace types. Use: type Effect-based tests.
- `addEqualityTesters` - `packages/vitest/src/index.ts` - Installs equality testers. Use: compare Effect values in assertions.
- `effect` - `packages/vitest/src/index.ts` - Effect-aware `it` variant. Use: write scoped Effect tests.
- `live` - `packages/vitest/src/index.ts` - Live-service test variant. Use: run tests with live services.
- `layer` - `packages/vitest/src/index.ts` - Share a `Layer` across tests. Use: provide services to test groups.
- `flakyTest` - `packages/vitest/src/index.ts` - Flaky-test wrapper. Use: stabilize eventually consistent checks.
- `prop` - `packages/vitest/src/index.ts` - Property-test helper. Use: generate property-based cases.
- `it` - `packages/vitest/src/index.ts` - Extended Vitest `it`. Use: mix regular and Effect tests.
- `makeMethods` - `packages/vitest/src/index.ts` - Build extended test methods. Use: wrap a custom test API.
- `describeWrapped` - `packages/vitest/src/index.ts` - `describe` helper with Effect methods. Use: define grouped Effect test suites.