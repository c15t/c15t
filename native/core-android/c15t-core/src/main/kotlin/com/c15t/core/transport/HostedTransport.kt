package com.c15t.core.transport

import com.c15t.core.NativeConfig
import com.c15t.core.model.ConsentSubject
import com.c15t.core.model.KernelUser
import com.c15t.core.model.QueuedSave
import com.c15t.core.spi.Clock
import com.c15t.core.spi.HttpClient
import com.c15t.core.spi.HttpRequest
import com.c15t.core.spi.HttpResponse
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.net.URI

/**
 * Talks to a c15t backend's `/init` and `/subjects`.
 *
 * Same endpoints, same headers, and the same request bodies as the hosted
 * transport in `@c15t/core`. It holds no state: it turns a
 * [com.c15t.core.spi.HttpClient] into the three commands the core delegates, and
 * leaves every decision to [InitMapper] and the kernel.
 */
class HostedTransport(
	private val http: HttpClient,
	private val config: NativeConfig,
	private val clock: Clock = Clock.SYSTEM,
	private val json: Json = Json { ignoreUnknownKeys = true },
) : C15tTransport {
	private val base: String = trimTrailingSlash(config.portalUrl)
	private val initUrl: String = config.initUrl?.takeIf { it.isNotBlank() } ?: "$base/init"
	private val domain: String = config.domain?.takeIf { it.isNotBlank() } ?: hostOf(base)

	override fun init(context: InitContext): TransportOutcome {
		val headers = linkedMapOf(
			"accept" to "application/json",
		)
		headers.putAll(C15tProtocol.protocolHeaders(config.sdkVersion))
		// The override travels on the adapter header the backend's shared
		// extractor reads first, mirroring the web SDK.
		context.overrides.test?.let { headers["x-c15t-gpc"] = if (it) "1" else "0" }
		if (context.gpc && context.overrides.test == null) {
			headers["sec-gpc"] = "1"
		}
		context.overrides.country?.let { headers["x-c15t-country"] = it }
		context.overrides.region?.let { headers["x-c15t-region"] = it }
		context.overrides.language?.let { headers["accept-language"] = it }

		return send(HttpRequest(method = HttpRequest.GET, url = initUrl, headers = headers))
	}

	override fun save(entry: QueuedSave): SaveOutcome {
		val body = SaveBodyBuilder.build(entry.payload, domain)
		val headers = jsonHeaders()
		val request = HttpRequest(
			method = HttpRequest.POST,
			url = "$base/subjects",
			headers = headers,
			body = json.encodeToString(JsonElement.serializer(), body),
		)
		return when (val outcome = send(request)) {
			is TransportOutcome.Success -> SaveOutcome.Delivered
			is TransportOutcome.HttpFailure -> SaveOutcome.Rejected(outcome.status)
			is TransportOutcome.NetworkFailure -> SaveOutcome.Unavailable(outcome.message)
		}
	}

	override fun identify(
		subject: ConsentSubject,
		user: KernelUser,
	): TransportOutcome = send(
		HttpRequest(
			method = HttpRequest.PATCH,
			url = "$base/subjects/${uriEncode(subject.id)}",
			headers = jsonHeaders(),
			body = json.encodeToString(
				JsonElement.serializer(),
				buildJsonObject {
					put("externalId", user.externalId)
					user.identityProvider?.let { put("identityProvider", it) }
					put("updatedAt", clock.nowMillis())
				},
			),
		),
	)

	override fun logout(subject: ConsentSubject): TransportOutcome = send(
		HttpRequest(
			method = HttpRequest.PATCH,
			url = "$base/subjects/${uriEncode(subject.id)}",
			headers = jsonHeaders(),
			body = json.encodeToString(
				JsonElement.serializer(),
				buildJsonObject {
					put("externalId", JsonPrimitive(null as String?))
				},
			),
		),
	)

	private fun jsonHeaders(): Map<String, String> = buildMap {
		put("accept", "application/json")
		put("content-type", "application/json")
		putAll(C15tProtocol.protocolHeaders(config.sdkVersion))
	}

	/**
	 * Never throws. A non-2xx status is an [TransportOutcome.HttpFailure] so the
	 * kernel can tell "the backend answered no" apart from "nothing answered".
	 */
	private fun send(request: HttpRequest): TransportOutcome = try {
		val response = http.send(request)
		if (!response.ok) {
			TransportOutcome.HttpFailure(response.status)
		} else {
			TransportOutcome.Success(parseBody(response), response.headers.lowerCased())
		}
	} catch (error: Exception) {
		TransportOutcome.NetworkFailure("c15t transport: ${error.message ?: error.javaClass.simpleName}")
	}

	private fun parseBody(response: HttpResponse): JsonElement? {
		val raw = response.body?.takeIf { it.isNotBlank() } ?: return null
		return try {
			json.parseToJsonElement(raw)
		} catch (_: Exception) {
			// A 2xx with an unreadable document is an invalid payload, which the
			// strict reader reports; keeping it null reaches the same conclusion.
			null
		}
	}

	private companion object {
		fun trimTrailingSlash(value: String): String =
			if (value.length > 1 && value.endsWith("/")) value.dropLast(1) else value

		/** Same resolution order as the web SDK, minus `window`. */
		fun hostOf(backendUrl: String): String = try {
			URI(backendUrl).host ?: "localhost"
		} catch (_: Exception) {
			"localhost"
		}

		fun uriEncode(value: String): String = java.net.URLEncoder.encode(value, "UTF-8")

		fun Map<String, String>.lowerCased(): Map<String, String> =
			this.entries.associateTo(LinkedHashMap()) { (key, value) -> key.lowercase() to value }
	}
}
