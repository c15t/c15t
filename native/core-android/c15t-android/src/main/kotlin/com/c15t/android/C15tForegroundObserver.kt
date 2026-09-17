package com.c15t.android

import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import com.c15t.core.C15t

/**
 * Replays the offline queue and refreshes policy each time the process comes to the
 * foreground.
 *
 * The contract asks for a retry on launch, on foreground, and on a reachability
 * change; this covers the foreground leg, and [com.c15t.core.C15tKernel.bootstrap]
 * covers launch. It runs on the main thread but hands both calls to the core's
 * executor, so coming back to the app never blocks a frame on the network.
 */
class C15tForegroundObserver : DefaultLifecycleObserver {
	override fun onStart(owner: LifecycleOwner) {
		C15t.flushPending()
		C15t.refresh()
	}
}
