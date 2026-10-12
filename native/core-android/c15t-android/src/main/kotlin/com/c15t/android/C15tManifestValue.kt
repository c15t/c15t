package com.c15t.android

import android.os.Bundle

/**
 * Turns one `meta-data` entry into the value the declaration meant.
 *
 * The manifest parser decides the type, not the app. An unquoted `android:value="true"`
 * reaches the bundle as a `Boolean`, an unquoted `1` as a `Long`, and only a quoted
 * literal stays a `String`, so a reader that names one type is a reader that works for
 * whichever spelling the developer happened to type. `getString` plus
 * `toBooleanStrictOrNull` was that reader: it accepted `true` because a bundle turns a
 * value back into text on the way out, and answered "not declared" for `TRUE` and for
 * `1`, which is the switch failing quietly in the staged build the switch exists for.
 *
 * Absent stays absent, which is not the same answer as `false`: the core derives the
 * GPC signal when nothing declared one, and a wrong `false` would silence it.
 */
object C15tManifestValue {
	/**
	 * Read one entry without naming its type, so the type can be inspected.
	 *
	 * `Bundle.get(String)` is deprecated in favour of the typed accessors, and naming a
	 * type is the exact mistake this file exists to avoid: `getString` on a manifest
	 * `true` and `getBoolean` on a quoted `"true"` are two readers, and an app gets
	 * whichever one its spelling happens to match. One suppression, in the one place
	 * where the raw value is the point.
	 */
	@Suppress("DEPRECATION")
	fun raw(bundle: Bundle?, key: String): Any? = bundle?.get(key)

	/**
	 * Read a text value, whichever type the parser produced.
	 *
	 * @param raw the raw bundle entry, typically `bundle.get(key)`.
	 * @return the trimmed value, or `null` when nothing usable is declared.
	 */
	fun string(raw: Any?): String? =
		raw?.toString()?.trim()?.takeIf { it.isNotEmpty() }

	/**
	 * Read a flag, whichever type the parser produced.
	 *
	 * `true`/`false` in any case, and `1`/`0` as a number or a string, are the
	 * spellings worth honouring: the first two are what the parser and Android's own
	 * `Bundle.getBoolean` accept, and a staged-build switch typed as `1` is a switch
	 * that was meant on. Anything else is an unreadable declaration rather than a
	 * refusal, so it reads as absent and the caller's default stands.
	 *
	 * @param raw the raw bundle entry, typically `bundle.get(key)`.
	 * @return the flag, or `null` when nothing usable is declared.
	 */
	fun boolean(raw: Any?): Boolean? =
		when (raw) {
			null -> null
			is Boolean -> raw
			is Number -> raw.toLong() != 0L
			else -> string(raw)?.lowercase()?.let { text ->
				when (text) {
					"true", "1" -> true
					"false", "0" -> false
					else -> null
				}
			}
		}
}
