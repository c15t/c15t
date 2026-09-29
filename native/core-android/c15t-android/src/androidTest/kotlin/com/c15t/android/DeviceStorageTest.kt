package com.c15t.android

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.c15t.core.C15t
import com.c15t.core.CommitIntent
import com.c15t.core.model.ConsentCategory
import com.c15t.core.model.ConsentDecision
import com.c15t.core.store.C15tStoreKeys
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
 * The storage ports on the device they were written for.
 *
 * `:c15t-core` proves hydration and key loss against doubles, and [KeyLossIdentityTest] gets
 * as close as a JVM allows by pulling a software key out from under the codec. What neither
 * can reach is the platform: an AndroidKeyStore entry that is really gone, files that really
 * sit under `noBackupFilesDir`, and a relaunch that means a second install over the same
 * bytes.
 *
 * Test methods are named `test<Behaviour>` rather than in backticks because DEX 039, which is
 * what minSdk 24 dexes to, refuses a space in a method name.
 */
@RunWith(AndroidJUnit4::class)
class DeviceStorageTest {
	@Before
	fun startFromAnUninstalledCore() {
		awaitLaunchSettled()
		uninstallCore()
	}

	@After
	fun leaveNoCoreInstalled() {
		uninstallCore()
	}

	/** A consent action written on the device comes back, unchanged, on the next launch. */
	@Test
	fun testConsentActionWrittenOnTheDeviceComesBackOnTheNextLaunch() {
		val context = appContext()
		val offline = DeviceBackend()
		C15tAndroid.install(context, deviceConfig(), transport = offline)

		val subjectId = requireSubjectId()
		val commit = C15t.save(CommitIntent.All)
		assertTrue("the commit is local and synchronous", commit.ok)
		assertTrue("the payload is persisted before anything goes on the wire", commit.queued)
		assertFalse("and this device has no network", commit.delivered)

		val waiting = queuedSaveFor(context, subjectId)
		assertNotNull("the write waits in the device's own queue", waiting)
		val queued = requireNotNull(waiting)
		val recorded = C15t.snapshot().explicitChoice
		assertNotNull("the subject's choice is on the snapshot", recorded)
		val choice = requireNotNull(recorded)

		val envelope = deviceBlob(context, C15tStoreKeys.SNAPSHOT)
		assertTrue("consent lands under noBackupFilesDir", envelope.isFile)
		assertFalse(
			"a record that carries its own subject id in the clear is not encrypted",
			envelope.readBytes().containsPlaintext(subjectId),
		)
		assertFalse(
			"identity sits off the encrypted path, out of reach of a key reset",
			deviceBlob(context, C15tStoreKeys.SUBJECT).exists(),
		)

		// The relaunch: a new kernel over the same files, built the way a host builds one.
		uninstallCore()
		val relaunch = DeviceBackend()
		C15tAndroid.install(context, deviceConfig(), transport = relaunch)

		assertTrue("hydration found the stored envelope", C15t.hasStoredSnapshot)
		assertEquals("the installation keeps its identity", subjectId, requireSubjectId())
		assertEquals("the choice comes back as it was committed", choice, C15t.snapshot().explicitChoice)
		assertEquals(
			"the queue survives a teardown unchanged, so a later init cannot rewrite it",
			queued,
			queuedSaveFor(context, subjectId),
		)

		// The launch-retry leg on real storage: the same payload, delivered unchanged.
		relaunch.online = true
		C15t.flushPending()
		awaitSettled("the relaunch to deliver the queued write unchanged") { relaunch.accepted().contains(queued) }
		assertNull("a delivered write leaves the device queue", queuedSaveFor(context, subjectId))
	}

	/** A revoked AndroidKeyStore entry costs the records and not the subject id. */
	@Test
	fun testRevokedKeystoreKeyCostsTheRecordsAndNotTheSubjectId() {
		val context = appContext()
		C15tAndroid.install(context, deviceConfig(), transport = DeviceBackend())
		val subjectId = requireSubjectId()
		assertTrue("the device takes the decision", C15t.save(CommitIntent.All).ok)
		assertTrue(
			"the record has to be on disk before the key goes",
			deviceBlob(context, C15tStoreKeys.SNAPSHOT).isFile,
		)

		// The real alias, destroyed through the real keystore. Every blob already on disk now
		// refuses to authenticate, which is the field failure the whole identity layout exists
		// for and the one a JVM test can only imitate.
		KeystoreKeyProvider(context).deleteKey()
		uninstallCore()

		val after = C15tStores.create(context)
		assertNull("blobs under a dead key read as nothing stored", after.readEnvelope())

		C15t.bootstrap(deviceConfig(), after, transport = DeviceBackend(initiallyOnline = true))

		assertEquals("identity lives where a key reset cannot reach it", subjectId, requireSubjectId())
		assertFalse("and the relaunch mints nothing new", C15t.hasStoredSnapshot)
		assertFalse("the choice went with the records", C15t.snapshot().ready)
		assertNull("so there is no cached decision left to serve", C15t.snapshot().explicitChoice)
		assertTrue("the device is deny-all with a pending policy", C15t.snapshot().policyPending)
		for (category in ConsentCategory.OPTIONAL) {
			assertFalse("$category stays denied until a policy resolves", C15t.isAllowed(category))
			assertEquals(
				"$category is unanswered, which is not the subject's own refusal",
				ConsentDecision.PENDING,
				C15t.decision(category),
			)
		}

		// A dead alias is not a dead install. The regenerated key encrypts again, so the next
		// decision survives the next relaunch instead of the device being stranded deny-all.
		assertTrue(C15t.save(CommitIntent.Necessary).ok)
		awaitSettled("the regenerated key to write the next record") {
			C15tStores.create(context).readEnvelope() != null
		}
	}
}
