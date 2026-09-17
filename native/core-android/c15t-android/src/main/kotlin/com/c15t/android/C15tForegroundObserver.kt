package com.c15t.android

import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import com.c15t.core.C15t
import com.c15t.core.spi.TaskExecutor
import java.util.concurrent.Executors

/**
 * Replays the offline queue and refreshes policy each time the process comes to the
 * foreground.
 *
 * The contract asks for a retry on launch, on foreground, and on a reachability
 * change; this covers the foreground leg, and [com.c15t.core.C15tKernel.bootstrap]
 * covers launch.
 *
 * The callback arrives on the main thread and the replay it triggers opens an HTTP
 * connection, which the platform refuses outright on that thread: `HttpURLConnection`
 * answers `NetworkOnMainThreadException`, the transport reports it as unreachable, and
 * the queue stays queued on a foreground that looked like it retried. So the replay is
 * handed to a worker before anything reaches the network, and coming back to the app
 * costs no frame. [C15tAndroid.install] passes the core's own executor, which is also
 * what keeps a launch replay and a foreground replay from delivering one entry twice.
 *
 * @param replayExecutor where the queue replay runs. The default is a daemon worker for
 * a host that registers this observer by hand; [C15tAndroid.install] passes the core's
 * executor instead.
 */
class C15tForegroundObserver(
	private val replayExecutor: TaskExecutor = OFF_MAIN,
) : DefaultLifecycleObserver {
	override fun onStart(owner: LifecycleOwner) {
		replayExecutor.execute { C15t.flushPending() }
		C15t.refresh()
	}

	companion object {
		private val io = Executors.newSingleThreadExecutor { runnable ->
			Thread(runnable, "c15t-replay").apply { isDaemon = true }
		}

		private val OFF_MAIN = TaskExecutor { task -> io.execute(task) }
	}
}
