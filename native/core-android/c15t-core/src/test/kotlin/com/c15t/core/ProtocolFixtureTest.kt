package com.c15t.core

import com.c15t.core.model.ConsentAction
import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.ConsentSubject
import com.c15t.core.model.ExplicitChoice
import com.c15t.core.model.KernelOverrides
import com.c15t.core.model.PrivacySignals
import com.c15t.core.policy.NoticeDismissal
import com.c15t.core.spi.HttpRequest
import com.c15t.core.spi.HttpResponse
import com.c15t.core.spi.TaskExecutor
import com.c15t.core.store.C15tJson
import com.c15t.core.store.C15tStore
import com.c15t.core.store.C15tStoreKeys
import com.c15t.core.store.SnapshotEnvelope
import com.c15t.core.transport.C15tProtocol
import com.c15t.core.transport.C15tTransport
import com.c15t.core.transport.HostedTransport
import com.c15t.core.transport.SaveOutcome
import com.c15t.core.transport.TransportOutcome
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import kotlinx.serialization.json.longOrNull
import kotlinx.serialization.json.put
import java.io.File
import java.security.MessageDigest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.fail

/**
 * Runs every fixture in `native/protocol/index.json` against [C15tKernel].
 *
 * The TypeScript kernel produced these files, so a difference here is Kotlin and
 * JavaScript reading the same input differently, and `native/CONTRACT.md` rule 4
 * settles that in the kernel's favour. Two rules keep the suite honest:
 *
 * - Nothing is enumerated by name. `index.json` decides what runs, and a fixture
 *   file the index has forgotten fails, so a runner cannot quietly shrink.
 * - Every accepted difference is a row in [LEDGER] with the reason and the task
 *   that owns the fix. A difference that is not listed fails, and a ledger row that
 *   no longer reproduces fails too. Silence is not a pass.
 *
 * The fixture [input][readFixture] is what a client is handed, so it goes in the
 * way a client gets it: the `/init` response through an HTTP double, the records
 * through the store, the signals through [NativeConfig]. Kotlin's stored envelope
 * and receipt shapes differ from the wire ones, and translating them is the
 * runner's job; the assertions run only against `expected`.
 */
class ProtocolFixtureTest {
	private val json = Json { ignoreUnknownKeys = true; explicitNulls = true }

	/** Observed differences, accumulated per fixture and judged once per index. */
	private val recorded = LinkedHashMap<String, MutableList<Diff>>()

	@Test
	fun `index describes the whole directory and this build`() {
		val directory = fixtureDirectory()
		val index = readIndex(directory)
		assertEquals(index["count"]!!.jsonPrimitive.intOrNull, index.fixtures.size, "index.json counts its own entries wrong")
		val indexProtocol = index["protocolVersion"]!!.jsonPrimitive.long
		// Kotlin carries no protocol constant of its own yet; the fixtures and this
		// build must agree on one number, so it is pinned here until the core has one.
		assertEquals(1L, indexProtocol, "index.json is protocol $indexProtocol and this build was written against 1")
		val header = index["policyContractHeader"]!!.jsonObject
		assertEquals(C15tProtocol.POLICY_CONTRACT_HEADER, header["name"]!!.jsonPrimitive.content, "the fixtures declare a different contract header than this build sends")
		assertEquals(
			C15tProtocol.POLICY_CONTRACT_VERSION.toString(),
			header["value"]!!.jsonPrimitive.content,
			"the fixtures pin policy contract ${header["value"]} and this build sends ${C15tProtocol.POLICY_CONTRACT_VERSION}",
		)
		val listed = index.fixtures.map { it["file"]!!.jsonPrimitive.content }.toSet()
		listed.forEach { file ->
			assertTrue(File(directory, file).isFile, "index.json lists $file, which is not on disk")
		}
		val unlisted = directory.listFiles()
			.orEmpty()
			.filter { it.name.endsWith(".json") && it.name != INDEX_FILE }
			.map { it.name }
			.filterNot { listed.contains(it) }
			.sorted()
		assertTrue(
			unlisted.isEmpty(),
			"native/protocol holds ${unlisted}, which index.json does not list. A runner that globs would skip them silently: regenerate.",
		)
	}

	@Test
	fun `every fixture matches the kernel`() {
		recorded.clear()
		val directory = fixtureDirectory()
		val index = readIndex(directory)
		val ran = mutableListOf<String>()
		for (entry in index.fixtures) {
			when (entry["kind"]!!.jsonPrimitive.content) {
				"evaluation" -> {
					runEvaluation(directory, entry)
					ran += entry["id"]!!.jsonPrimitive.content
				}

				"save-body" -> {
					runSaveBody(directory, entry)
					ran += entry["id"]!!.jsonPrimitive.content
				}

				"revision-trace" -> {
					runRevisionTrace(directory, entry)
					ran += entry["id"]!!.jsonPrimitive.content
				}

				"native-envelope" -> {
					runNativeEnvelope(directory, entry)
					ran += entry["id"]!!.jsonPrimitive.content
				}

				else -> fail("${entry["id"]}: kind ${entry["kind"]} has no runner here. Add one instead of skipping it.")
			}
		}
		// The count comes from the kinds this file claims rather than from a list of
		// excuses, so it is zero by construction and stays zero only while every kind in
		// the index has a branch above.
		val unclaimed = index.fixtures
			.filterNot { CLAIMED_KINDS.contains(it["kind"]!!.jsonPrimitive.content) }
			.map { it["id"]!!.jsonPrimitive.content }
		println(
			buildString {
				append("Protocol fixtures: ran ${ran.size} of ${index.fixtures.size} from $INDEX_FILE; ${unclaimed.size} unclaimed")
				if (unclaimed.isNotEmpty()) {
					append(" (${unclaimed.joinToString(", ")})")
				}
			},
		)
		ran.forEach { println("  ran $it") }
		assertEquals(index.fixtures.size, ran.size + unclaimed.size, "the runner accounted for fewer fixtures than the index lists")
		assertTrue(
			unclaimed.isEmpty(),
			"$INDEX_FILE holds ${unclaimed.joinToString(", ")}, which no runner here claims. " +
				"A fixture nobody runs is a fixture that cannot fail.",
		)
		judge(index)
	}

	// -- per-kind runners -----------------------------------------------------

	private fun runEvaluation(directory: File, entry: JsonObject) {
		val fixture = readFixture(directory, entry)
		val fixtureInput = fixture["input"]?.jsonObject ?: fail("${id(entry)}: no input")
		val run = makeRun(entry, fixtureInput)
		run.kernel.bootstrap()
		val expected = fixture["expected"]?.jsonObject?.get("snapshot") ?: fail("${id(entry)}: no expected.snapshot")
		record(id(entry), "expected.snapshot", expected, C15tJson.storage.encodeToJsonElement(ConsentSnapshot.serializer(), run.kernel.snapshot()))
	}

	private fun runSaveBody(directory: File, entry: JsonObject) {
		val fixture = readFixture(directory, entry)
		val fixtureInput = fixture["input"]?.jsonObject ?: fail("${id(entry)}: no input")
		val expected = fixture["expected"]?.jsonObject ?: fail("${id(entry)}: no expected")
		val run = makeRun(entry, fixtureInput)
		run.kernel.bootstrap()
		record(
			id(entry),
			"expected.snapshotBefore",
			expected["snapshotBefore"] ?: fail("${id(entry)}: no snapshotBefore"),
			C15tJson.storage.encodeToJsonElement(ConsentSnapshot.serializer(), run.kernel.snapshot()),
		)

		val intent = commitIntent(entry, fixtureInput["intent"]?.jsonObject ?: fail("${id(entry)}: no intent"))
		run.kernel.save(intent)

		record(
			id(entry),
			"expected.snapshotAfter",
			expected["snapshotAfter"] ?: fail("${id(entry)}: no snapshotAfter"),
			C15tJson.storage.encodeToJsonElement(ConsentSnapshot.serializer(), run.kernel.snapshot()),
		)

		val request = run.http.requests.lastOrNull { it.method == "POST" }
			?: fail("${id(entry)}: the core sent no POST /subjects request")
		val body = json.parseToJsonElement(request.body ?: fail("${id(entry)}: the save request carried no JSON body"))
		val actual = buildJsonObject {
			put("body", body)
			put(
				"headers",
				buildJsonObject {
					request.headers.forEach { (name, value) -> put(name, value) }
				},
			)
			put("method", request.method)
			put("path", java.net.URI(request.url).rawPath)
		}
		// `x-c15t-version` is platform telemetry, and the contract says the fixtures
		// deliberately leave it unpinned, so extra header keys are not a difference.
		record(
			id(entry),
			"expected.request",
			expected["request"] ?: fail("${id(entry)}: no request"),
			actual,
			extraFieldsAllowedUnder = setOf("expected.request.headers"),
		)
	}

	/**
	 * Replay a mutation sequence and compare the revision trace it leaves.
	 *
	 * Two numbers per step, from two independent observations of the core: how much
	 * the revision moved, and how many times the snapshot observers were woken. The
	 * second is the half a revision cannot prove. A core that bumps the counter and
	 * never tells the observers has produced exactly the trace the kernel produced
	 * while the React Native pump -- which reads `onChange`, not the event hub --
	 * never hears that anything changed. `native/CONTRACT.md` calls that pair
	 * "Revisions and error writes", and this fixture is what enforces it on both
	 * cores, which is why it lives here rather than in a per-core unit test.
	 *
	 * The observer attaches after bootstrap has settled, because hydration and
	 * bootstrap are mutations in some cores and not in others. That is also why the
	 * fixture pins deltas and not absolute revisions.
	 */
	private fun runRevisionTrace(directory: File, entry: JsonObject) {
		val fixtureId = id(entry)
		val fixture = readFixture(directory, entry)
		val fixtureInput = fixture["input"]?.jsonObject ?: fail("$fixtureId: no input")
		val steps = fixtureInput["steps"]?.jsonArray ?: fail("$fixtureId: no input.steps")
		val expected = fixture["expected"]?.jsonObject?.get("trace")?.jsonArray
			?: fail("$fixtureId: no expected.trace")
		val run = makeRun(entry, fixtureInput)
		run.kernel.bootstrap()

		var publications = 0
		// The core holds snapshot observers weakly, so the lambda needs an owner for
		// as long as the trace runs.
		val observer: (ConsentSnapshot) -> Unit = { publications += 1 }
		val subscription = run.kernel.onChange(observer)
		var scriptedInits = 1
		val observed = steps.map { element ->
			val step = element.jsonObject
			val name = step["step"]?.jsonPrimitive?.contentOrNull ?: fail("$fixtureId: a step has no name")
			val before = run.kernel.snapshot().revision
			publications = 0
			when (step["op"]?.jsonPrimitive?.content) {
				"init" -> {
					val transport = step["transport"]?.jsonObject
						?: fail("$fixtureId: step $name is an init with no transport")
					run.initScript += initResponseOf(fixtureId, transport)
					scriptedInits += 1
					run.kernel.refresh()
				}

				"save" -> run.kernel.save(
					commitIntent(entry, step["intent"]?.jsonObject ?: fail("$fixtureId: step $name has no intent"))
				)

				"dismiss-notice" -> run.kernel.dismissNotice()

				else -> fail("$fixtureId: step $name has op ${step["op"]}, which has no runner here")
			}
			buildJsonObject {
				put("publications", publications)
				put("revisionDelta", run.kernel.snapshot().revision - before)
				put("step", name)
			}
		}
		subscription.close()

		// A step whose init never arrived would still score whatever the previous
		// response left behind, so the script and the requests have to line up.
		assertEquals(
			scriptedInits,
			run.http.requests.count { it.method == "GET" },
			"$fixtureId: the core made ${run.http.requests.count { it.method == "GET" }} init requests for a script of $scriptedInits",
		)
		record(fixtureId, "expected.trace", JsonArray(expected), JsonArray(observed))
	}

	/**
	 * Turn a fixture `transport` into the response the HTTP double serves.
	 *
	 * Status and headers pass through untouched, because the contract declaration is
	 * the thing under test in the revision trace: a body served under a contract this
	 * build does not speak is not evidence, and a runner that normalised the header
	 * away would hide that.
	 */
	private fun initResponseOf(fixtureId: String, transport: JsonObject): HttpResponse {
		val status = transport["status"]?.jsonPrimitive?.intOrNull ?: 200
		check(status == 200) { "$fixtureId: a non-200 init needs a scripted failure path, which no fixture exercises" }
		val headers = transport["headers"]?.jsonObject
			?.mapValues { (name, value) ->
				value.jsonPrimitive.contentOrNull ?: fail("$fixtureId: transport.headers.$name is not a string")
			}
			?: emptyMap()
		val body = transport["body"]?.toString() ?: fail("$fixtureId: transport.body is missing")
		return HttpResponse(status, headers, body)
	}

	// -- running one fixture --------------------------------------------------

	/**
	 * A core wired to a fixture, plus the `/init` responses its transport still owes.
	 *
	 * The single-step fixtures script one response and the core asks once. A revision
	 * trace adds one per init step, and an ask with nothing left scripted is a
	 * failure rather than a silent repeat: a step that never reached the transport
	 * would score a publication the core did not earn.
	 */
	private class Run(
		val kernel: C15tKernel,
		val http: RecordingHttpClient,
		val initScript: ArrayDeque<HttpResponse>,
		/** The slot the core persists to, so a fixture can read the bytes it wrote. */
		val backend: InMemoryKeyValueStore,
		val store: C15tStore,
	)

	/**
	 * Wire a core to exactly the fixture input.
	 *
	 * The init response enters at the HTTP seam with its status and headers, so the
	 * contract negotiation is part of the run rather than assumed. Anything the
	 * input carries that this build cannot express raises instead of being dropped.
	 */
	private fun makeRun(entry: JsonObject, input: JsonObject): Run {
		val fixtureId = id(entry)
		val stored = input["storedRecords"]?.jsonObject ?: fail("$fixtureId: no storedRecords")
		val subjectId = stored["subject"]?.jsonObject?.get("subjectId")?.jsonPrimitive?.contentOrNull
			?: fail("$fixtureId: storedRecords.subject.subjectId is missing. A fixture that lets the core invent an identity is not deterministic.")

		val backend = InMemoryKeyValueStore()
		backend.putSilently(C15tStoreKeys.SUBJECT, C15tJson.storage.encodeToString(ConsentSubject.serializer(), ConsentSubject(id = subjectId)))

		val choice = stored["choice"]?.takeUnless { it is JsonNull }?.let { storedChoice(fixtureId, it) }
		val dismissal = stored["noticeDismissal"]?.takeUnless { it is JsonNull }?.let {
			// The fixture's stored records are the web document, which carries keys this
			// core does not model -- a dismissal there has a `version`. It arrives through
			// the lenient reader on purpose: the strict one belongs to bytes this build
			// wrote itself, and policing a hand-off from another platform would fail the
			// runner rather than the core.
			json.decodeFromString(NoticeDismissal.serializer(), it.toString())
		}
		// A stored receipt reaches a relaunch through the envelope's snapshot, which
		// is where this core keeps it. The policy wire stays out of the envelope on
		// purpose: the fixture serves the policy from the transport, as a launch does.
		val seeded = ConsentSnapshot(subject = ConsentSubject(id = subjectId), explicitChoice = choice)
		backend.putSilently(
			C15tStoreKeys.SNAPSHOT,
			C15tJson.storage.encodeToString(
				SnapshotEnvelope.serializer(),
				SnapshotEnvelope(snapshot = seeded, evaluationPolicy = null, noticeDismissal = dismissal),
			),
		)
		return wireRun(entry, input, backend, offline = false)
	}

	/**
	 * Wire a core to the fixture input over a store the caller already filled.
	 *
	 * [offline] is a phone in a tunnel: the transport answers nothing, so whatever a
	 * boot produces can only have come out of the store. That is the only arrangement
	 * that proves an envelope carries enough to decide on its own. The HTTP double
	 * fails a request rather than serving the scripted `/init`, because a relaunch that
	 * quietly reached the backend would pass while testing nothing.
	 */
	private fun wireRun(
		entry: JsonObject,
		input: JsonObject,
		backend: InMemoryKeyValueStore,
		offline: Boolean,
	): Run {
		val fixtureId = id(entry)
		val now = input["now"]?.jsonPrimitive?.longOrNull ?: fail("$fixtureId: input.now is missing")
		val overrides = input["overrides"]?.jsonObject ?: fail("$fixtureId: no overrides")
		// The fixture states the two GPC facts separately and they are not the same
		// fact: `overrides.gpc` is what the app pinned, and
		// `privacySignals.gpc.detected` is what the device reported. Feeding one as
		// the other is what a boolean pair allowed.
		val deviceDetection = input["privacySignals"]?.jsonObject?.get("gpc")?.jsonObject?.get("detected")?.jsonPrimitive?.booleanOrNull
			?: fail("$fixtureId: privacySignals.gpc.detected is missing")
		val config = NativeConfig(
			portalUrl = "https://backend.example.com",
			domain = input["domain"]?.jsonPrimitive?.contentOrNull ?: "app.example.com",
			overrides = KernelOverrides(
				country = overrides["country"]?.jsonPrimitive?.contentOrNull,
				region = overrides["region"]?.jsonPrimitive?.contentOrNull,
				language = overrides["language"]?.jsonPrimitive?.contentOrNull,
				gpc = overrides["gpc"]?.jsonPrimitive?.booleanOrNull,
			),
			detectedGpc = deviceDetection,
		)

		val initScript = ArrayDeque<HttpResponse>()
		val http = if (offline) {
			RecordingHttpClient { request ->
				fail("$fixtureId: the core sent ${request.method} with no backend scripted. The envelope has to answer on its own.")
			}
		} else {
			val transport = input["transport"]?.jsonObject ?: fail("$fixtureId: no transport")
			initScript += initResponseOf(fixtureId, transport)
			RecordingHttpClient { request ->
				when (request.method) {
					"GET" -> initScript.removeFirstOrNull()
						?: fail("$fixtureId: the core asked for /init with nothing left scripted")

					else -> HttpResponse(200, emptyMap(), "{}")
				}
			}
		}
		val clock = FixedClock(now)
		val store = C15tStore(backend)
		val kernel = C15tKernel(
			config = config,
			store = store,
			clock = clock,
			// The real transport, so the assertion covers headers and the built body
			// and not a double's idea of them.
			transport = if (offline) C15tTransport.NONE else HostedTransport(http = http, config = config, clock = clock),
			executor = TaskExecutor.DIRECT,
		)
		return Run(kernel = kernel, http = http, initScript = initScript, backend = backend, store = store)
	}

	/**
	 * Translate a kernel receipt map into this core's [ExplicitChoice].
	 *
	 * `storedRecords` is what the web SDK keeps, and neither native core stores it in
	 * that shape: this core keeps receipts inside the envelope's snapshot. So the
	 * runner converts on the way in. Every receipt in a fixture shares one confirmation
	 * time and one basis fingerprint, which is what this shape can hold.
	 */
	private fun storedChoice(fixtureId: String, element: JsonElement): ExplicitChoice {
		val categories = element.jsonObject["categories"]?.jsonObject ?: fail("$fixtureId: storedRecords.choice has no categories")
		val consents = LinkedHashMap<String, Boolean>()
		var actionAt: Long? = null
		var fingerprint: String? = null
		for ((name, decision) in categories) {
			consents[name] = decision.jsonObject["value"]?.jsonPrimitive?.boolean ?: true
			val at = decision.jsonObject["confirmedAt"]?.jsonPrimitive?.longOrNull
			if (at != null) {
				actionAt = at
			}
			fingerprint = decision.jsonObject["basis"]?.jsonObject?.get("fingerprint")?.jsonPrimitive?.contentOrNull ?: fingerprint
		}
		val grants = consents.values.count { it }
		return ExplicitChoice(
			consents = consents,
			action = when {
				consents.isNotEmpty() && grants == consents.size -> ConsentAction.ALL
				grants == 0 -> ConsentAction.NECESSARY
				else -> ConsentAction.CUSTOM
			},
			actionAt = actionAt ?: fail("$fixtureId: stored receipts carry no confirmedAt"),
			fingerprint = fingerprint,
		)
	}

	private fun commitIntent(entry: JsonObject, intent: JsonObject): CommitIntent =
		when (intent["action"]?.jsonPrimitive?.content) {
			"all" -> CommitIntent.All
			"necessary" -> CommitIntent.Necessary
			"explicit" -> {
				val consents = LinkedHashMap<ConsentCategory, Boolean>()
				(intent["consents"]?.jsonObject ?: JsonObject(emptyMap())).forEach { (name, value) ->
					val category = ConsentCategory.OPTIONAL.firstOrNull { it.wireName == name }
						?: fail("${id(entry)}: intent.consents.$name is not an optional category")
					consents[category] = value.jsonPrimitive.boolean
				}
				CommitIntent.Explicit(consents)
			}

			else -> fail("${id(entry)}: intent.action ${intent["action"]} is unknown")
		}

	// -- stored envelopes -----------------------------------------------------

	/**
	 * Run a `native-envelope` fixture.
	 *
	 * Every case of this kind starts the same way: a core boots over the fixture input,
	 * takes the action, and writes its envelope. The bytes under test have to be the
	 * core's own, because a hand-written envelope would only prove that this runner and
	 * this core agree about a shape nothing is ever stored in.
	 *
	 * Then the two directions split. A write case reads its own bytes back and asks
	 * whether the envelope carries the fields the contract says it carries, and whether a
	 * relaunch that reaches no backend still answers from those bytes. A read case breaks
	 * them first and asks whether a relaunch answers the way an empty store does. Reading
	 * an envelope halfway would answer like a returning user, which is a permission
	 * invented out of garbage.
	 *
	 * Nothing here compares serialized bytes. Kotlin keeps two of these facts under
	 * different names than Swift and encrypts the blob it writes, so the fixture pins the
	 * field set and the values and names Swift as the layout reference.
	 */
	private fun runNativeEnvelope(
		directory: File,
		entry: JsonObject,
	) {
		val fixtureId = id(entry)
		val fixture = readFixture(directory, entry)
		val fixtureInput = fixture["input"]?.jsonObject ?: fail("$fixtureId: no input")
		val expected = fixture["expected"]?.jsonObject ?: fail("$fixtureId: no expected")
		val subjectId = fixtureInput["storedRecords"]?.jsonObject?.get("subject")?.jsonObject
			?.get("subjectId")?.jsonPrimitive?.contentOrNull
			?: fail("$fixtureId: storedRecords.subject.subjectId is missing")

		val run = makeRun(entry, fixtureInput)
		run.kernel.bootstrap()
		val action = fixtureInput["action"]?.takeUnless { it is JsonNull }?.jsonObject
		if (action != null) {
			if (action["action"]?.jsonPrimitive?.content == "dismiss-notice") {
				run.kernel.dismissNotice()
			} else {
				run.kernel.save(commitIntent(entry, action))
			}
		}

		val written = run.backend.read(C15tStoreKeys.SNAPSHOT)
		if (written == null) {
			record(fixtureId, "expected.write", "the core never wrote anything under ${C15tStoreKeys.SNAPSHOT}")
			return
		}

		// Reading back and writing again must be the identity on the core's own bytes.
		// Anything the round trip drops is a field the next launch never sees.
		val decoded = run.store.readEnvelope()
		if (decoded == null) {
			record(
				fixtureId,
				"expected.write.decoded",
				"the core wrote an envelope its own decoder refuses, so nothing about its contents can be checked",
			)
			return
		}
		val rewritten = C15tJson.storage.encodeToString(SnapshotEnvelope.serializer(), decoded)
		if (rewritten != written) {
			record(
				fixtureId,
				"expected.write.decoded",
				"decoding the envelope and storing it again turned ${written.length} characters into ${rewritten.length}; " +
					"the next relaunch loses whatever that rewrite dropped",
			)
		}

		recordEnvelopeFields(fixtureId, fixture, written)

		expected["snapshot"]?.let { want ->
			record(
				fixtureId,
				"expected.snapshot",
				want,
				C15tJson.storage.encodeToJsonElement(ConsentSnapshot.serializer(), decoded.snapshot),
			)
		}
		if (decoded.snapshot != run.kernel.snapshot()) {
			record(
				fixtureId,
				"expected.write.storedSnapshotMatchesLive",
				"the envelope holds revision ${decoded.snapshot.revision} while the session is on ${run.kernel.snapshot().revision}: " +
					"a cold start would answer with state the running core has already left behind",
			)
		}

		val defect = fixtureInput["defect"]?.takeUnless { it is JsonNull }?.jsonObject
		val bytes = defect?.let { defectiveBytes(fixtureId, it, written) } ?: written
		val cold = relaunch(entry, fixtureInput, subjectId, bytes)
		expected["relaunch"]?.jsonObject?.get("decision")?.let { want ->
			record(fixtureId, "expected.relaunch.decision", want, cold.decision)
		}

		val read = expected["read"]?.takeUnless { it is JsonNull }?.jsonObject ?: return
		// `stored: false` is `decoded: false` seen from the other side. A core that
		// refuses an envelope still persists the deny-all snapshot it settled on, so
		// whether the bytes decoded is the only observation that tells refusal from read.
		if (decodes(bytes)) {
			record(
				fixtureId,
				"expected.read.decoded",
				"the core decoded bytes the fixture says are unreadable, so whatever it restored came from a shape the contract does not have",
			)
		}
		val fresh = relaunch(entry, fixtureInput, subjectId, bytes = null)
		if (!matches(fresh.snapshot, cold.snapshot)) {
			record(
				fixtureId,
				"expected.read.identicalToFreshInstall",
				"unreadable bytes left the core answering something an empty store does not: " +
					describeDifference(fresh.snapshot, cold.snapshot),
			)
		}
	}

	/** A cold start over [bytes], plus what it answers. */
	private class Relaunch(
		val snapshot: JsonElement,
		/**
		 * What a gate on the device is told, category by category.
		 *
		 * Read through `isAllowed` rather than the snapshot's permission map, because that
		 * is the call an ad SDK actually makes and it is the stricter of the two while a
		 * policy is outstanding.
		 */
		val decision: JsonElement,
	)

	/**
	 * Boot a core over [bytes] with nothing on the other end of the transport.
	 *
	 * With no answer coming, the snapshot can only be the one the envelope supplied,
	 * which is the only thing an envelope is for. `bytes = null` is the same device with
	 * an empty store, and the two are supposed to be indistinguishable when the bytes are
	 * unreadable. The subject id gets seeded in both because it has its own slot: refusing
	 * an envelope must not cost a device its identity, and sharing one id is what makes
	 * the comparison about consent rather than about ids.
	 */
	private fun relaunch(
		entry: JsonObject,
		input: JsonObject,
		subjectId: String,
		bytes: String?,
	): Relaunch {
		val backend = InMemoryKeyValueStore()
		backend.putSilently(
			C15tStoreKeys.SUBJECT,
			C15tJson.storage.encodeToString(ConsentSubject.serializer(), ConsentSubject(id = subjectId)),
		)
		if (bytes != null) {
			backend.putSilently(C15tStoreKeys.SNAPSHOT, bytes)
		}
		val run = wireRun(entry, input, backend, offline = true)
		run.kernel.bootstrap()
		val snapshot = run.kernel.snapshot()
		return Relaunch(
			snapshot = C15tJson.storage.encodeToJsonElement(ConsentSnapshot.serializer(), snapshot),
			decision = buildJsonObject {
				put(
					"allowed",
					buildJsonObject {
						ConsentCategory.entries.forEach { category ->
							put(category.wireName, snapshot.isAllowed(category))
						}
					},
				)
				put("policyPending", snapshot.policyPending)
				put("ready", snapshot.ready)
			},
		)
	}

	/** Whether the core's own reader accepts [bytes] as an envelope. */
	private fun decodes(bytes: String): Boolean =
		C15tStore(InMemoryKeyValueStore(mapOf(C15tStoreKeys.SNAPSHOT to bytes))).readEnvelope() != null

	/**
	 * Check the stored field set against the field set the fixture declares.
	 *
	 * The names come from the fixture's `carriers` map rather than from literals here, so
	 * the shared file owns the field set and this runner contributes only the spelling
	 * this core happens to use. A field with no entry for this core is one it does not
	 * carry at all, which `native/CONTRACT.md` records as a difference between the two
	 * implementations rather than a defect.
	 *
	 * Values, not key presence: this core writes every key every time, so a key sitting
	 * there holding null proves nothing about whether the fact made it to disk.
	 */
	private fun recordEnvelopeFields(
		fixtureId: String,
		fixture: JsonObject,
		raw: String,
	) {
		val stored = json.parseToJsonElement(raw).jsonObject
		fixture["fields"]?.jsonArray?.forEach { element ->
			val field = element.jsonObject
			val key = field["key"]?.jsonPrimitive?.contentOrNull ?: return@forEach
			val name = field["carriers"]?.jsonObject?.get("kotlin")?.jsonPrimitive?.contentOrNull ?: return@forEach
			val expect = field["expect"] ?: return@forEach
			val path = "expected.fields.$key"
			val required = field["requiredBy"]?.jsonArray?.any { it.jsonPrimitive.content == "kotlin" } == true
			val value = stored[name]
			val wantsEmpty = expect is JsonPrimitive && expect.isString && expect.content == "empty"
			if (required && value == null && !wantsEmpty) {
				record(fixtureId, path, "the envelope carries no `$name` key, which the fixture says this core always writes")
				return@forEach
			}
			when {
				expect is JsonPrimitive && expect.isString && expect.content == "present" -> if (value == null || value is JsonNull) {
					record(fixtureId, path, "expected a `$name` the core actually filled in, and the envelope holds ${render(value)}")
				}

				wantsEmpty -> if (value != null && value !is JsonNull) {
					record(fixtureId, path, "expected `$name` to be absent or null, and the envelope holds ${render(value)}")
				}

				!matches(expect, value) -> record(
					fixtureId,
					path,
					"expected ${render(expect)}, and the envelope holds ${render(value)}",
				)
			}
		}
	}

	/**
	 * Break a valid envelope the way the named defect describes.
	 *
	 * The defects are operations rather than literal bytes because a base envelope is only
	 * valid for the core that wrote it, and that core is the one under test. Only
	 * `foreign-wire` ships bytes, and it ships someone else's.
	 */
	private fun defectiveBytes(
		fixtureId: String,
		defect: JsonObject,
		written: String,
	): String =
		when (defect["kind"]?.jsonPrimitive?.content) {
			"unknown-field" -> {
				val name = defect["addField"]?.jsonPrimitive?.contentOrNull
					?: fail("$fixtureId: an unknown-field defect names no field")
				val root = json.parseToJsonElement(written).jsonObject
				JsonObject(root.toMutableMap().apply { put(name, defect["value"] ?: JsonNull) }).toString()
			}

			// Everything from the last comma onwards is gone: a writer interrupted
			// halfway through its final field. What is left is a prefix of a real grant,
			// which is exactly the trap.
			"truncate" -> {
				val cut = written.lastIndexOf(',').takeIf { it > 0 }
					?: fail("$fixtureId: the envelope this core wrote holds no comma, so there is no write to cut short here")
				written.substring(0, cut)
			}

			// The same facts in the shape the first draft of `native/CONTRACT.md`
			// described: `test` as an override, and `gpc`/`msa` as a boolean pair.
			"pre-correction" -> {
				val root = json.parseToJsonElement(written).jsonObject
				val snapshot = root["snapshot"]?.jsonObject
					?: fail("$fixtureId: the envelope this core wrote holds no snapshot object")
				val overrides = snapshot["overrides"]?.jsonObject ?: JsonObject(emptyMap())
				val active = snapshot["privacySignals"]?.jsonObject?.get("gpc")?.jsonObject?.get("active")
				JsonObject(
					root.toMutableMap().apply {
						put(
							"snapshot",
							buildJsonObject {
								snapshot.forEach { (name, value) ->
									if (name != "overrides" && name != "privacySignals") {
										put(name, value)
									}
								}
								put(
									"overrides",
									buildJsonObject {
										put("country", overrides["country"] ?: JsonNull)
										put("gpc", overrides["gpc"] ?: JsonNull)
										put("language", overrides["language"] ?: JsonPrimitive("en"))
										put("region", overrides["region"] ?: JsonNull)
										put("test", JsonPrimitive(false))
									},
								)
								put(
									"privacySignals",
									buildJsonObject {
										put("gpc", active ?: JsonPrimitive(false))
										put("msa", JsonPrimitive(false))
									},
								)
							},
						)
					},
				).toString()
			}

			"foreign-wire" -> defect["envelope"]?.jsonPrimitive?.contentOrNull
				?: fail("$fixtureId: a foreign-wire defect carries no envelope")

			else -> fail("$fixtureId: defect ${defect["kind"]} has no runner here")
		}

	/** Name what two snapshots disagree about, for a failure message. */
	private fun describeDifference(
		expected: JsonElement,
		actual: JsonElement,
	): String {
		val diffs = mutableListOf<Diff>()
		collect(expected, actual, "snapshot", emptySet(), diffs)
		return if (diffs.isEmpty()) {
			"the two differ somewhere the walker cannot see"
		} else {
			diffs.joinToString("; ") { "${it.path}: ${it.detail}" }
		}
	}

	// -- index and file access ------------------------------------------------

	private data class Diff(val path: String, val detail: String)

	private val JsonObject.fixtures: List<JsonObject>
		get() = this["fixtures"]!!.jsonArray.map { it.jsonObject }

	private fun id(entry: JsonObject): String = entry["id"]!!.jsonPrimitive.content

	/** Find `native/protocol` by walking up, because Gradle may start anywhere in the module. */
	private fun fixtureDirectory(): File {
		var cursor: File? = File(System.getProperty("user.dir")).absoluteFile
		while (cursor != null) {
			val candidate = File(cursor, "native/protocol/$INDEX_FILE")
			if (candidate.isFile) {
				return candidate.parentFile
			}
			cursor = cursor.parentFile
		}
		fail("no native/protocol/$INDEX_FILE above ${File(System.getProperty("user.dir")).absolutePath}. Run generate:fixtures.")
	}

	private fun readIndex(directory: File): JsonObject =
		json.parseToJsonElement(File(directory, INDEX_FILE).readText()).jsonObject

	/** Read a fixture, proving the bytes are the ones the generator hashed. */
	private fun readFixture(directory: File, entry: JsonObject): JsonObject {
		val file = File(directory, entry["file"]!!.jsonPrimitive.content)
		val bytes = file.readBytes()
		val digest = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
		val expectedDigest = entry["sha256"]!!.jsonPrimitive.content
		assertEquals(expectedDigest, digest, "${file.name} is not the file $INDEX_FILE hashed. Run `bun run --cwd packages/react-native generate:fixtures`.")
		val fixture = json.parseToJsonElement(String(bytes, Charsets.UTF_8)).jsonObject
		val version = fixture["protocolVersion"]?.jsonPrimitive?.longOrNull
		check(version == 1L) { "${id(entry)}: fixture protocolVersion $version is not this build's 1" }
		return fixture
	}

	// -- assertions -----------------------------------------------------------

	/**
	 * Compare an expected subtree with what the core produced, field by field.
	 *
	 * The walk is driven by `expected`, so a field the fixture does not carry is not
	 * asserted, while a field the core invented is reported: "must not invent" is a
	 * rule, not a suggestion. A fixture `null` and a Kotlin field the encoder left
	 * out are the same answer.
	 */
	private fun record(
		fixtureId: String,
		path: String,
		expected: JsonElement,
		actual: JsonElement,
		extraFieldsAllowedUnder: Set<String> = emptySet(),
	) {
		val diffs = recorded.getOrPut(fixtureId) { mutableListOf() }
		collect(expected, actual, path, extraFieldsAllowedUnder, diffs)
	}

	/** Record something the core did that has no expected value to diff against. */
	private fun record(
		fixtureId: String,
		path: String,
		detail: String,
	) {
		recorded.getOrPut(fixtureId) { mutableListOf() } += Diff(path, detail)
	}

	private fun collect(
		expected: JsonElement,
		actual: JsonElement?,
		path: String,
		extraFieldsAllowedUnder: Set<String>,
		into: MutableList<Diff>,
	) {
		if (expected is JsonNull && (actual == null || actual is JsonNull)) {
			return
		}
		if (actual == null) {
			into += Diff(path, "expected ${render(expected)}, the core produced nothing")
			return
		}
		when {
			expected is JsonObject && actual is JsonObject -> {
				expected.keys.sorted().forEach { key ->
					collect(expected[key]!!, actual[key], "$path.$key", extraFieldsAllowedUnder, into)
				}
				if (!extraFieldsAllowedUnder.contains(path)) {
					// A key the fixture leaves out and the core spells `null` is the
					// same answer as the other way round, so only a value carries
					// signal. Everything else the core invents still gets reported.
					actual.keys.sorted()
						.filterNot { expected.containsKey(it) || actual[it] is JsonNull }
						.forEach { key ->
							into += Diff("$path.$key", "the core produced ${render(actual[key])}, which the fixture does not carry")
						}
				}
			}

			expected is JsonArray && actual is JsonArray -> {
				if (expected.size != actual.size) {
					into += Diff(
						path,
						"expected ${expected.size} item(s) ${expected.joinToString(", ", limit = 4) { render(it) }}," +
							" the core produced ${actual.size} ${actual.joinToString(", ", limit = 4) { render(it) }}",
					)
				}
				minOf(expected.size, actual.size).let { common ->
					for (index in 0 until common) {
						collect(expected[index], actual[index], "$path[$index]", extraFieldsAllowedUnder, into)
					}
				}
			}

			!matches(expected, actual) -> into += Diff(path, "expected ${render(expected)}, the core produced ${render(actual)}")
		}
	}

	/** Equality with the two tolerances that are not contract: null against absent, and 1 against 1.0. */
	private fun matches(expected: JsonElement, actual: JsonElement?): Boolean {
		if (expected is JsonNull) {
			return actual == null || actual is JsonNull
		}
		if (actual == null) {
			return false
		}
		return when {
			expected is JsonObject && actual is JsonObject ->
				expected.keys == actual.keys && expected.all { (key, value) -> matches(value, actual[key]) }

			expected is JsonArray && actual is JsonArray ->
				expected.size == actual.size && expected.zip(actual).all { (want, got) -> matches(want, got) }

			else -> expected is JsonPrimitive && actual is JsonPrimitive &&
				expected.contentOrNull == actual.contentOrNull
		}
	}

	private fun render(element: JsonElement?): String {
		val text = when (element) {
			null -> "nothing"
			is JsonObject -> element.keys.sorted().joinToString(", ", "{", "}") { "${it}: ${render(element[it])}" }
			is JsonArray -> element.joinToString(", ", "[", "]") { render(it) }
			else -> element.toString()
		}
		return if (text.length > 220) text.take(220) + "…" else text
	}

	/**
	 * Compare what was observed against what this build is allowed to get wrong.
	 *
	 * An unlisted difference fails, and a ledger row that no longer reproduces fails
	 * too, so the list cannot rot into a way of passing by forgetting.
	 */
	private fun judge(index: JsonObject) {
		val problems = mutableListOf<String>()
		index.fixtures.forEach { entry ->
			val fixtureId = id(entry)
			val diffs = recorded[fixtureId].orEmpty()
			val allowed = LEDGER.filter { it.fixture == fixtureId }
			val failures = diffs.filter { diff -> allowed.none { it.covers(diff.path) } }
			if (failures.isNotEmpty()) {
				val body = failures.joinToString("\n") { "  ${it.path}: ${it.detail}" }
				problems += (
					"$fixtureId disagrees with the kernel in ${failures.size} place(s):\n$body\n" +
						"Fix the Kotlin core, not the fixture. If the field really belongs to $ALIGNMENT_TASK, " +
						"add it to LEDGER with the reason."
					)
			}
			val spent = diffs.mapNotNull { diff -> allowed.firstOrNull { it.covers(diff.path) }?.path }.toSet()
			val stale = allowed.map { it.path }.filterNot { spent.contains(it) }
			if (stale.isNotEmpty()) {
				problems += (
					"$fixtureId: LEDGER still lists ${stale.joinToString(", ")}, which no longer differ. " +
						"The core matches the kernel here, so drop the row."
					)
			}
		}
		if (problems.isNotEmpty()) {
			fail(problems.joinToString("\n\n"))
		}
	}

	// -- accepted differences -------------------------------------------------

	/** One field this build cannot match yet, and why. */
	private class Divergence(val fixture: String, val path: String, val reason: String) {
		/** A trailing `*` on [path] means "this path and everything under it". */
		fun covers(candidate: String): Boolean =
			if (path.endsWith("*")) candidate.startsWith(path.dropLast(1)) else candidate == path
	}

	private companion object {
		const val INDEX_FILE = "index.json"

		/**
		 * Every fixture kind this file has a function for.
		 *
		 * This sits next to the dispatch on purpose. The dispatch fails on a kind it has
		 * no branch for rather than skipping it, so the only way to grow this set is to
		 * write the runner, and the unclaimed count can then only be non-zero when a kind
		 * was added to one place and not the other.
		 */
		val CLAIMED_KINDS: Set<String> = setOf("evaluation", "native-envelope", "revision-trace", "save-body")


	/**
	 * The task that owns aligning this core with the kernel's snapshot.
	 *
	 * The overrides and privacy-signal halves of that are done: `gpc` is an override
	 * with no `test`, the signal is a detected / override / active triple with no
	 * `msa`, and the overrides a decision was made against come from the location
	 * `/init` served. What is left in [LEDGER] under this task is the snapshot's field
	 * spellings and the standing-directive gap.
	 */
	const val ALIGNMENT_TASK = "the native protocol alignment task (snapshot field spellings and standing GPC directives)"

	// -- why each accepted difference exists ----------------------------------

	const val LOCATION = "ConsentLocation keys country/region; the /init wire keys them countryCode/regionCode."

	const val PROMPT = "PromptRequirement is a notice/acknowledge/purpose triple; the wire and the kernel carry { kind, reason }."

	const val SUBJECT = "ConsentSnapshot keys subject.id; every c15t wire surface keys it subjectId."

	const val CHOICE = "ExplicitChoice is consents/action/actionAt/fingerprint; the kernel carries one receipt per category with its own confirmedAt and proof basis."

	const val REVISION = "hydration and bootstrap each count as a mutation here, so this build runs ahead of the kernel, which numbers committed state changes only. The contract has to pick one numbering."

	const val DIRECTIVES = "the core never records a standing directive from a live GPC signal, so optOutDirectives stays empty where the kernel holds one."

	const val DIRECTIVE_RESTRICTION = "the kernel also charges a category denied by a recorded directive with an opt-out-directive reason; because this build records no directive, its reason list is one short of the kernel's."

	const val EXPLICIT_DENIAL = "the kernel records an explicit denial as an explicit-denial restriction; this build denies the category but reports no reason, so the permission agrees and the reason map is empty."

	const val DISMISSAL = "the core keys a notice dismissal to the choice fingerprint, while the kernel keys it to the notice fingerprint, so a dismissal stored in the kernel's format is not recognised: the prompt stays owed and the notice deadline is never reported."

	const val NO_MATCH = "when /init serves status no-match this build reports no prompt, while the kernel falls back to its default banner."

	const val DEADLINE_OVER = "the core reports a choice expiry the kernel does not: under this policy nothing changes when that deadline passes, so the kernel leaves nextDeadline unset."

	/**
	 * One row per fixture, snapshot root, and field this build cannot match yet.
	 *
	 * Every row reproduces against the committed fixtures right now. Nothing here is
	 * a fixture problem: the expectations come from the TypeScript kernel, which is
	 * the authority. An unlisted difference fails, and a row that stops reproducing
	 * fails, so the list cannot rot into a way of passing by forgetting.
	 */
	val LEDGER: List<Divergence> = if (System.getenv("FIXTURE_LEDGER") == "off") emptyList() else ledger()

	private fun ledger(): List<Divergence> {
		val rows = mutableListOf<Divergence>()

		/**
		 * Fields every snapshot in these fixtures trips over, keys only.
		 *
		 * `privacySignals` is gone from this list. The first draft of the contract gave
		 * this build a `gpc`/`msa` boolean pair, and its Corrections section retired
		 * both; the core now carries the detected / override / active triple, so those
		 * paths match the kernel and have no business being listed.
		 */
		val shape = listOf(
			"location*" to LOCATION,
			"promptRequirement*" to PROMPT,
			"subject*" to SUBJECT,
		)

		fun add(fixture: String, root: String, vararg fields: Pair<String, String>) {
			(fields.toList() + shape).forEach { (field, reason) ->
				rows += Divergence(fixture, "$root.$field", reason)
			}
		}

		listOf(
			"evaluation-eu-opt-in" to emptyList<Pair<String, String>>(),
			"evaluation-us-ccpa-opt-out" to emptyList<Pair<String, String>>(),
			"evaluation-no-rule-matched" to listOf("activeUI" to NO_MATCH),
			"evaluation-gpc-signal-present" to listOf(
				"optOutDirectives" to DIRECTIVES,
				"restrictions.marketing" to DIRECTIVE_RESTRICTION,
				"restrictions.measurement" to DIRECTIVE_RESTRICTION,
				"revision" to REVISION,
			),
			"evaluation-notice-pending" to emptyList<Pair<String, String>>(),
			"evaluation-eu-explicit-grants" to listOf(
				"explicitChoice*" to CHOICE,
			),
			"evaluation-eu-partial-denials" to listOf(
				"explicitChoice*" to CHOICE,
				"restrictions.marketing" to EXPLICIT_DENIAL,
			),
			"evaluation-notice-dismissed" to listOf(
				"activeUI" to DISMISSAL,
				"nextDeadline" to DISMISSAL,
			),
		).forEach { (fixture, fields) -> add(fixture, "expected.snapshot", *fields.toTypedArray()) }

		// The snapshot a `native-envelope` write case stores is the same snapshot the
		// evaluation fixtures assert after the same action, so it trips the same
		// spellings. The read cases carry no rows: their bytes have to yield nothing, and
		// they are checked field for field against an empty store instead.
		listOf(
			"native-envelope-opt-in-grants" to listOf("explicitChoice*" to CHOICE),
			"native-envelope-partial-denials" to listOf(
				"explicitChoice*" to CHOICE,
				"restrictions.marketing" to EXPLICIT_DENIAL,
			),
			"native-envelope-notice-dismissed" to emptyList<Pair<String, String>>(),
			"native-envelope-opt-out-grants" to listOf(
				"explicitChoice*" to CHOICE,
				"nextDeadline" to DEADLINE_OVER,
			),
		).forEach { (fixture, fields) -> add(fixture, "expected.snapshot", *fields.toTypedArray()) }

		val before = emptyList<Pair<String, String>>()
		val after = listOf("explicitChoice*" to CHOICE)
		listOf(
			"save-body-all" to emptyList<Pair<String, String>>(),
			"save-body-explicit-partial" to listOf("restrictions.measurement" to EXPLICIT_DENIAL),
			"save-body-necessary" to listOf(
				"nextDeadline" to DEADLINE_OVER,
				"restrictions.experience" to EXPLICIT_DENIAL,
				"restrictions.functionality" to EXPLICIT_DENIAL,
				"restrictions.marketing" to EXPLICIT_DENIAL,
				"restrictions.measurement" to EXPLICIT_DENIAL,
			),
		).forEach { (fixture, extra) ->
			add(fixture, "expected.snapshotBefore", *before.toTypedArray())
			add(fixture, "expected.snapshotAfter", *(after + extra).toTypedArray())
		}

		val gpcBefore = listOf(
			"optOutDirectives" to DIRECTIVES,
			"restrictions.marketing" to DIRECTIVE_RESTRICTION,
			"restrictions.measurement" to DIRECTIVE_RESTRICTION,
			"revision" to REVISION,
		)
		add("save-body-ccpa-gpc", "expected.snapshotBefore", *gpcBefore.toTypedArray())
		add(
			"save-body-ccpa-gpc",
			"expected.snapshotAfter",
			*(
				listOf("explicitChoice*" to CHOICE, "nextDeadline" to DEADLINE_OVER) + gpcBefore
			).toTypedArray(),
		)
		return rows
	}
}
}
