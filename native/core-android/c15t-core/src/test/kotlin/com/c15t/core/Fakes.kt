package com.c15t.core

import com.c15t.core.model.KernelError
import com.c15t.core.model.KernelUser
import com.c15t.core.model.ConsentSubject
import com.c15t.core.model.QueuedSave
import com.c15t.core.spi.HttpClient
import com.c15t.core.spi.HttpRequest
import com.c15t.core.spi.Clock
import com.c15t.core.spi.HttpResponse
import com.c15t.core.spi.KeyValueStore
import com.c15t.core.spi.TaskExecutor
import com.c15t.core.store.C15tStore
import com.c15t.core.transport.C15tTransport
import com.c15t.core.transport.InitContext
import com.c15t.core.transport.SaveOutcome
import com.c15t.core.transport.TransportOutcome

/**
 * Storage double that records the order of reads and writes, which is how the
 * tests prove the queue hits disk before the network rather than after.
 */
class InMemoryKeyValueStore(
	initial: Map<String, String> = emptyMap(),
	/** Shared with the transport double so one test can order disk against wire. */
	val eventLog: MutableList<String> = mutableListOf(),
) : KeyValueStore {
	private val data = LinkedHashMap(initial)

	val events: List<String>
		get() = eventLog.toList()

	val keys: Set<String>
		get() = data.keys.toSet()

	override fun read(key: String): String? {
		eventLog += "read:$key"
		return data[key]
	}

	override fun write(
		key: String,
		value: String?,
	) {
		eventLog += if (value == null) "delete:$key" else "write:$key"
		if (value == null) {
			data.remove(key)
		} else {
			data[key] = value
		}
	}

	override fun flush() {
		eventLog += "flush"
	}

	/** Seed a value without leaving a write in the log, for hydration fixtures. */
	fun putSilently(
		key: String,
		value: String,
	) {
		data[key] = value
	}
}

/**
 * Scripted transport double.
 *
 * Answers come from a queue and the last answer sticks, so a test scripts only the
 * transitions it cares about. [eventLog] lets a test put transport calls on the
 * same timeline as storage writes, which is how the persist-before-request rule is
 * asserted.
 */
class RecordingTransport(
	private val eventLog: MutableList<String>? = null,
) : C15tTransport {
	private val responses = mutableListOf<TransportOutcome>()
	private val saveOutcomes = mutableListOf<SaveOutcome>()
	private var lastInit: TransportOutcome? = null
	private var lastSave: SaveOutcome = SaveOutcome.Delivered

	val initRequests = mutableListOf<InitContext>()
	val saveRequests = mutableListOf<QueuedSave>()
	val identifyRequests = mutableListOf<Pair<String, String>>()

	/** Queue one more init answer; the last one sticks. */
	fun respondInit(outcome: TransportOutcome): RecordingTransport {
		responses += outcome
		return this
	}

	/** Queue one more write answer; the last one sticks. */
	fun respondSave(outcome: SaveOutcome): RecordingTransport {
		saveOutcomes += outcome
		return this
	}

	override fun init(context: InitContext): TransportOutcome {
		record("network:init")
		initRequests += context
		val next = responses.removeFirstOrNull() ?: lastInit ?: TransportOutcome.NetworkFailure("no response scripted")
		lastInit = next
		return next
	}

	override fun save(entry: QueuedSave): SaveOutcome {
		record("network:save")
		saveRequests += entry
		val next = saveOutcomes.removeFirstOrNull() ?: lastSave
		lastSave = next
		return next
	}

	private fun record(event: String) {
		eventLog?.add(event)
	}

	override fun identify(
		subject: ConsentSubject,
		user: KernelUser,
	): TransportOutcome {
		identifyRequests += subject.id to user.externalId
		return TransportOutcome.Success(null, emptyMap())
	}
}

/** HTTP double for the header contract; never opens a socket. */
class RecordingHttpClient(
	private val handler: (HttpRequest) -> HttpResponse,
) : HttpClient {
	val requests = mutableListOf<HttpRequest>()

	override fun send(request: HttpRequest): HttpResponse {
		requests += request
		return handler(request)
	}
}

/**
 * A store that accepts writes to one key and keeps nothing, which is what a host store
 * does once it has given up on its key: [com.c15t.core.store.ResilientKeyValueStore]
 * reports the failure and returns rather than throwing out of a launch hook.
 *
 * The point is that the caller above gets no exception. Everything that believes the write
 * landed believes it for the same reason the host gave, so the only thing that can catch
 * this is reading the bytes back.
 */
class VanishingKeyValueStore(
	private val victim: String,
	/** Shared with the transport double, so one test can order disk against wire. */
	private val eventLog: MutableList<String> = mutableListOf(),
) : KeyValueStore {
	private val data = LinkedHashMap<String, String>()

	/** What the store actually holds, which is the honest measure of what was written. */
	val storedKeys: Set<String>
		get() = data.keys.toSet()

	/** The order reads and writes happened in. */
	val events: List<String>
		get() = eventLog.toList()

	override fun read(key: String): String? {
		eventLog += "read:$key"
		return data[key]
	}

	override fun write(
		key: String,
		value: String?,
	) {
		eventLog += if (value == null) "delete:$key" else "write:$key"
		if (key == victim) {
			return
		}
		if (value == null) {
			data.remove(key)
		} else {
			data[key] = value
		}
	}
}

/** Clock the tests advance by hand, so expiry and deadlines are exact. */
class FixedClock(start: Long = 1_700_000_000_000L) : Clock {
	var now: Long = start

	override fun nowMillis(): Long = now

	/** Move time forward. */
	fun advance(millis: Long) {
		now += millis
	}
}

/** Build a kernel wired to in-memory doubles with inline task execution. */
fun testKernel(
	config: NativeConfig = NativeConfig(portalUrl = "https://test.c15t.app"),
	store: C15tStore,
	clock: FixedClock = FixedClock(),
	transport: C15tTransport = C15tTransport.NONE,
	/**
	 * Where init and delivery run. Left null it means inline, which is what makes ordering
	 * observable; a test that needs a real hand-off -- a send whose answer this thread
	 * cannot see -- passes an executor of its own.
	 */
	executor: TaskExecutor? = null,
	/** Receives every error the core emits, so a test can assert on the codes. */
	logger: (KernelError) -> Unit = {},
): C15tKernel {
	var sequence = 0
	val nextId: () -> String = {
		sequence += 1
		"%08d-0000-4000-8000-000000000000".format(sequence)
	}
	return C15tKernel(
		config = config,
		store = store,
		clock = clock,
		transport = transport,
		// Inline execution makes ordering observable: a save's disk write and its
		// delivery are finished by the time the call returns.
		executor = executor ?: TaskExecutor.DIRECT,
		// Deterministic ids on both seams, so a replay assertion can compare queue
		// entries and an identity assertion can compare subjects.
		subjectIdGenerator = nextId,
		queueIdGenerator = nextId,
		logger = logger,
	)
}

/** A realistic 30 day choice window, the shape a resolved rule arrives in. */
fun initBody(
	policyId: String = "us-ca",
	model: String = "\"opt-in\"",
	prompt: String = "\"choice\"",
	scope: String? = null,
	scopeMode: String? = "\"permissive\"",
	choiceMs: Long = 30L * 24 * 60 * 60 * 1000,
	noticeMs: Long = 180L * 24 * 60 * 60 * 1000,
	choiceFingerprint: String = "choice-fp-1",
	policyFingerprint: String = "policy-fp-1",
	// `policyFingerprintsSchema` requires all three, so a body that answers only two
	// is not a body the reader may accept. A notice dismissal binds to this one.
	noticeFingerprint: String = "notice-fp-1",
	gpcDenyCategories: String? = null,
	policySnapshotToken: String? = "snap-1",
	includePolicyResolution: Boolean = true,
	version: String? = "1",
): String {
	val policy = buildList {
		add("\"id\":\"$policyId\"")
		add("\"model\":$model")
		add("\"prompt\":$prompt")
		scope?.let { add("\"scope\":$it") }
		scopeMode?.let { add("\"scopeMode\":$it") }
		add("\"validity\":{\"choiceMs\":$choiceMs,\"noticeMs\":$noticeMs}")
		gpcDenyCategories?.let { add("\"privacySignals\":{\"gpc\":{\"denyCategories\":$it}}") }
	}.joinToString(",", prefix = "{", postfix = "}")

	val resolution = buildList {
		version?.let { add("\"version\":$it") }
		add("\"status\":\"matched\"")
		add("\"policyId\":\"$policyId\"")
		add("\"matchedBy\":\"country\"")
		add(
			"\"fingerprints\":{\"policy\":\"$policyFingerprint\"," +
				"\"choice\":\"$choiceFingerprint\",\"notice\":\"$noticeFingerprint\"}",
		)
		add("\"policy\":$policy")
	}.joinToString(",", prefix = "{", postfix = "}")

	val token = policySnapshotToken?.let { ""","policySnapshotToken":"$it"""" } ?: ""
	return if (includePolicyResolution) {
		"""{"policyResolution":$resolution$token}"""
	} else {
		"""{"location":{"countryCode":"US"}$token}"""
	}
}

/** The same body, wrapped in the JSON object the transport hands over. */
fun initSuccess(
	vararg extraHeaders: Pair<String, String>,
	body: String = initBody(),
): TransportOutcome {
	val element = kotlinx.serialization.json.Json.parseToJsonElement(body)
	return TransportOutcome.Success(element, extraHeaders.toMap())
}
