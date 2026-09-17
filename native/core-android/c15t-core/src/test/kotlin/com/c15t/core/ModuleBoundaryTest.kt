package com.c15t.core

import com.c15t.core.model.ConsentCategory
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * The split only earns its keep if the pure module stays pure.
 *
 * A JVM unit test can prove that cheaply by reading the source tree, so the rule
 * "c15t-core has no android imports" fails the build here instead of surprising
 * someone at runtime.
 */
class ModuleBoundaryTest {
	@Test
	fun `the main source set imports nothing from android`() {
		val sourceRoot = File("src/main/kotlin")
		assertTrue(sourceRoot.isDirectory, "expected the source tree at ${sourceRoot.absolutePath}")

		val offenders = sourceRoot.walk()
			.filter { it.extension == "kt" }
			.flatMap { file ->
				file.readLines().mapIndexedNotNull { line, text ->
					val trimmed = text.trim()
					if (trimmed.startsWith("import android.") ||
						trimmed.startsWith("import androidx.")
					) {
						"${file.name}:${line + 1}: $trimmed"
					} else {
						null
					}
				}
			}
			.toList()

		assertEquals(emptyList(), offenders, "c15t-core must stay free of Android imports")
	}

	@Test
	fun `the engine exposes every name the shared contract names`() {
		val names = C15tKernel::class.java.declaredMethods.map { it.name }.toSet()
		val expected = setOf(
			"bootstrap",
			"snapshot",
			"isAllowed",
			"gate",
			"onChange",
			"save",
			"dismissNotice",
			"refresh",
			"identify",
			"logout",
			"setOverrides",
			"flushPending",
		)
		assertEquals(expected, expected.filter { it in names }.toSet(), "missing: ${expected - names}")
	}

	@Test
	fun `every optional category is reachable by wire name`() {
		val names = ConsentCategory.OPTIONAL.map { it.wireName }
		assertEquals(listOf("experience", "functionality", "marketing", "measurement"), names)
		assertEquals("necessary", ConsentCategory.NECESSARY.wireName)
		assertEquals(null, ConsentCategory.fromWireName("invented"))
	}
}
