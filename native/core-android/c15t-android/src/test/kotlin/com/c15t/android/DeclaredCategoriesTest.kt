package com.c15t.android

import com.c15t.core.model.ConsentCategory
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * The declared category scope, from manifest text to categories.
 *
 * This is the Android spelling of the web provider's `consentCategories`, and the
 * host types it into an `AndroidManifest.xml` by hand or receives it from the Expo
 * plugin. The interpretation rules worth pinning are the ones the iOS plist reader
 * already follows: spaces around a name are decoration, an unknown name is dropped
 * rather than trusted, and a list that survives neither rule is not a declaration
 * at all. A wrong `null` here is the difference between a dialog that shows the
 * policy's rows and one that shows rows the evaluator will never honour.
 *
 * The raw value, not a `Bundle`, is the unit under test: a `Bundle` on the JVM is
 * the stub `android.jar`, and `C15tManifestValue.string` already owns the
 * whatever-type-the-parser-chose half of the read.
 */
class DeclaredCategoriesTest {
	@Test
	fun `a comma list parses in declared order with the spaces trimmed`() {
		assertEquals(
			listOf(
				ConsentCategory.NECESSARY,
				ConsentCategory.FUNCTIONALITY,
				ConsentCategory.MEASUREMENT,
				ConsentCategory.MARKETING,
			),
			C15tAndroid.declaredCategories("necessary, functionality , measurement,marketing"),
		)
	}

	@Test
	fun `a name neither core knows is dropped rather than trusted`() {
		// "experiance" is the typo this exists for: trusting it would install a
		// category no snapshot can carry, dropping it shows the honest rows.
		assertEquals(
			listOf(ConsentCategory.NECESSARY, ConsentCategory.MEASUREMENT),
			C15tAndroid.declaredCategories("necessary, experiance, measurement"),
		)
	}

	@Test
	fun `a single name is a declaration and not a parse error`() {
		assertEquals(
			listOf(ConsentCategory.NECESSARY),
			C15tAndroid.declaredCategories("necessary"),
		)
	}

	@Test
	fun `nothing usable stays absent, which is the full policy scope`() {
		// Absent and "an empty list" answer the same question the same way at the
		// core, but they arrive here differently, and each is its own way a host
		// can mean "I did not declare a scope".
		assertNull(C15tAndroid.declaredCategories(null))
		assertNull(C15tAndroid.declaredCategories(""))
		assertNull(C15tAndroid.declaredCategories("   "))
		assertNull(C15tAndroid.declaredCategories(" , , "))
		assertNull(C15tAndroid.declaredCategories("tracking, analytics"))
	}
}
