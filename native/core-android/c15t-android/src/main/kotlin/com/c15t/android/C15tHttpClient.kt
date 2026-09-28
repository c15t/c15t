package com.c15t.android

import android.util.Log
import com.c15t.core.spi.HttpClient
import com.c15t.core.spi.HttpRequest
import com.c15t.core.spi.HttpResponse
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import javax.net.ssl.HttpsURLConnection

/**
 * Carries c15t traffic over the platform connection stack.
 *
 * Chosen over a bundled HTTP client to keep the dependency surface of a consent SDK
 * near zero: no new TLS stack, no new thread pool, and nothing extra for a host app
 * to align versions with.
 *
 * @param connectTimeoutMs connect budget; consent calls are always off the main
 * thread, so a short timeout is what keeps a queued write from holding the queue.
 * @param readTimeoutMs read budget for the response body.
 */
class C15tHttpClient(
	private val connectTimeoutMs: Int = DEFAULT_CONNECT_TIMEOUT_MS,
	private val readTimeoutMs: Int = DEFAULT_READ_TIMEOUT_MS,
) : HttpClient {
	override fun send(request: HttpRequest): HttpResponse {
		val connection = open(URL(request.url))
		try {
			connection.requestMethod = request.method
			connection.connectTimeout = connectTimeoutMs
			connection.readTimeout = readTimeoutMs
			connection.useCaches = false
			connection.instanceFollowRedirects = false
			for ((name, value) in request.headers) {
				connection.setRequestProperty(name, value)
			}
			val body = request.body
			if (body == null) {
				connection.connect()
			} else {
				connection.doOutput = true
				connection.connect()
				connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
			}

			val status = connection.responseCode
			val stream = if (status in 200..299) connection.inputStream else connection.errorStream
			val text = stream?.use { it.readBytes().toString(Charsets.UTF_8) }.orEmpty()
			if (status !in 200..299) {
				Log.d(TAG, "c15t request ${request.method} ${request.url} responded $status")
			}
			return HttpResponse(
				status = status,
				headers = connection.headerFields.filterKeys { it != null }.mapValues { it.value.firstOrNull().orEmpty() },
				body = text.takeIf { it.isNotEmpty() },
			)
		} catch (error: IOException) {
			// Connectivity, DNS, and TLS all land here. The transport reports it as a
			// network failure, which keeps the previous state and queues the write.
			Log.d(TAG, "c15t request ${request.method} ${request.url} failed", error)
			throw error
		} finally {
			connection.disconnect()
		}
	}

	private fun open(url: URL): HttpURLConnection = (url.openConnection() as HttpURLConnection).also { connection ->
		if (connection is HttpsURLConnection) {
			// Consent writes carry a subject id; nothing here needs a client cert, and
			// leaving the default trust manager in place is the point.
			connection.instanceFollowRedirects = false
		}
	}

	private companion object {
		const val DEFAULT_CONNECT_TIMEOUT_MS = 10_000
		const val DEFAULT_READ_TIMEOUT_MS = 15_000
		const val TAG = "c15t"
	}
}
