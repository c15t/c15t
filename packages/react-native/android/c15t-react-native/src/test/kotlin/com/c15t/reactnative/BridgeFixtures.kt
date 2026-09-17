package com.c15t.reactnative

import com.c15t.core.C15tKernel
import com.c15t.core.NativeConfig
import com.c15t.core.spi.KeyValueStore
import com.c15t.core.spi.TaskExecutor
import com.c15t.core.store.C15tStore

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
 */
internal fun bridgeKernel(store: C15tStore): C15tKernel = C15tKernel(
	config = NativeConfig(portalUrl = "https://test.c15t.app"),
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
