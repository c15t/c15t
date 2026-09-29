package com.c15t.android

import android.annotation.SuppressLint
import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.util.Log
import com.c15t.core.C15t

/**
 * Decides which connectivity callbacks are worth a queue replay.
 *
 * `native/CONTRACT.md` asks for a replay when the process *gains* a network it did not
 * have, and that is a transition rather than an event. [ConnectivityManager] reports the
 * already-connected network the instant a callback registers, and replaying there would
 * race the launch replay `C15tKernel.bootstrap` already performs. So the first delivery
 * only records the state, and a later one counts as a gain only once an [onLost] has
 * separated it from that seed.
 *
 * Kept free of Android types for the same reason `StorePaths` is: it is the part of this
 * module whose wrong answer is silent, and it is testable without a device.
 */
class ReachabilityGate(private val onGained: () -> Unit) {
	private var seeded = false
	private var connected = false

	/** The process has a network. The first such call seeds and replays nothing. */
	fun onAvailable() {
		if (!seeded) {
			seeded = true
			connected = true
			return
		}
		if (!connected) {
			connected = true
			onGained()
		}
	}

	/** The network this process had went away, so the next one is a gain. */
	fun onLost() {
		seeded = true
		connected = false
	}
}

/**
 * Replays the pending consent queue when the process gains a network it did not have.
 *
 * This is the narrowest of the three lifecycle legs and the only one a device can
 * decline. The system service refuses the registration unless the *application* declared
 * `android.permission.ACCESS_NETWORK_STATE`, and a consent SDK that put that permission
 * into every host's manifest would be spending the maintainer's privacy surface on a
 * wake-up. A refusal is therefore logged and the core keeps its launch and foreground
 * replays, which need no permission and are never optional.
 *
 * Callbacks arrive on the thread that registered, which is why [C15tAndroid.install]
 * registers on the main thread. [C15t.flushPending] then runs its pass on the thread that
 * called it -- it hands nothing to the core's executor, and a pass that wins the core's
 * guard here opens its connection on the main thread, where the platform refuses it and the
 * queue answers unreachable. The entries keep their place and the foreground leg, which does
 * run off the main thread, sends them. A host that wants the wake-up itself to fly should
 * drive the replay through [C15tAndroid]'s executor rather than call this one directly.
 */
class C15tReachability private constructor(
	private val manager: ConnectivityManager,
	private val callback: ConnectivityManager.NetworkCallback,
) {
	/** Stop listening. Calling this twice is harmless. */
	fun unregister() {
		try {
			manager.unregisterNetworkCallback(callback)
		} catch (error: IllegalArgumentException) {
			// Already unregistered by someone else. Nothing to undo.
			Log.d(TAG, "reachability callback was already unregistered")
		}
	}

	companion object {
		private const val TAG = "c15t"

		/**
		 * Start listening for network gains.
		 *
		 * @param context any context; only the application context's system services are
		 * used, so no Activity is retained.
		 * @param onGained called for each newly gained network, never for the one that
		 * was already up at registration.
		 * @returns the handle to keep, or `null` when this device or host will not allow
		 * the listener: no connectivity service, or a permission refusal.
		 */
		// The refusal below is handled rather than declared, on purpose: a host without
		// ACCESS_NETWORK_STATE gets a working SDK with one less wake-up, not a crash on
		// the launch path.
		@SuppressLint("MissingPermission")
		fun register(context: Context, onGained: () -> Unit): C15tReachability? {
			val manager = context.applicationContext.getSystemService(ConnectivityManager::class.java)
			if (manager == null) {
				Log.i(TAG, "no ConnectivityManager: c15t replays its queue on launch and foreground only")
				return null
			}

			val gate = ReachabilityGate(onGained)
			val callback = object : ConnectivityManager.NetworkCallback() {
				override fun onAvailable(network: Network) = gate.onAvailable()
				override fun onLost(network: Network) = gate.onLost()
			}

			return try {
				manager.registerDefaultNetworkCallback(callback)
				C15tReachability(manager, callback)
			} catch (error: SecurityException) {
				Log.i(
					TAG,
					"android.permission.ACCESS_NETWORK_STATE is not declared, so c15t cannot replay its " +
						"queue the moment a connection returns; launch and foreground still do",
				)
				null
			} catch (error: IllegalArgumentException) {
				// A default network request that the platform will not accept. Same
				// consequence as a refusal.
				Log.i(TAG, "cannot register a connectivity callback on this device: ${error.message}")
				null
			}
		}
	}
}
