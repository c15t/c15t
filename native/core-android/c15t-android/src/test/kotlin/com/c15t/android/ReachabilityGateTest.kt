package com.c15t.android

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Which connectivity callbacks earn a queue replay.
 *
 * Both directions matter. A replay on the network that was already up at registration
 * duplicates the launch replay `bootstrap` performs, and a replay that only fires on the
 * first flap leaves a subject's queued decision undelivered for the rest of a session
 * spent online.
 */
class ReachabilityGateTest {
	private class Recorder {
		var gains = 0

		val onGained: () -> Unit = { gains++ }
	}

	@Test
	fun `the network already up at registration is not a gain`() {
		val seen = Recorder()
		val gate = ReachabilityGate(seen.onGained)

		gate.onAvailable()

		assertEquals(0, seen.gains)
	}

	@Test
	fun `a network that arrives after a loss is a gain`() {
		val seen = Recorder()
		val gate = ReachabilityGate(seen.onGained)

		gate.onAvailable()
		gate.onLost()
		gate.onAvailable()

		assertEquals(1, seen.gains)
	}

	@Test
	fun `a link that flaps without dropping does not replay twice`() {
		val seen = Recorder()
		val gate = ReachabilityGate(seen.onGained)

		gate.onAvailable()
		gate.onAvailable()
		gate.onAvailable()

		assertEquals(0, seen.gains)
	}

	@Test
	fun `every real gain replays, not just the first`() {
		val seen = Recorder()
		val gate = ReachabilityGate(seen.onGained)

		repeat(3) {
			gate.onLost()
			gate.onAvailable()
		}

		assertEquals(3, seen.gains)
	}

	@Test
	fun `losing a network replays nothing`() {
		val seen = Recorder()
		val gate = ReachabilityGate(seen.onGained)

		gate.onLost()

		assertEquals(0, seen.gains)
	}
}
