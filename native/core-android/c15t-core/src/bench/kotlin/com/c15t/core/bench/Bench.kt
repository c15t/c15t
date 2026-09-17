package com.c15t.core.bench

import com.c15t.core.C15tKernel
import com.c15t.core.CommitIntent
import com.c15t.core.NativeConfig
import com.c15t.core.model.ActiveUI
import com.c15t.core.model.ConsentAction
import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentLocation
import com.c15t.core.model.ConsentModel
import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.ConsentState
import com.c15t.core.model.ConsentSubject
import com.c15t.core.model.ExplicitChoice
import com.c15t.core.model.GpcSignal
import com.c15t.core.model.KernelOverrides
import com.c15t.core.model.KernelUser
import com.c15t.core.model.PolicyResolution
import com.c15t.core.model.PrivacySignals
import com.c15t.core.model.QueuedSave
import com.c15t.core.policy.EvaluationPolicy
import com.c15t.core.policy.NoticeDismissal
import com.c15t.core.policy.PolicyEvaluator
import com.c15t.core.policy.PolicyPrompt
import com.c15t.core.policy.ScopeMode
import com.c15t.core.spi.Clock
import com.c15t.core.spi.KeyValueStore
import com.c15t.core.spi.TaskExecutor
import com.c15t.core.store.C15tJson
import com.c15t.core.store.C15tStore
import com.c15t.core.store.C15tStoreKeys
import com.c15t.core.store.SnapshotEnvelope
import com.c15t.core.transport.C15tTransport
import com.c15t.core.transport.InitContext
import com.c15t.core.transport.SaveOutcome
import com.c15t.core.transport.TransportOutcome
import java.io.File
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject

/**
 * Measured numbers for the budgets in `native/CONTRACT.md`, so the report is
 * figures rather than claims.
 *
 * Run with `./gradlew :c15t-core:bench`. Each line is a median over measured
 * iterations after a warmup, on the calling JVM, except the cold bootstrap, which takes
 * one sample per fresh JVM because no loop can show a cold one. Every budget the
 * contract names is asserted, so a regression fails the task instead of drifting
 * quietly.
 */
object Bench {
	private const val WARMUP = 500
	private const val ITERATIONS = 3_000

	/** Cold samples: one fresh JVM each, the only way to see a kernel that is not warm. */
	private const val COLD_PROCESSES = 15
	private const val QUICK_COLD_PROCESSES = 3

	/** How long one forked JVM may take before its sample is thrown away. */
	private const val COLD_CHILD_TIMEOUT_MS = 30_000L

	/** The child argument that says "print one cold sample and exit". */
	private const val COLD_CHILD_ARG = "--cold-sample"

	/** One child's printed sample. */
	private val COLD_SAMPLE_LINE =
		Regex("^cold-sample us=(?<us>[\\d.]+) bytes=(?<bytes>\\d+) (?<read>.+)$", RegexOption.MULTILINE)

	@JvmStatic
	fun main(args: Array<String>) {
		// A forked cold sample is a different program: one JVM, one bootstrap, one
		// printed number, no warmup and no report. See `measureColdBootstrap`.
		if (args.contains(COLD_CHILD_ARG)) {
			runColdSample()
			return
		}

		val quick = args.contains("--quick")
		val warmup = if (quick) 25 else WARMUP
		val iterations = if (quick) 200 else ITERATIONS
		val fixture = Fixture()

		println("c15t-core benchmarks")
		println("  jvm=" + System.getProperty("java.vm.version") + " cores=" + Runtime.getRuntime().availableProcessors())
		println("  warmup=$warmup measured=$iterations  medians in microseconds")

		var failed = 0

		failed += report(
			"hydrate from store",
			measure(warmup, iterations) {
				val envelope = requireNotNull(fixture.store().readEnvelope())
				PolicyEvaluator
					.evaluate(envelope.snapshot, envelope.evaluationPolicy, envelope.noticeDismissal, fixture.now)
					.effectivePermissions
					.experience
					.hashCode()
			},
			budgetMicros = 3_000,
			note = "envelope is " + fixture.envelopeJson.length + " bytes; contract budget is 3 ms",
		)

		failed += report(
			"policy evaluation",
			measure(warmup, iterations) {
				PolicyEvaluator
					.evaluate(fixture.snapshot, fixture.policy, fixture.dismissal, fixture.now)
					.effectivePermissions
					.marketing
					.hashCode()
			},
			budgetMicros = null,
			note = "no budget in the contract; guards against evaluation blow-up",
		)

		val kernel = fixture.kernel()
		failed += report(
			"snapshot() + 3 x isAllowed()",
			measure(warmup, iterations) {
				val snapshot = kernel.snapshot()
				val measurement = kernel.isAllowed(ConsentCategory.MEASUREMENT)
				val marketing = kernel.isAllowed(ConsentCategory.MARKETING)
				(snapshot.effectivePermissions.necessary.hashCode() + measurement.hashCode() + marketing.hashCode())
			},
			budgetMicros = 1,
			note = "contract: no allocation of a new snapshot per call (identity stable: " +
				(kernel.snapshot() === kernel.snapshot()) + ")",
		)

		val save = measure(warmup, iterations / 4) {
			if (kernel.save(CommitIntent.All).ok) 1 else 0
		}
		println()
		println("  save-acknowledge-without-network")
		println(save, "budget 50 ms")
		val saveMillis = save.medianMicros / 1_000.0
		if (saveMillis >= 50.0) {
			println("    FAIL: over the 50 ms contract budget")
			failed += 1
		} else {
			println("    ok")
		}

		// The contract's cold ceiling is about a process that has never seen the
		// kernel, and no loop inside this JVM can answer it. The JIT compiles
		// bootstrap() after a handful of calls and the kernel's classes load once, so a
		// median taken here would print a warm span under a cold label. Each sample is
		// instead one fresh JVM that bootstraps exactly once, which is how the
		// JavaScript cold-start row reaches the same honesty with one fresh process per
		// sample.
		//
		// What the row therefore contains: the contract's own span, bootstrap() to the
		// first synchronous snapshot(), plus every class that span pulls in for the
		// first time, which is the cost the 15 ms exists to pay for. What it leaves out,
		// on this side and the Swift side alike: starting the process and the runtime,
		// and the host's own launch hooks. Neither number is an app-launch number.
		val cold = measureColdBootstrap(if (quick) QUICK_COLD_PROCESSES else COLD_PROCESSES)
		val coldSample = cold.sample
		if (coldSample == null) {
			// Deliberately not the label the harness scans for: a JVM that could not
			// fork has to leave the row not-measured with a reason, never a fast number.
			println()
			println("  bootstrap() to first snapshot(), cold (not measured)")
			println("    " + cold.unavailable)
		} else {
			failed += report(
				"bootstrap() to first snapshot(), cold",
				coldSample,
				budgetMicros = 15_000,
				note = cold.note,
			)
			println("    first snapshot after a cold bootstrap: " + cold.firstRead)
		}

		println()
		if (failed > 0) {
			println("BENCHMARK FAILURE: $failed budget(s) exceeded")
			System.exit(1)
		}
		println("all measured budgets met")
	}

	private class Fixture {
		val now = 1_758_000_000_000L

		val policy = EvaluationPolicy(
			id = "eu-standard",
			model = ConsentModel.OPT_IN,
			prompt = PolicyPrompt.CHOICE,
			scope = ConsentCategory.OPTIONAL,
			scopeMode = ScopeMode.PERMISSIVE,
			choiceMs = 334L * 24 * 60 * 60 * 1000,
			noticeMs = 180L * 24 * 60 * 60 * 1000,
			gpcDenyCategories = listOf(ConsentCategory.MARKETING, ConsentCategory.MEASUREMENT),
			choiceFingerprint = "choice-fp-bench",
			policyFingerprint = "policy-fp-bench",
		)

		val dismissal = NoticeDismissal(dismissedAt = now - 86_400_000L, fingerprint = "choice-fp-bench")

		/** The size and shape a warm install actually carries. */
		val snapshot: ConsentSnapshot = ConsentSnapshot(
			revision = 41,
			policyPending = false,
			ready = true,
			model = ConsentModel.OPT_IN,
			activeUI = ActiveUI.NONE,
			effectivePermissions = ConsentState(
				necessary = true,
				functionality = true,
				experience = true,
				measurement = false,
				marketing = false,
			),
			explicitChoice = ExplicitChoice(
				consents = ConsentCategory.OPTIONAL.associate { it.wireName to (it != ConsentCategory.MARKETING) },
				action = ConsentAction.CUSTOM,
				actionAt = now - 30L * 24 * 60 * 60 * 1000,
				fingerprint = "choice-fp-bench",
			),
			consentCategories = ConsentCategory.entries.map { it.wireName },
			restrictions = mapOf("marketing" to listOf("gpc")),
			resolution = PolicyResolution(
				status = PolicyResolution.STATUS_MATCHED,
				policyId = "eu-standard",
				fingerprint = "policy-fp-bench",
			),
			policySnapshotToken = "snap-bench".padEnd(64, 'x'),
			subject = ConsentSubject(id = "3f1b8a3f-3f2c-4a11-9a7a-6d5c4b3a2109", externalId = "user-12345"),
			location = ConsentLocation(country = "DE", region = "BE", language = "de"),
			overrides = KernelOverrides(language = "de"),
			privacySignals = PrivacySignals(
				gpc = GpcSignal.derive(override = null, detected = true),
			),
			translations = translations(),
			evaluatedAt = now - 60_000L,
		)

		val envelopeJson: String = C15tJson.storage.encodeToString(
			SnapshotEnvelope.serializer(),
			SnapshotEnvelope(snapshot = snapshot, evaluationPolicy = policy, noticeDismissal = dismissal),
		)

		/** A store holding one realistic envelope, as a warm install would. */
		fun store(): C15tStore = C15tStore(
			InMemoryStore(
				mapOf(
					C15tStoreKeys.SNAPSHOT to envelopeJson,
					C15tStoreKeys.SUBJECT to """{"id":"3f1b8a3f-3f2c-4a11-9a7a-6d5c4b3a2109"}""",
				),
			),
		)

		fun kernel(): C15tKernel = C15tKernel(
			config = NativeConfig(portalUrl = "https://bench.c15t.app"),
			store = store(),
			clock = Clock { now },
			// Nothing here reaches a socket: the point is the local commit path.
			transport = UnreachableTransport,
			executor = TaskExecutor.DIRECT,
		).apply { bootstrap() }

		/**
		 * A kernel for the cold span: a store this process has never opened, and an
		 * executor that runs nothing.
		 *
		 * `TaskExecutor.DIRECT` would run the queue flush and init on the calling
		 * thread, and no real launch does that; the Swift cold measure switches init
		 * retry off for the same reason. Dropping what `bootstrap()` schedules keeps the
		 * span to the work the launching thread actually waits on.
		 *
		 * The fixture is built before this returns, so the envelope is already encoded
		 * by the time the span starts. The Swift bench does the same thing when it seeds
		 * a store ahead of its cold measure, which keeps the two spans symmetrical:
		 * encode warm on both sides, decode cold on both sides.
		 */
		fun coldKernel(): C15tKernel = C15tKernel(
			config = NativeConfig(portalUrl = "https://bench.c15t.app"),
			store = store(),
			clock = Clock { now },
			// Nothing here reaches a socket either way; init is dropped, not awaited.
			transport = UnreachableTransport,
			executor = TaskExecutor { _ -> },
		)

		/** A translation bundle the size a real `/init` answer carries. */
		private fun translations(): JsonObject = buildJsonObject {
			repeat(40) { index ->
				put(
					"banner$index",
					buildJsonObject {
						put("title", JsonPrimitive("Zustimmung zur Verarbeitung Ihrer Daten"))
						put("description", JsonPrimitive("Wir verwenden Cookies fuer Analyse, Personalisierung und Werbung."))
						put(
							"actions",
							buildJsonArray {
								add(JsonPrimitive("accept"))
								add(JsonPrimitive("reject"))
								add(JsonPrimitive("customize"))
							},
						)
					},
				)
			}
		}
	}

	private object UnreachableTransport : C15tTransport {
		override fun init(context: InitContext): TransportOutcome = TransportOutcome.NetworkFailure("bench: no network")

		override fun save(entry: QueuedSave): SaveOutcome = SaveOutcome.Unavailable("bench: no network")

		override fun identify(
			subject: ConsentSubject,
			user: KernelUser,
		): TransportOutcome = TransportOutcome.NetworkFailure("bench: no network")
	}

	private class Sample(
		val medianMicros: Double,
		val p95Micros: Double,
		val minMicros: Double,
		/** Samples behind the spread, printed only when it is not the loop's count. */
		val count: Int = 0,
	)

	/** Accumulated so the JIT cannot delete the measured work. */
	private var sink = 0L

	private fun measure(
		warmup: Int,
		iterations: Int,
		block: () -> Int,
	): Sample {
		repeat(warmup) { sink += block().toLong() }
		val samples = LongArray(iterations)
		for (index in 0 until iterations) {
			val start = System.nanoTime()
			sink += block().toLong()
			samples[index] = System.nanoTime() - start
		}
		samples.sort()
		return Sample(
			medianMicros = samples[samples.size / 2] / 1_000.0,
			p95Micros = samples[((samples.size * 95) / 100).coerceAtMost(samples.size - 1)] / 1_000.0,
			minMicros = samples.first() / 1_000.0,
		)
	}

	private fun println(
		sample: Sample,
		note: String,
	) {
		val counted = if (sample.count > 0) "n=" + sample.count + "  " else ""
		println(
			"    " + counted + "median=" + format(sample.medianMicros) + " us  p95=" +
				format(sample.p95Micros) + " us  min=" + format(sample.minMicros) +
				" us  (" + note + ")",
		)
	}

	private fun report(
		name: String,
		sample: Sample,
		budgetMicros: Long?,
		note: String,
	): Int {
		println()
		println("  $name")
		println(sample, note)
		if (budgetMicros == null) {
			return 0
		}
		return if (sample.medianMicros > budgetMicros) {
			println("    FAIL: median over the " + budgetMicros + " us budget")
			1
		} else {
			println("    ok")
			0
		}
	}

	/**
	 * One cold sample: a JVM that has never seen the kernel, doing one bootstrap.
	 *
	 * The parent forks one of these per sample and reads the single line it prints.
	 * The span is the contract's own, `bootstrap()` to the first synchronous
	 * `snapshot()`, over a store that already holds a realistic envelope, which is what
	 * a returning user's launch actually hydrates.
	 *
	 * A first read that did not come back hydrated exits non-zero instead of printing a
	 * sample: cold work measured over a deny-all snapshot is not the work the budget
	 * covers, and the parent throws the sample away.
	 */
	private fun runColdSample() {
		val fixture = Fixture()
		// Allocating the kernel sits outside the span, the way Swift allocates
		// `ConsentCore()` outside its cold measure. Everything the hydration itself
		// pulls in still lands inside it, which is the whole point of the fresh JVM.
		val kernel = fixture.coldKernel()
		val started = System.nanoTime()
		kernel.bootstrap()
		val snapshot = kernel.snapshot()
		val micros = (System.nanoTime() - started) / 1_000.0

		if (!snapshot.ready || snapshot.effectivePermissions.marketing) {
			println(
				"cold-sample rejected ready=" + snapshot.ready +
					" policyPending=" + snapshot.policyPending +
					" marketing=" + snapshot.effectivePermissions.marketing,
			)
			System.exit(1)
		}

		println(
			"cold-sample us=" + format(micros) +
				" bytes=" + fixture.envelopeJson.length +
				" ready=" + snapshot.ready +
				" policyPending=" + snapshot.policyPending +
				" marketing=" + snapshot.effectivePermissions.marketing,
		)
	}

	/**
	 * Run [processes] fresh JVMs, each cold-sampling once, and take the spread.
	 *
	 * @param processes - Fresh JVMs to spend on samples.
	 * @returns The spread and the fixture detail, or `unavailable` with the reason this
	 * machine cannot fork a JVM at all.
	 */
	private fun measureColdBootstrap(
		processes: Int,
	): ColdRun {
		val javaBinary = javaBinaryPath()
			?: return ColdRun(unavailable = "java.home does not name a runnable java binary")
		val classpath = System.getProperty("java.class.path").orEmpty()
		if (classpath.isBlank()) {
			return ColdRun(unavailable = "java.class.path is empty, so a forked JVM has no bench classpath")
		}

		val samples = mutableListOf<Double>()
		var envelopeBytes = 0
		var firstRead = ""
		var unusable = 0

		repeat(processes) {
			val process = try {
				ProcessBuilder(
					listOf(
						javaBinary,
						// The same single collector the Gradle task runs this bench under.
						"-XX:+UseSerialGC",
						"-cp",
						classpath,
						Bench::class.java.name,
						COLD_CHILD_ARG,
					),
				).redirectErrorStream(true).start()
			} catch (error: IOException) {
				null
			}
			if (process == null) {
				unusable += 1
				return@repeat
			}

			// The child writes one short line, so the pipe cannot fill and a child can
			// exit without the parent having read anything yet. That is what makes it
			// safe to bound the wait here rather than race the reader against it.
			val finished = process.waitFor(COLD_CHILD_TIMEOUT_MS, TimeUnit.MILLISECONDS)
			if (!finished) {
				process.destroyForcibly()
				unusable += 1
				return@repeat
			}
			val output = try {
				process.inputStream.bufferedReader().use { reader -> reader.readText() }
			} catch (error: IOException) {
				""
			}

			val match = COLD_SAMPLE_LINE.find(output)
			val micros = match?.groups?.get("us")?.value?.toDoubleOrNull()
			if (process.exitValue() != 0 || match == null || micros == null || micros <= 0.0) {
				unusable += 1
				return@repeat
			}

			samples += micros
			if (firstRead.isEmpty()) {
				envelopeBytes = match.groups["bytes"]?.value?.toIntOrNull() ?: 0
				firstRead = match.groups["read"]?.value.orEmpty()
			}
		}

		if (samples.isEmpty()) {
			return ColdRun(unavailable = "none of the $processes forked JVMs produced a cold sample")
		}

		return ColdRun(
			envelopeBytes = envelopeBytes,
			firstRead = firstRead,
			note = coldNote(samples.size, processes, unusable, envelopeBytes),
			sample = summarize(samples),
		)
	}

	/** The detail line the harness reads the envelope size out of. */
	private fun coldNote(
		measured: Int,
		asked: Int,
		unusable: Int,
		envelopeBytes: Int,
	): String {
		val missing = if (unusable > 0) "; $unusable of $asked JVMs produced nothing" else ""
		return "median of $measured fresh JVMs, one bootstrap each$missing; " +
			"envelope is $envelopeBytes bytes; contract budget is 15 ms"
	}

	/** The JVM this bench runs under, as a path a fresh process can start from. */
	private fun javaBinaryPath(): String? {
		val home = System.getProperty("java.home") ?: return null
		val name = if (System.getProperty("os.name").orEmpty().lowercase().contains("windows")) {
			"java.exe"
		} else {
			"java"
		}
		val binary = File(home, "bin" + File.separator + name)
		return if (binary.canExecute()) binary.absolutePath else null
	}

	/**
	 * The three statistics [measure] takes, over samples already in microseconds.
	 *
	 * The cold samples arrive one per process rather than out of a loop, so they cannot
	 * come from [measure]. The arithmetic lives here in one place so the two spreads
	 * stay the same kind of number.
	 */
	private fun summarize(values: List<Double>): Sample {
		val sorted = values.sorted()
		return Sample(
			medianMicros = sorted[sorted.size / 2],
			minMicros = sorted.first(),
			p95Micros = sorted[((sorted.size * 95) / 100).coerceAtMost(sorted.size - 1)],
			count = sorted.size,
		)
	}

	/** What the forked cold samples produced. */
	private class ColdRun(
		/** Set exactly when [sample] is not, and only ever as the reason. */
		val unavailable: String? = null,
		val sample: Sample? = null,
		val envelopeBytes: Int = 0,
		val firstRead: String = "",
		val note: String = "",
	)

	private fun format(micros: Double): String {
		val scaled = micros * 100
		val rounded = (if (scaled >= 0) scaled + 0.5 else scaled - 0.5).toLong()
		return (rounded / 100).toString() + "." + (Math.abs(rounded % 100)).toString().padStart(2, '0')
	}

	private class InMemoryStore(seed: Map<String, String>) : KeyValueStore {
		private val data = LinkedHashMap(seed)

		override fun read(key: String): String? = data[key]

		override fun write(
			key: String,
			value: String?,
		) {
			if (value == null) {
				data.remove(key)
			} else {
				data[key] = value
			}
		}
	}
}
