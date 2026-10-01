package com.c15t.reactnative

import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentDecision
import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.ConsentState
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The Android half of the platform tracking gate.
 *
 * Android answers one arm and refuses one call, so what is worth proving is not the
 * branch coverage: it is that the arm it reports means "no platform gate here" and can
 * never be read as "not determined yet", and that no arm, including the one Android
 * actually sends, moves a consent decision. The last block is
 * `native/CONTRACT.md` read as a table, checked against the core's own
 * [ConsentSnapshot.decision] rather than against a copy of the rule.
 */
class C15tTrackingTest {
	private val json = Json { ignoreUnknownKeys = true }

	@Test
	fun `android reports the arm for a platform with no gate, never not-determined`() {
		assertEquals(C15tTrackingAuthorization.UNSUPPORTED, C15tTracking.status)
		assertNotEquals(
			"`unsupported` means the platform asks nothing; `not-determined` means a " +
				"subject is still owed a question. The JavaScript combinator reads them " +
				"oppositely, so they must stay two arms.",
			C15tTrackingAuthorization.NOT_DETERMINED.wireValue,
			C15tTracking.status.wireValue,
		)
	}

	@Test
	fun `the arm spellings are the ones the JavaScript protocol compares against`() {
		val expected = mapOf(
			C15tTrackingAuthorization.AUTHORIZED to "authorized",
			C15tTrackingAuthorization.DENIED to "denied",
			C15tTrackingAuthorization.NOT_DETERMINED to "not-determined",
			C15tTrackingAuthorization.RESTRICTED to "restricted",
			C15tTrackingAuthorization.UNSUPPORTED to "unsupported",
		)

		assertEquals(
			"every arm in the shared vocabulary reaches the wire",
			expected.keys,
			C15tTrackingAuthorization.entries.toSet(),
		)
		for ((arm, wire) in expected) {
			// Written against strings so a renamed `wireValue` fails rather than
			// agreeing with itself. `not-determined` is the one a hand-written reader
			// gets wrong.
			assertEquals(wire, arm.wireValue)
		}
	}

	@Test
	fun `the tracking payload carries the arm and nothing else`() {
		val payload = parse(C15tPayload.trackingAuthorization(C15tTracking.status))

		assertEquals(
			"no consent field may ride along on a platform answer",
			listOf("status"),
			payload.keys.toList(),
		)
		assertEquals("unsupported", payload["status"]!!.jsonPrimitive.content)
	}

	@Test
	fun `a tracking request has a rejection code the host can branch on`() {
		// The two codes the JavaScript contract names. Android only ever has one.
		assertEquals("C15T_TRACKING_UNSUPPORTED", C15tTracking.REJECT_UNSUPPORTED)
		assertTrue(
			"the message has to answer the question the refusal raises",
			C15tTracking.MESSAGE_UNSUPPORTED.contains("c15t decision alone"),
		)
	}

	@Test
	fun `no tracking arm moves a consent decision`() {
		val granted = ConsentState(measurement = true)
		val refused = granted.copy(measurement = false)
		val snapshots = listOf(
			ConsentDecision.GRANTED to ConsentSnapshot(
				policyPending = false,
				ready = true,
				effectivePermissions = granted,
			),
			ConsentDecision.DENIED to ConsentSnapshot(
				policyPending = false,
				ready = true,
				effectivePermissions = refused,
			),
			// Pending with the permission already stored: the flags, not the
			// permission, are what is unanswered here.
			ConsentDecision.PENDING to ConsentSnapshot(
				policyPending = true,
				ready = false,
			),
		)

		for ((expected, snapshot) in snapshots) {
			val baseline = snapshot.decision(ConsentCategory.MEASUREMENT)
			assertEquals(expected, baseline)

			for (arm in C15tTrackingAuthorization.entries) {
				assertEquals(
					"arm ${arm.wireValue} moved a ${baseline.name} decision",
					baseline,
					snapshot.decision(ConsentCategory.MEASUREMENT),
				)
				assertTrue(
					"arm ${arm.wireValue} opened a ${baseline.name} category",
					!mayTrack(baseline, arm) || baseline == ConsentDecision.GRANTED,
				)
			}
		}
	}

	/** The combination rule, written from the contract's sentence, not from production code. */
	private fun mayTrack(
		decision: ConsentDecision,
		arm: C15tTrackingAuthorization,
	): Boolean = decision == ConsentDecision.GRANTED &&
		(arm == C15tTrackingAuthorization.AUTHORIZED || arm == C15tTrackingAuthorization.UNSUPPORTED)

	private fun parse(raw: String): JsonObject = json.parseToJsonElement(raw).jsonObject
}
