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
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject

/**
 * Measured numbers for the budgets in `native/CONTRACT.md`, so the report is
 * figures rather than claims.
 *
 * Run with `./gradlew :c15t-core:bench`. Each line is a median over measured
 * iterations after a warmup, on the calling JVM. Every budget the contract names is
 * asserted, so a regression fails the task instead of drifting quietly.
 */
object Bench {
	private const val WARMUP = 500
	private const val ITERATIONS = 3_000

	@JvmStatic
	fun main(args: Array<String>) {
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
			privacySignals = PrivacySignals(gpc = true),
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

	private class Sample(val medianMicros: Double, val p95Micros: Double, val minMicros: Double)

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
		println(
			"    median=" + format(sample.medianMicros) + " us  p95=" + format(sample.p95Micros) +
				" us  min=" + format(sample.minMicros) + " us  (" + note + ")",
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
