@file:OptIn(ExperimentalSerializationApi::class)

package com.c15t.core.tc

import kotlinx.serialization.EncodeDefault
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable

/**
 * The IAB Global Vendor List, in the shape c15t's backend embeds under `/init`'s `gvl` key.
 *
 * Field-for-field this is `globalVendorListSchema` in `packages/schema/src/shared/gvl.ts`, and the
 * names are that schema's names rather than anything shorter: `/init`'s `gvl` carries the same
 * document the web reads from the upstream GVL endpoint, so a mobile reader that renamed a field
 * would have published a second vendor-list shape that nothing else can read.
 * [GlobalVendorListJson.toJsonElement] is the accessor a bridge sends, and it is required to agree
 * with this document name for name; inventing a compact mobile spelling here would be the one
 * mistake a consumer cannot discover until a dialog renders blank.
 *
 * Two things about the wire shape matter to a Kotlin reader:
 *
 *   * `purposes`, `specialPurposes`, `features`, `specialFeatures`, `stacks`, `vendors` and
 *     `dataCategories` are JSON objects keyed by a number written as a string, not arrays. The
 *     numbering is sparse -- GVL stacks skip ids, and vendors skip each one a withdrawn company
 *     leaves behind -- so reading one as a positional array would silently rename every entry after
 *     the first gap. They are keyed maps here for that reason, in the ascending id order the served
 *     document arrives in, which is also the order `Object.entries` hands the web.
 *   * The id inside an entry duplicates its key, and both web readers trust the key:
 *     `processPurposes` in `packages/iab/src/headless/dialog-data.ts` sets `id: Number(id)` from the
 *     key it is holding, and `@iabtechlabtcf/core`'s `GVL` overwrites `vendor.id` with the key the
 *     same way before the encoder ever asks. [toTcVendorList] does the same, so an entry whose body
 *     disagrees with its key cannot rename itself into a signal about somebody else.
 *
 * Optionality is faithful rather than completed. `descriptionLegal`, `deletedDate`, `dataRetention`,
 * `overflow`, `deviceStorageDisclosureUrl` and `dataCategories` are absent from a real document as
 * often as they are present, and the web reads them with `|| []` instead of inventing a value.
 * Reading an absent one as an empty list or a zero would put a claim into the document that
 * `v.optional(...)` never asked for, and this body goes to JavaScript unchanged, so every such field
 * is a nullable that [GlobalVendorListJson.toJsonElement] drops while it is null. A round trip
 * therefore returns the keys that went in, which is the claim
 * `served body round trips key for key` in `GlobalVendorListShapeTest` checks. The one key that
 * comes back absent instead of `null` is a key the document itself wrote as `null`: a typed field
 * cannot hold that apart from an absent key, and `v.optional(...)` means the two are the same
 * answer to everything downstream.
 *
 * This type carries no behaviour beyond the two questions the encoder asks of it, on purpose: it is
 * the document. The legal-basis reading lives on [TcVendorList], and the
 * acceptance rules live on [GlobalVendorListJson.fromInitBody].
 */
@Serializable
data class GlobalVendorList(
	/** Purposes the framework defines, keyed by purpose id. A list without them is refused. */
	val purposes: Map<Int, GvlLocalizedEntry>,
	/** Vendor declarations, keyed by vendor id. A list without them is refused. */
	val vendors: Map<Int, GvlVendorEntry>,
	/** Which vendor list this is: the number a TC String writes into VendorListVersion. */
	val vendorListVersion: Long,
	/** The TCF policy revision this list was published under, into TcfPolicyVersion. */
	val tcfPolicyVersion: Long,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val dataCategories: Map<Int, GvlLocalizedEntry>? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val features: Map<Int, GvlLocalizedEntry>? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val gvlSpecificationVersion: Long? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val lastUpdated: String? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val specialFeatures: Map<Int, GvlLocalizedEntry>? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val specialPurposes: Map<Int, GvlLocalizedEntry>? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val stacks: Map<Int, GvlStack>? = null,
) {
	/**
	 * The vendor [id] names, or null when this list does not carry it.
	 *
	 * Reads the map key rather than the entry's own `id` field, which is the key's authority
	 * described at the top of this type.
	 */
	fun vendor(id: Int): GvlVendorEntry? = vendors[id]
}

/**
 * A purpose, special purpose, feature, special feature, or data category.
 *
 * The GVL gives all five the same five fields -- `gvlPurposeSchema` and its four siblings in
 * `packages/schema` -- and c15t's dialog reads all five the same way
 * (`processPurposes`/`processSpecialPurposes`/`processFeatures`/`processSpecialFeatures`), so one
 * type stands in for all five here rather than four identical declarations.
 */
@Serializable
data class GvlLocalizedEntry(
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val id: Long? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val name: String? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val description: String? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val descriptionLegal: String? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val illustrations: List<String>? = null,
)

/** A stack: a named bundle of purposes and special features, as `gvlStackSchema`. */
@Serializable
data class GvlStack(
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val id: Long? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val name: String? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val description: String? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val purposes: List<Long>? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val specialFeatures: List<Long>? = null,
)

/**
 * What one vendor publishes about itself, as `gvlVendorSchema`.
 *
 * The four purpose lists are what a TC String is written against and so the only fields
 * [TcSemanticPreEncoder] consults. The rest is disclosure, which the bridge still forwards because
 * the dialog renders it: `mapGvlVendor` in `packages/iab/src/headless/dialog-data.ts` reads names,
 * retention, the policy link, and the cookie claims off this same record.
 *
 * @property deletedDate Present means withdrawn, and the encoder drops a positive signal for a
 * withdrawn vendor. The reference tests this field only for truthiness, so an empty string does not
 * withdraw -- [TcVendor.isDeleted] keeps that exactly.
 */
@Serializable
data class GvlVendorEntry(
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val id: Long? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val name: String? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val purposes: List<Long>? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val legIntPurposes: List<Long>? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val flexiblePurposes: List<Long>? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val specialPurposes: List<Long>? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val features: List<Long>? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val specialFeatures: List<Long>? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val deletedDate: String? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val dataCategories: List<Long>? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val dataRetention: GvlDataRetention? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val deviceStorageDisclosureUrl: String? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val cookieMaxAgeSeconds: Long? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val cookieRefresh: Boolean? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val usesCookies: Boolean? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val usesNonCookieAccess: Boolean? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val urls: List<GvlVendorUrl>? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val overflow: GvlVendorOverflow? = null,
)

/** Per-purpose retention, as `gvlVendorSchema.dataRetention`. Its keys are ids written as strings. */
@Serializable
data class GvlDataRetention(
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val purposes: Map<String, Long>? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val specialPurposes: Map<String, Long>? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val stdRetention: Long? = null,
)

/** A vendor's published policy link, as `gvlVendorUrlSchema`. */
@Serializable
data class GvlVendorUrl(
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val langId: String? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val legIntClaim: String? = null,
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val privacy: String? = null,
)

/** Grant-limit overflow, as `gvlVendorSchema.overflow`. */
@Serializable
data class GvlVendorOverflow(
	@EncodeDefault(EncodeDefault.Mode.NEVER)
	val httpGetLimit: Long? = null,
)
