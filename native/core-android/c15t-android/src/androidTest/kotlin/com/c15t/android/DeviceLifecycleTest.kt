package com.c15t.android

import android.Manifest
import android.content.pm.PackageManager
import android.os.Looper
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ProcessLifecycleOwner
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.c15t.core.C15t
import com.c15t.core.CommitIntent
import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentDecision
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * The lifecycle ports, on a device, where they are the only thing that can answer.
 *
 * [ReachabilityGateTest] already pins which connectivity callbacks earn a replay, and
 * `C15tKernel.bootstrap`'s launch retry is covered in `:c15t-core`. What a JVM cannot say is
 * whether the observer `install` registers is actually attached to the process, whether the
 * leg it fires on stays off the main thread, and what the platform answers when a host has
 * not asked for the permission the third leg needs.
 *
 * Test methods are named `test<Behaviour>` rather than in backticks because DEX 039, which is
 * what minSdk 24 dexes to, refuses a space in a method name.
 */
@RunWith(AndroidJUnit4::class)
class DeviceLifecycleTest {
	@Before
	fun startFromAnUninstalledCore() {
		awaitLaunchSettled()
		uninstallCore()
	}

	@After
	fun leaveNoCoreInstalled() {
		uninstallCore()
	}

	/**
	 * A write the device could not deliver is replayed when the process comes to the
	 * foreground, which is the leg `ProcessLifecycleOwner` is registered for.
	 */
	@Test
	fun testForegroundArrivalReplaysAWriteTheDeviceCouldNotDeliver() {
		val context = appContext()
		val backend = DeviceBackend()
		C15tAndroid.install(context, deviceConfig(), transport = backend)
		val subjectId = requireSubjectId()
		assertTrue("the offline commit itself succeeds", C15t.save(CommitIntent.All).ok)

		val waiting = queuedSaveFor(context, subjectId)
		assertNotNull("and it is waiting on the device", waiting)

		// The replay this test wants is the one arriving in the foreground causes, so the
		// process has to leave it first: a previous test's Activity may still be holding it
		// up, and `install` itself already ran the launch retry while the queue was empty.
		awaitBackground()
		backend.online = true
		val foreground = ActivityScenario.launch(C15tForegroundHostActivity::class.java)
		try {
			awaitSettled("the foreground arrival to replay the queue") { backend.accepted().contains(waiting) }
			awaitSettled("the replayed write to leave the device queue") {
				queuedSaveFor(context, subjectId) == null
			}
		} finally {
			foreground.close()
		}
	}

	/**
	 * The foreground replay does not run its network call on the main thread. A lifecycle
	 * callback arrives on the main thread, and the platform refuses HTTP there outright.
	 */
	@Test
	fun testForegroundReplayDoesNotOpenAConnectionOnTheMainThread() {
		val context = appContext()
		val backend = DeviceBackend()
		C15tAndroid.install(context, deviceConfig(), transport = backend)
		val subjectId = requireSubjectId()
		assertTrue(C15t.save(CommitIntent.All).ok)
		assertNotNull("the write is queued", queuedSaveFor(context, subjectId))

		awaitBackground()
		backend.online = true
		val foreground = ActivityScenario.launch(C15tForegroundHostActivity::class.java)
		try {
			awaitSettled("the foreground arrival to replay the queue") { backend.accepted().isNotEmpty() }

			// A lifecycle callback runs on the main thread, and the platform refuses an HTTP
			// request there outright: `HttpURLConnection` answers `NetworkOnMainThreadException`,
			// the transport reports it as unreachable, and the queue quietly never drains on a
			// foreground that looks like it worked. The observer's own comment promises the
			// opposite, so the promise is an assertion now.
			val main = Looper.getMainLooper().thread
			val onMain = backend.saveCallers().filter { it === main }
			assertTrue(
				"the replay reached the backend on " +
					"${backend.saveCallers().map { it.name }.distinct()}, and none of those may be the main thread",
				onMain.isEmpty(),
			)
		} finally {
			foreground.close()
		}
	}

	/**
	 * A host that did not ask for `ACCESS_NETWORK_STATE` still installs, and the reachability
	 * port reports the decline instead of throwing.
	 */
	@Test
	fun testHostWithoutNetworkStateStillInstallsAndReachabilityPortDeclines() {
		val context = appContext()
		val permissions = context.packageManager
			.getPackageInfo(context.packageName, PackageManager.GET_PERMISSIONS)
			.requestedPermissions
			.orEmpty()
			.toSet()

		assertFalse(
			"a consent SDK that put ACCESS_NETWORK_STATE into every host's manifest would be " +
				"spending the maintainer's privacy surface on a wake-up",
			permissions.contains(Manifest.permission.ACCESS_NETWORK_STATE),
		)

		var gains = 0
		val handle = C15tReachability.register(context) { gains += 1 }

		assertNull("the platform refuses the callback this host never asked to make", handle)

		// The refusal is a declined leg, not a failed launch: the two replays that need no
		// permission are still wired, and reads still answer.
		C15tAndroid.install(context, deviceConfig(), transport = DeviceBackend())

		assertNotNull("install completed despite the refusal", C15t.current)
		assertTrue(C15t.isAllowed(ConsentCategory.NECESSARY))
		assertEquals(ConsentDecision.PENDING, C15t.decision(ConsentCategory.MEASUREMENT))
		assertEquals("a refused registration must not fire anything later either", 0, gains)
	}

	/**
	 * Take the process out of the foreground and wait for the lifecycle to agree.
	 *
	 * `ProcessLifecycleOwner` holds the process in the foreground for a short grace period
	 * after the last Activity stops, on purpose, so the wait is on the state itself and not on
	 * a pause that guesses at that window.
	 */
	private fun awaitBackground() {
		awaitSettled("the process to leave the foreground") {
			ProcessLifecycleOwner.get().lifecycle.currentState < Lifecycle.State.STARTED
		}
	}
}
