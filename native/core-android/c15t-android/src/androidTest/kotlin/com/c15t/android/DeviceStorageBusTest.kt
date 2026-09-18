// Reading the bus the way an ad SDK does means the deprecated platform accessor for
// the application-default file. The production side takes the same trade.
@file:Suppress("DEPRECATION")

package com.c15t.android

import android.content.Context
import android.content.SharedPreferences
import android.preference.PreferenceManager
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.c15t.core.model.ConsentSnapshot
import com.c15t.core.model.ConsentSubject
import com.c15t.core.store.SnapshotEnvelope
import com.c15t.core.store.TcStorageBusKeys
import com.c15t.core.tc.GlobalVendorList
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * The one bus fact this module owns: the store an install builds carries a sink, and
 * that sink lands in the application-default `SharedPreferences`.
 *
 * `:c15t-core`'s `TcStorageBusTest` proves the projection fills the two rows a core
 * can honestly fill and that the store hands them over at the right moments, against
 * a recording double. What it cannot prove is the thing a vendor SDK depends on: that
 * a real install points that double's replacement at the file the specification tells
 * a reader to open. A sink aimed at a c15t-named preferences file, or none at all,
 * keeps every JVM test green and ships a device that publishes nothing, which is how
 * this file exists.
 *
 * Everything here reads the way an ad SDK reads -- `getInt` and `getString` on the
 * default file -- because a row written under the wrong type does not read across, and
 * the assertion is on the value at the other end rather than on the name of the class
 * that wrote it.
 *
 * Test methods are named `test<Behaviour>` rather than in backticks because DEX 039,
 * which is what minSdk 24 dexes to, refuses a space in a method name.
 */
@RunWith(AndroidJUnit4::class)
class DeviceStorageBusTest {
	@Before
	fun startFromAnUninstalledCore() {
		awaitLaunchSettled()
		uninstallCore()
		wipeDevice()
	}

	@After
	fun leaveNoConsentStateBehind() {
		uninstallCore()
		wipeDevice()
	}

	/**
	 * A core installed the way a host installs one publishes the bus it owns into the
	 * default preferences file, with the types the specification gives each row.
	 */
	@Test
	fun testInstalledCoreCarriesABusSinkInTheDefaultPreferencesFile() {
		val context = appContext()
		val defaults = defaultPreferences(context)

		// A device that already holds a list `/init` served, written by the same store
		// composition `C15tAndroid.install` opens. This commit is the assertion that the
		// installed store has somewhere to put the bus, before a kernel is in the room.
		val store = C15tStores.create(context)
		store.writeEnvelope(envelopeWithVendorList(tcfPolicyVersion = 5))
		store.flush()
		assertEquals(
			"the store an install builds publishes the row whose value it holds",
			5,
			defaults.getInt(TcStorageBusKeys.POLICY_VERSION, ABSENT),
		)

		// A previous CMP's row, and a key outside the specification's table that belongs
		// to a Google layer rather than to this bus.
		defaults.edit()
			.putString(TcStorageBusKeys.TC_STRING, "CMP-before-c15t")
			.putString(FOREIGN_KEY, "G-1")
			.apply()

		C15tAndroid.install(context, deviceConfig(), transport = DeviceBackend())

		assertEquals(
			"the installed core re-publishes the stored list, as a Number, read the way a vendor reads it",
			5,
			defaults.getInt(TcStorageBusKeys.POLICY_VERSION, ABSENT),
		)
		assertNull(
			"a whole-table write takes the previous CMP's row with it",
			defaults.getString(TcStorageBusKeys.TC_STRING, null),
		)
		assertEquals(
			"a bus wipe addresses the specification's table and nobody else's",
			"G-1",
			defaults.getString(FOREIGN_KEY, null),
		)
		assertEquals(
			"no policy resolved means no `gdprApplies` claimed -- absent is undetermined, and 0 is an answer",
			ABSENT,
			defaults.getInt(TcStorageBusKeys.GDPR_APPLIES, ABSENT),
		)
	}

	/** The application-default file, which is the file an ad SDK opens. */
	@Suppress("DEPRECATION")
	private fun defaultPreferences(context: Context): SharedPreferences =
		PreferenceManager.getDefaultSharedPreferences(context.applicationContext)

	/** An envelope carrying a served vendor list and no resolved policy. */
	private fun envelopeWithVendorList(tcfPolicyVersion: Long) = SnapshotEnvelope(
		snapshot = ConsentSnapshot.denyAll(ConsentSubject(id = "sub_buswire"), now = 0L),
		gvl = GlobalVendorList(
			purposes = emptyMap(),
			vendors = emptyMap(),
			vendorListVersion = 177L,
			tcfPolicyVersion = tcfPolicyVersion,
		),
	)

	/** Back to nothing stored, so the next test class starts where this one did. */
	private fun wipeDevice() {
		C15tStores.create(appContext()).clearConsentState()
		defaultPreferences(appContext()).edit().remove(FOREIGN_KEY).apply()
	}

	private companion object {
		/** A value `getInt` cannot produce, so an absent row reads as itself. */
		const val ABSENT = -1

		const val FOREIGN_KEY = "IABTCF_AddtlConsent"
	}
}
