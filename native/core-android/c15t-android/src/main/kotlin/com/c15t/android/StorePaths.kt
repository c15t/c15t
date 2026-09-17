package com.c15t.android

/**
 * Maps the shared contract's storage keys onto file names.
 *
 * Deliberately free of Android imports: this is the one part of the storage layer
 * that a JVM unit test can cover without an emulator, and a key that escaped its
 * directory would put encrypted consent in the wrong place.
 */
internal object StorePaths {
	/** Directory under `noBackupFilesDir` that holds the c15t blobs. */
	const val DIRECTORY = "c15t"

	private const val MAX_NAME_LENGTH = 64
	private val SAFE = Regex("^[a-z0-9._-]+$")

	/**
	 * Turn [key] into a single path segment, or `null` when it cannot be made safe.
	 *
	 * Callers treat `null` as "no such key" rather than escaping it into a
	 * different location.
	 */
	fun fileName(key: String): String? {
		val trimmed = key.trim()
		if (trimmed.isEmpty() || trimmed.length > MAX_NAME_LENGTH) {
			return null
		}
		// Reject rather than sanitise: a separator, a NUL, or a leading dot all mean
		// the caller asked for something other than one file in one directory.
		if (!SAFE.matches(trimmed) || trimmed.startsWith(".") || trimmed.contains("..")) {
			return null
		}
		return trimmed
	}
}
