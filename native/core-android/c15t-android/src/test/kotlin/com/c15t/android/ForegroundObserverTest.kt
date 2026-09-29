package com.c15t.android

import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Which thread the foreground replay runs on, from the cheapest distance to the bug.
 *
 * [DeviceLifecycleTest] proves the rule where it bites: on a device the platform refuses a
 * connection made from a lifecycle callback, the transport reports that as unreachable, and the
 * queue silently never drains. A JVM cannot see the refusal, so this pins the handoff the fix is
 * made of, which is the same thing a wrong answer to the device test looks like.
 */
class ForegroundObserverTest {
	@Test
	fun `the foreground leg hands the queue replay to its executor instead of running it inline`() {
		val handed = mutableListOf<() -> Unit>()
		val observer = C15tForegroundObserver { task -> handed.add(task) }

		observer.onStart(noLifecycle)

		assertEquals(
			"the replay has to arrive as work handed over, not as a call made on the thread " +
				"the lifecycle callback arrived on",
			1,
			handed.size,
		)
	}

	/** The observer never reads the owner, so this stands in for a process lifecycle. */
	private val noLifecycle: LifecycleOwner
		get() = object : LifecycleOwner {
			override val lifecycle: Lifecycle
				get() = throw UnsupportedOperationException("the observer must not read the lifecycle")
		}
}
