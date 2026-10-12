package com.c15t.android

import android.content.Context
import android.os.SystemClock
import androidx.test.core.app.ApplicationProvider
import androidx.test.platform.app.InstrumentationRegistry
import com.c15t.core.C15t
import com.c15t.core.NativeConfig
import com.c15t.core.model.ConsentSubject
import com.c15t.core.model.KernelUser
import com.c15t.core.model.PolicyResolution
import com.c15t.core.model.QueuedSave
import com.c15t.core.transport.C15tTransport
import com.c15t.core.transport.InitContext
import com.c15t.core.transport.SaveOutcome
import com.c15t.core.transport.TransportOutcome
import java.io.File
import org.junit.Assert.fail

/**
 * What the instrumented tests share: the application under test, a backend that answers on
 * the test's terms, and waits that end on a fact rather than on a guessed pause.
 *
 * Every wait here polls something the core itself publishes. A connected test that slept a
 * fixed amount passes on a warmed emulator and flakes on a cold one, which is precisely how
 * a device suite ends up excluded from CI.
 */

/** The application the instrumented APK actually runs as. */
internal fun appContext(): Context = ApplicationProvider.getApplicationContext()

/**
 * A backend pointed at a host that cannot exist.
 *
 * `.invalid` is reserved by RFC 6761 and never resolves, so a request that escapes a test
 * dies at DNS instead of posting consent to somebody's real project from a shared emulator.
 */
internal fun deviceConfig(): NativeConfig = NativeConfig(portalUrl = "https://consent.instrumentation.invalid")

/**
 * Tear the running core down between tests.
 *
 * [C15t] is process-wide and the runner reuses one process for the whole suite, so a kernel
 * left installed would answer the next test's reads from the previous test's store.
 */
internal fun uninstallCore() {
	C15t.reset()
	awaitMainThread()
}

/**
 * Wait for the core the Initializer installed at process start to answer its first init.
 *
 * `androidx.startup` runs before the first test, and the install it performs hands that init
 * to the core's worker, which ends in a write to storage. A write landing after a test has
 * read the subject id would read as the core losing identity. The launch core never retries
 * on its own, so the published resolution moving past `unconfigured` is the honest end of it.
 */
internal fun awaitLaunchSettled() {
	val kernel = C15t.current ?: return
	awaitSettled("the launch init to be answered") {
		kernel.snapshot().resolution.status != PolicyResolution.STATUS_UNCONFIGURED
	}
}

/**
 * Run to the end of the main thread's queue.
 *
 * [C15tAndroid.install] posts the observer registrations to the main thread whenever it is
 * called from anywhere else, which is how an instrumentation test calls it. That queue is
 * FIFO, so a no-op that has come back means everything posted before it has already run.
 */
internal fun awaitMainThread() {
	InstrumentationRegistry.getInstrumentation().runOnMainSync { }
}

/**
 * Wait for [condition], naming what it waited for if it never happened.
 *
 * @param what the fact being waited for, used verbatim in the failure.
 * @param timeoutMs how long to keep polling before failing the test.
 * @param condition re-checked until true; must be cheap and side-effect free.
 * @throws AssertionError when [condition] never held inside [timeoutMs].
 */
internal fun awaitSettled(
	what: String,
	timeoutMs: Long = SETTLE_TIMEOUT_MS,
	condition: () -> Boolean,
) {
	val deadline = SystemClock.elapsedRealtime() + timeoutMs
	var settled = condition()
	while (!settled && SystemClock.elapsedRealtime() < deadline) {
		Thread.sleep(POLL_INTERVAL_MS)
		settled = condition()
	}
	if (!settled) {
		fail("timed out after $timeoutMs ms waiting for $what")
	}
}

/** The directory the SDK keeps its encrypted blobs in on this device. */
internal fun deviceStoreDirectory(context: Context): File = File(context.noBackupFilesDir, StorePaths.DIRECTORY)

/** One stored blob, addressed by its contract key. */
internal fun deviceBlob(
	context: Context,
	key: String,
): File = File(deviceStoreDirectory(context), key)

/**
 * Whether these bytes carry [needle] byte for byte.
 *
 * ISO-8859-1 maps bytes to characters one to one, so this is a byte search rather than an
 * accident of which UTF-8 sequence the ciphertext happens to decode to.
 */
internal fun ByteArray.containsPlaintext(needle: String): Boolean = toString(Charsets.ISO_8859_1).contains(needle)

/**
 * The subject id the installed core is answering with.
 *
 * A missing id fails here rather than at the comparison downstream: it is a precondition of
 * every identity assertion in this suite, not one of its outcomes.
 */
internal fun requireSubjectId(): String =
	checkNotNull(C15t.snapshot().subject) { "the core must always resolve a subject id" }.id

/** The newest consent write [subjectId] has queued on the device, or `null` when none is waiting. */
internal fun queuedSaveFor(
	context: Context,
	subjectId: String,
): QueuedSave? = C15tStores.create(context).readPending().lastOrNull { it.payload.subjectId == subjectId }

/**
 * The backend, with the emulator's connectivity taken out of the assertion.
 *
 * No consent assertion in this suite may depend on a network, so the test states whether the
 * device is online and this answers accordingly. [online] is volatile because the test flips
 * it from the instrumentation thread while the core reads it on its worker, which is the same
 * handoff a subject who takes a train and regains signal creates.
 */
internal class DeviceBackend(
	initiallyOnline: Boolean = false,
) : C15tTransport {
	/** Whether this fake answers at all, standing in for connectivity. */
	@Volatile
	var online: Boolean = initiallyOnline

	private val lock = Any()
	private val acceptedWrites = mutableListOf<QueuedSave>()
	private val saveCallers = mutableListOf<Thread>()
	private var inits = 0

	override fun init(context: InitContext): TransportOutcome =
		synchronized(lock) {
			inits += 1
			// Online answers with a backend that has no policy for this device, which is a
			// real state and not a shortcut: `isReady()` stays false and every optional
			// category stays PENDING, exactly as it does on a phone that reached a project
			// with nothing configured. Modelling a policy document here would test the fake.
			if (online) {
				TransportOutcome.HttpFailure(STATUS_NO_POLICY)
			} else {
				TransportOutcome.NetworkFailure("instrumented device is offline")
			}
		}

	override fun save(entry: QueuedSave): SaveOutcome {
		val caller = Thread.currentThread()
		return synchronized(lock) {
			saveCallers += caller
			if (online) {
				acceptedWrites += entry
				SaveOutcome.Delivered
			} else {
				SaveOutcome.Unavailable("instrumented device is offline")
			}
		}
	}

	override fun identify(
		subject: ConsentSubject,
		user: KernelUser,
	): TransportOutcome = TransportOutcome.NetworkFailure("no identity backend in an instrumented test")

	override fun logout(subject: ConsentSubject): TransportOutcome =
		TransportOutcome.NetworkFailure("no identity backend in an instrumented test")

	/** Writes this backend took, oldest first. */
	fun accepted(): List<QueuedSave> = synchronized(lock) { acceptedWrites.toList() }

	/** Every thread a save call ran on, which is what the main-thread claim is read from. */
	fun saveCallers(): List<Thread> = synchronized(lock) { saveCallers.toList() }

	/** How many inits the installed core asked for. A core that was thrown away asks for none. */
	fun initCount(): Int = synchronized(lock) { inits }

	private companion object {
		const val STATUS_NO_POLICY = 503
	}
}

private const val SETTLE_TIMEOUT_MS = 15_000L
private const val POLL_INTERVAL_MS = 20L
