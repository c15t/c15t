package com.c15t.core.tc

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertSame
import kotlin.test.assertTrue

/**
 * The publisher's vendor scope, applied to a served list, graded against the shared vectors.
 *
 * The oracle is `narrowGVLToVendors` in `packages/iab/src/tcf/fetch-gvl.ts`: the generator calls
 * that function and writes down what came back, so a difference here is Kotlin and the browser
 * build reading the same document differently, and `native/CONTRACT.md` settles that argument in
 * the web's favour. Three surfaces of this core get the same nine vectors, because the core owns
 * two narrowing paths and only one of them is on the happy path:
 *
 *   * [narrowToVendorIds], the typed prune a decoded list takes on its way into a snapshot, a
 *     bridge payload, and a stored envelope;
 *   * [narrowVendorListElement], the byte-level prune for a served `gvl` that never went through a
 *     decode, which is where the backend stands when it writes its cache;
 *   * [toTcVendorList] on the pruned result, because a vendor that survives a scope is a vendor a
 *     TC String may write a signal for, and one that does not survive must not appear in the
 *     string at all.
 *
 * The claims this file makes are the ones the disclosure promise rests on. The surviving keys and
 * their order come from the fixture rather than from a sort this file chose, so "32 declared
 * partners" is measured rather than assumed; the surviving entries are compared field for field,
 * so a survivor cannot arrive rebuilt; and the records beside `vendors` are compared as served,
 * because a list narrowed to one vendor still has to name what purpose 7 is, and the two version
 * numbers a TC String advertises do not belong to a publisher's scope either.
 */
class VendorListScopeFixturesTest {
	private val json = Json { ignoreUnknownKeys = true }

	private val fixtures: List<VendorListScopeFixture> = VendorListScopeFixtures.load()

	/** The kind these vectors carry, spelled once so the two counts below name the same thing. */
	private val kind: String = VendorListScopeFixtures.KIND

	/** The declared scope in the `Int` keys both narrowing helpers take. `null` stays `null`. */
	private fun scopeOf(fixture: VendorListScopeFixture): List<Int>? =
		fixture.scope?.map { id -> id.toInt() }

	/**
	 * The typed prune's surviving keys, in [Long] for comparison with the fixture.
	 *
	 * The core keys its vendor map by `Int` and the document's keys are numbers written as
	 * strings, so the two meet here rather than in a cast at each call site.
	 */
	private fun typedKeys(fixture: VendorListScopeFixture): List<Long> =
		narrowTyped(fixture).vendors.keys.map { key -> key.toLong() }

	/**
	 * The typed prune. Fails the run if the served document is one this build cannot read, which
	 * would make every other claim here vacuous.
	 */
	private fun narrowTyped(fixture: VendorListScopeFixture): GlobalVendorList {
		val served = GlobalVendorListJson.read(fixture.served)
		assertTrue(served != null, "${fixture.id}: the served document in the fixture is not readable by GlobalVendorListJson.read")
		return served.narrowToVendorIds(scopeOf(fixture))
	}

	/** The byte prune's surviving keys, so the order claim is made in one key space on both paths. */
	private fun byteKeys(fixture: VendorListScopeFixture): List<Long> =
		VendorListScopeFixtures.vendorKeysOf(narrowBytes(fixture))

	private fun narrowBytes(fixture: VendorListScopeFixture): JsonObject {
		val pruned = narrowVendorListElement(fixture.served, scopeOf(fixture))
		assertTrue(pruned is JsonObject, "${fixture.id}: narrowVendorListElement returned ${pruned?.let { it::class.simpleName } ?: "null"} for a served object")
		return pruned
	}

	// -- accounting -----------------------------------------------------------

	/**
	 * Every `vendor-list-scope` entry `index.json` lists is graded by this file.
	 *
	 * Counted from the index rather than from a list of ids written here, so a tenth vector
	 * published by the vectors lane is claimed automatically or reported, and cannot go unrun.
	 */
	@Test
	fun `every vendor-list-scope fixture is claimed`() {
		val claimed = fixtures.map { fixture -> fixture.id }.sorted()
		val listed = VendorListScopeFixtures.ids()
		assertEquals(listed, claimed, "index.json lists ${listed.size} $kind, this file graded ${claimed.size}")
		assertTrue(claimed.isNotEmpty(), "no vendor-list-scope fixtures were loaded, so the counts below are empty rather than green")
		println(
			"VENDOR LIST SCOPE CLAIMS: android claimed=${claimed.size}/${listed.size} unclaimed=0  " +
				"(shapes: ${fixtures.map { fixture -> fixture.shape }.sorted().joinToString(", ")})"
		)
	}

	// -- the surviving keys and their order -----------------------------------

	/**
	 * The surviving `vendors` keys, and the order they survive in, on both narrowing paths.
	 *
	 * Order is not decoration: it is the order the served document put the drawer in, and both
	 * web filters keep it by iterating the document's own keys rather than the order the host
	 * typed the allowlist. Kotlin hands back a `Map` that keeps insertion order on both paths,
	 * so the order the fixture states is comparable directly, on the typed list and on the bytes.
	 */
	@Test
	fun `the surviving vendor keys and their order match the fixture`() {
		for (fixture in fixtures) {
			val expectedOrder = fixture.expectedVendorKeys
			assertEquals(expectedOrder, typedKeys(fixture), "${fixture.id}: the typed prune returned the wrong keys or the wrong order")
			assertEquals(expectedOrder, byteKeys(fixture), "${fixture.id}: the byte prune returned the wrong keys or the wrong order")
			assertEquals(
				expectedOrder,
				VendorListScopeFixtures.vendorKeysOf(fixture.expectedDocument),
				"${fixture.id}: expected.document and expected.vendorKeys disagree with each other"
			)
		}
	}

	/**
	 * A scope that reaches past the last assignment keeps the served order and adds nothing.
	 *
	 * The vector whose scope is 947 ids names every id the framework has ever handed out, and the
	 * answer is exactly the served document: ordering is the document's, and a wider scope buys a
	 * core no extra vendor, which is the same claim the 609-id vector past the query cap makes for
	 * the two served ids that fall outside it.
	 */
	@Test
	fun `a scope wider than the list changes nothing about order`() {
		for (fixture in fixtures.filter { fixture -> fixture.shape == "scope-wider-than-list" || fixture.shape == "scope-above-query-cap" }) {
			val survivors = typedKeys(fixture)
			assertEquals(fixture.servedVendorKeys.filter { id -> fixture.scope!!.contains(id) }, survivors, "${fixture.id}: survivors are the served ids the scope names, in served order")
			assertTrue(survivors.size < fixture.scopeSize, "${fixture.id}: the scope names more vendors than the document carries, so it cannot be satisfied")
		}
	}

	// -- nothing is invented, nothing is renamed ------------------------------

	/**
	 * An id the served document does not carry contributes no entry.
	 *
	 * The unknown-id vector declares three ids, one of which is served, and the answer is one
	 * vendor -- not three. A fabricated entry would reach [toTcVendorList] as a declaration no GVL
	 * revision stands behind, which is contract rule 5 wearing a friendlier face, and the two
	 * numbers here are the ones no company ever published: a made-up six-figure id and one past
	 * the 16 bits a TC String vendor field can even hold.
	 */
	@Test
	fun `a scope id the list does not carry is never added`() {
		val fixture = fixtures.first { candidate -> candidate.shape == "scope-unknown-id" }
		val pruned = narrowBytes(fixture)
		assertEquals(listOf(11L), VendorListScopeFixtures.vendorKeysOf(pruned), "${fixture.id}: only the served id survives")
		val served = GlobalVendorListJson.read(fixture.served)!!
		val narrowed = served.narrowToVendorIds(scopeOf(fixture))
		assertEquals(1, narrowed.vendors.size, "${fixture.id}: the typed prune invented an entry")
		assertTrue(66_001 !in narrowed.vendors.keys, "${fixture.id}: an id past the 16-bit vendor field cannot be disclosed by a TC String anyway")
	}

	/**
	 * Selection follows the map key, and an entry whose body states another id earns nothing by it.
	 *
	 * The vectors plant a pair -- the record keyed 7 states 11, the record keyed 11 states 7 -- so
	 * a filter that consulted bodies would keep the opposite pair for the same scope and every
	 * count in this file would still pass. That is why the claim is about which key survived, which
	 * name arrived with it, and which vendor the encoder is finally told about -- not about how many
	 * entries came back. An entry that could rename itself with its own `id` field could answer for
	 * a vendor the publisher never named.
	 *
	 * The entry's own `id` field is served data and the prune does not touch it, so on this vector
	 * the survivor under key 7 still states 11 in its body. Neither core rewrites it: Kotlin reads
	 * the document as served and takes the identity from the key at [toTcVendorList], where
	 * `@iabtechlabtcf/core`'s `GVL` overwrites `vendor.id` with the key and `mapGvlVendor` in
	 * `dialog-data.ts` does `id: Number(vendorId)`. The graded claim is therefore what the encoder
	 * is told, which is the last place a wrong answer could still reach a subject.
	 */
	@Test
	fun `a vendor is chosen by its key and not by the id inside its body`() {
		val fixture = fixtures.first { candidate -> candidate.shape == "scope-key-not-body-id" }
		val pruned = narrowBytes(fixture)
		assertEquals(listOf(7L), VendorListScopeFixtures.vendorKeysOf(pruned), "${fixture.id}: the record keyed 11 is not in the scope, whatever its body claims")
		val survivor = pruned["vendors"]!!.jsonObject["7"]!!.jsonObject
		assertEquals("Vendor 7", (survivor["name"] as? kotlinx.serialization.json.JsonPrimitive)?.content, "${fixture.id}: the survivor is the entry served under key 7")
		val served = GlobalVendorListJson.read(fixture.served)!!
		val narrowedTyped = served.narrowToVendorIds(scopeOf(fixture))
		val survivorEntry = narrowedTyped.vendors[7]
		assertTrue(survivorEntry != null, "${fixture.id}: key 7 disappeared from the typed prune")
		assertEquals(11L, survivorEntry!!.id, "${fixture.id}: the prune rewrote the served entry's own id field instead of carrying it over")
		val declared = narrowedTyped.toTcVendorList()
		assertTrue(declared.vendor(7) != null, "${fixture.id}: the encoder is not told about the vendor the scope named by key")
		assertTrue(declared.vendor(11) == null, "${fixture.id}: an entry's body id bought a signal the publisher never scoped")

		// The mirror: a scope naming the other half of the pair keeps that record and its name,
		// still not the number it claims to be.
		val mirrored = narrowVendorListElement(fixture.served, listOf(11)) as JsonObject
		assertEquals(listOf(11L), VendorListScopeFixtures.vendorKeysOf(mirrored), "${fixture.id}: the pair is symmetric -- scoping 11 keeps the record keyed 11")

		// And across every vector: no survivor was ever able to buy a different name, because the
		// fixture's own transcript says which key states which id, in both documents.
		for (vector in fixtures) {
			val kept = VendorListScopeFixtures.vendorKeysOf(narrowBytes(vector))
			vector.surviving.forEachIndexed { index, claim ->
				assertEquals(claim.key, kept[index], "${vector.id}: survivor number ${index + 1} is not the key the fixture reported")
				val entry = narrowBytes(vector)["vendors"]!!.jsonObject[claim.key.toString()]!!.jsonObject
				val stated = (entry["id"] as? kotlinx.serialization.json.JsonPrimitive)?.content?.toLongOrNull()
				assertEquals(claim.bodyId, stated, "${vector.id}: the entry keyed ${claim.key} states ${stated}, and the fixture says ${claim.bodyId}")
				if (claim.bodyIdDiffersFromKey) {
					assertTrue(stated != claim.key, "${vector.id}: key ${claim.key} was reported as disagreeing with its body, and now it does not")
				}
			}
		}
	}

	// -- what a survivor keeps ------------------------------------------------

	/**
	 * A surviving entry is the served entry: every field, optional included.
	 *
	 * The prune may remove records and nothing else, so the survivor that leans on `dataRetention`
	 * and `overflow` has to arrive with both, and `carriesOptionalFields` is the fixture's own
	 * statement about which survivors those are. The same comparison is then made whole: the
	 * pruned `vendors` record against the fixture's, byte for byte, which is the claim "carried
	 * over" makes and not the weaker one about counts.
	 */
	@Test
	fun `a survivor arrives with the fields it was served with`() {
		for (fixture in fixtures) {
			val prunedVendors = narrowBytes(fixture)["vendors"]!!.jsonObject
			val servedVendors = fixture.served["vendors"]!!.jsonObject
			val expectedVendors = fixture.expectedDocument["vendors"]!!.jsonObject
			assertEquals(expectedVendors, prunedVendors, "${fixture.id}: the byte prune did not return the document the web filter returned")
			for (claim in fixture.surviving) {
				val key = claim.key.toString()
				val servedEntry = servedVendors[key]
				assertTrue(servedEntry != null, "${fixture.id}: ${claim.key} is served in the fixture and not in the document it narrowed")
				assertEquals(claim.carriesOptionalFields, VendorListScopeFixtures.OPTIONAL_VENDOR_FIELDS.any { field -> servedEntry.jsonObject.containsKey(field) }, "${fixture.id}: ${claim.key} optional-field claim does not match the document")
				if (claim.carriesOptionalFields) {
					assertTrue(
						VendorListScopeFixtures.OPTIONAL_VENDOR_FIELDS.any { field -> prunedVendors[key]!!.jsonObject.containsKey(field) },
						"${fixture.id}: ${claim.key} lost its optional fields on the way through the prune"
					)
				}
			}
		}
	}

	/**
	 * Everything beside `vendors` comes back exactly as served, version numbers included.
	 *
	 * `purposes`, `specialPurposes`, `features`, `specialFeatures`, `stacks`, `dataCategories` and
	 * `lastUpdated` describe the framework rather than the audience, and `processPurposes` in
	 * `packages/iab/src/headless/dialog-data.ts` walks the served `purposes` record to draw a
	 * dialog: pruning an unreferenced purpose for tidiness changes what that dialog claims
	 * independently of the scope anybody configured. The two versions are the expensive pair --
	 * `toTcVendorList` reads them straight into a TC String's VendorListVersion and
	 * TcfPolicyVersion -- so the versions vector numbers them somewhere nobody's default lives,
	 * and the fixture proves a scope of two ids moved neither.
	 */
	@Test
	fun `the records beside vendors are served data and stay served`() {
		for (fixture in fixtures) {
			val pruned = narrowBytes(fixture)
			for (key in VendorListScopeFixtures.SIBLING_KEYS) {
				assertEquals(fixture.served[key], pruned[key], "${fixture.id}: ${key} came back changed, and no scope was asked to touch it")
			}
			assertEquals(
				fixture.served["vendorListVersion"],
				fixture.expectedDocument["vendorListVersion"],
				"${fixture.id}: the expected document did not carry the list version forward"
			)
			assertEquals(
				fixture.served["tcfPolicyVersion"],
				fixture.expectedDocument["tcfPolicyVersion"],
				"${fixture.id}: the expected document did not carry the policy version forward"
			)
		}
	}

	/**
	 * The versions vector keeps numbers nobody defaults to.
	 *
	 * A core that rebuilt a narrowed list from its own constants would come back with the
	 * industry's current pair rather than 431 under policy 4, and the TC String it then encoded
	 * would advertise a list revision and a policy revision that nothing on the wire ever served.
	 */
	@Test
	fun `a narrow scope does not move the two version numbers`() {
		val fixture = fixtures.first { candidate -> candidate.shape == "scope-versions-preserved" }
		val narrowed = narrowTyped(fixture)
		assertEquals(listOf(43L, 62L), typedKeys(fixture), "${fixture.id}: the two declared ids, in served order")
		assertEquals(431L, narrowed.vendorListVersion, "${fixture.id}: vendorListVersion is the served document's, not a constant")
		assertEquals(4L, narrowed.tcfPolicyVersion, "${fixture.id}: tcfPolicyVersion is the served document's, not a constant")
		assertEquals(2, narrowed.vendors.size, "${fixture.id}: two declared ids, two survivors")
	}

	// -- no scope declared ----------------------------------------------------

	/**
	 * An empty scope and an absent scope both mean no scope, and neither empties the drawer.
	 *
	 * This is the fail-open half of the pair, and it is the mistake with the worst shape: a core
	 * that reads `[]` as "show nobody" leaves a publisher who never scoped anything with a
	 * preference centre with no vendors in it, under a consent the subject can still give. Web
	 * reads it that way twice over -- `narrowGVLToVendors` hands the list back for an empty array,
	 * and `gvlRequestUrl` does not append the parameter at all -- and both halves of this core do
	 * the same, on the typed path identity is kept, which is what [assertSame] proves.
	 */
	@Test
	fun `no scope declared leaves the whole list alone`() {
		val empty = fixtures.first { candidate -> candidate.shape == "scope-empty" }
		val absent = fixtures.first { candidate -> candidate.shape == "scope-absent" }
		for (fixture in listOf(empty, absent)) {
			assertTrue(fixture.unchanged, "${fixture.id}: the fixture claims a rebuilt document for a vector that declared no scope")
			val served = GlobalVendorListJson.read(fixture.served)!!
			assertSame(served, served.narrowToVendorIds(scopeOf(fixture)), "${fixture.id}: the typed prune copied a list that declared no scope")
			val untouched = narrowVendorListElement(fixture.served, scopeOf(fixture)) as JsonObject
			assertSame(fixture.served, untouched, "${fixture.id}: the byte prune rebuilt bytes that declared no scope")
			assertEquals(fixture.servedVendorKeys, typedKeys(fixture), "${fixture.id}: every served vendor has to survive")
			assertEquals(fixture.served, fixture.expectedDocument, "${fixture.id}: expected.document is not the document it started from")
		}
	}

	/**
	 * A pruned list still answers the two questions the TC String encoder asks of it.
	 *
	 * [toTcVendorList] is where a surviving vendor becomes a signal a subject can be asked about,
	 * so the pruned list has to still be a list it can build: the two versions carried through,
	 * the surviving vendors present, and nothing from the pruned half in reach. Out of a vector
	 * that declared 32 partners, this is the number the encoder would be able to name.
	 */
	@Test
	fun `the pruned list is still a list the encoder can read`() {
		for (fixture in fixtures) {
			val narrowed = narrowTyped(fixture)
			val tc = narrowed.toTcVendorList()
			assertEquals(narrowed.vendors.size, tc.vendors.size, "${fixture.id}: the encoder dropped or invented a vendor on the way in")
			assertEquals(narrowed.vendorListVersion, tc.vendorListVersion.toLong(), "${fixture.id}: the encoder read the list version off something other than the narrowed list")
			assertEquals(narrowed.tcfPolicyVersion, tc.tcfPolicyVersion.toLong(), "${fixture.id}: the encoder read the policy version off something other than the narrowed list")
		}
	}
}
