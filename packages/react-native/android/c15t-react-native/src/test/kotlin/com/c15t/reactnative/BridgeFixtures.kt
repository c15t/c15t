package com.c15t.reactnative

import com.c15t.core.C15tKernel
import com.c15t.core.NativeConfig
import com.c15t.core.spi.KeyValueStore
import com.c15t.core.spi.TaskExecutor
import com.c15t.core.store.C15tJson
import com.c15t.core.store.C15tStore
import com.c15t.core.store.C15tStoreKeys
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject

/** In-memory storage, so no test needs a device or a filesystem. */
internal class MemoryStore(
	initial: Map<String, String> = emptyMap(),
) : KeyValueStore {
	val data = LinkedHashMap(initial)

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

/**
 * A kernel wired the way the bridge runs one: local-only transport and inline task
 * execution, so a call is finished by the time it returns and ordering is assertable.
 *
 * @param config the config to bootstrap with, so a test can pin overrides or a detected
 * GPC signal the way a host app's manifest would.
 */
internal fun bridgeKernel(
	store: C15tStore,
	config: NativeConfig = NativeConfig(portalUrl = "https://test.c15t.app"),
): C15tKernel = C15tKernel(
	config = config,
	store = store,
	transport = com.c15t.core.transport.C15tTransport.NONE,
	executor = TaskExecutor.DIRECT,
)

/** Recorded `(event, payload)` pairs from a [C15tChangePump]. */
internal class RecordingSink : C15tEventSink {
	val events = mutableListOf<Pair<String, String>>()

	override fun emit(
		event: String,
		payload: String,
	) {
		events += event to payload
	}

	fun names(event: String): List<String> = events.filter { it.first == event }.map { it.second }
}

/**
 * Rewrite the stored envelope so its overrides carry [key], the way a build from
 * before the protocol was correction left them.
 *
 * The rest of the envelope stays what this build wrote, so the only difference a
 * reader can see is the retired name. That isolates the refusal: a test that failed
 * for some other reason would fail every other snapshot test too.
 */
internal fun sealWithRetiredOverride(
	backend: MemoryStore,
	key: String,
	value: String,
) {
	val raw = backend.data[C15tStoreKeys.SNAPSHOT]
		requireNotNull(raw) { "the kernel persists an envelope once bootstrapped" }

	// The stored root is the envelope, so the overrides live two levels down. Patching
	// the wrong level would write a document that fails to decode for a different
	// reason, and the test would pass for the wrong one too.
	val envelope = C15tJson.storage.parseToJsonElement(raw).jsonObject.toMutableMap()
	val snapshot = (envelope["snapshot"] as JsonObject).toMutableMap()
	val overrides = (snapshot["overrides"] as? JsonObject ?: JsonObject(emptyMap())).toMutableMap()
	overrides[key] = JsonPrimitive(value)
	snapshot["overrides"] = JsonObject(overrides)
	envelope["snapshot"] = JsonObject(snapshot)

	backend.data[C15tStoreKeys.SNAPSHOT] = C15tJson.storage.encodeToString(
		JsonObject.serializer(),
		JsonObject(envelope),
	)
}
