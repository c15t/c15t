/**
 * The mobile vendor list against the JavaScript kernel's, type by type.
 *
 * `src/protocol/gvl.ts` copies the served vendor list so a phone app never
 * installs the web consent stack, and `gvl.test.ts` compares the copy's names
 * with the ones Swift and Kotlin declare. Neither of those sees whether a copy
 * is still a copy in the ways a type checker can see: a member that changed
 * nullability, a key one side grew, the pair of them, which is how a vendor list
 * ends up rendering a blank row over a bridge that reported nothing.
 *
 * `@c15t/core` is the oracle here, exactly as `native/CONTRACT.md` rule 4 makes
 * it the oracle for both native cores, and exactly as
 * `vocabulary.type-test.ts` already uses it. Vitest does not check types, so
 * this file runs through `tsc -p tsconfig.type-tests.json`, which the package's
 * `check-types` script calls, and a drift is a compile error that names the pair.
 *
 * The comparisons are written one member at a time rather than one per
 * interface. A failure on a whole interface says two types differ; a failure on
 * `GlobalVendorList['stacks']` says which one moved.
 */

import type {
	GlobalVendorList as KernelGlobalVendorList,
	KernelIABState,
} from '@c15t/core';
import { expectTypeOf } from 'vitest';

import type { GlobalVendorList, GVLVendor, NativeIABState } from '../index';
import type { ConsentSnapshot } from '../snapshot';

/**
 * The kernel's view of one vendor entry.
 *
 * `@c15t/core` exports the document type rather than the entries inside it, so
 * the entry is read out of the map that holds it. That is the same type the
 * mirror's `GVLVendor` has to match.
 */
type KernelGVLVendor = KernelGlobalVendorList['vendors'][string];

/**
 * The vendor record without the one field a device cannot spell the web's way.
 *
 * `gvl.ts` explains the field; `Omit` on both sides keeps the comparison honest
 * about the rest, which is fifteen names and four lists with nothing to argue
 * about.
 */
type MirrorVendorFields = Omit<GVLVendor, 'cookieMaxAgeSeconds'>;
type KernelVendorFields = Omit<KernelGVLVendor, 'cookieMaxAgeSeconds'>;

// The names, exact. A key added on one side is a rename waiting to happen, so
// the key set is pinned as a literal rather than checked for containment.
expectTypeOf<keyof GlobalVendorList>().toEqualTypeOf<
	| 'dataCategories'
	| 'features'
	| 'gvlSpecificationVersion'
	| 'lastUpdated'
	| 'purposes'
	| 'specialFeatures'
	| 'specialPurposes'
	| 'stacks'
	| 'tcfPolicyVersion'
	| 'vendorListVersion'
	| 'vendors'
>();
expectTypeOf<keyof GVLVendor>().toEqualTypeOf<
	| 'cookieMaxAgeSeconds'
	| 'cookieRefresh'
	| 'dataCategories'
	| 'dataRetention'
	| 'deletedDate'
	| 'deviceStorageDisclosureUrl'
	| 'features'
	| 'flexiblePurposes'
	| 'id'
	| 'legIntPurposes'
	| 'name'
	| 'overflow'
	| 'purposes'
	| 'specialFeatures'
	| 'specialPurposes'
	| 'urls'
	| 'usesCookies'
	| 'usesNonCookieAccess'
>();

// The document, member by member. The nested records and their fields come along
// inside these, because these types are the ones holding them.
expectTypeOf<GlobalVendorList['dataCategories']>().toEqualTypeOf<
	KernelGlobalVendorList['dataCategories']
>();
expectTypeOf<GlobalVendorList['features']>().toEqualTypeOf<
	KernelGlobalVendorList['features']
>();
expectTypeOf<GlobalVendorList['gvlSpecificationVersion']>().toEqualTypeOf<
	KernelGlobalVendorList['gvlSpecificationVersion']
>();
expectTypeOf<GlobalVendorList['lastUpdated']>().toEqualTypeOf<
	KernelGlobalVendorList['lastUpdated']
>();
expectTypeOf<GlobalVendorList['purposes']>().toEqualTypeOf<
	KernelGlobalVendorList['purposes']
>();
expectTypeOf<GlobalVendorList['specialFeatures']>().toEqualTypeOf<
	KernelGlobalVendorList['specialFeatures']
>();
expectTypeOf<GlobalVendorList['specialPurposes']>().toEqualTypeOf<
	KernelGlobalVendorList['specialPurposes']
>();
expectTypeOf<GlobalVendorList['stacks']>().toEqualTypeOf<
	KernelGlobalVendorList['stacks']
>();
expectTypeOf<GlobalVendorList['tcfPolicyVersion']>().toEqualTypeOf<
	KernelGlobalVendorList['tcfPolicyVersion']
>();
expectTypeOf<GlobalVendorList['vendorListVersion']>().toEqualTypeOf<
	KernelGlobalVendorList['vendorListVersion']
>();

// The vendor record, field for field, and then the one field that is not the
// schema's. The schema asks for a present key whose value is null; both native
// cores store the claim as an absent key and say so in their own comments, so the
// mobile reader takes the spelling it can actually test. Asserting both sides
// keeps that from quietly becoming "the web changed and nobody noticed".
expectTypeOf<MirrorVendorFields>().toEqualTypeOf<KernelVendorFields>();
expectTypeOf<GVLVendor['cookieMaxAgeSeconds']>().toEqualTypeOf<
	number | undefined
>();
expectTypeOf<KernelGVLVendor['cookieMaxAgeSeconds']>().toEqualTypeOf<
	number | null
>();

// The nested records, by name. The comparisons above prove the types line up;
// these prove a name that only ever appeared inside a record is still the
// document's, which is where `VendorListRetentionTest` says a renamed key is the
// failure mode worth guarding.
expectTypeOf<keyof GlobalVendorList['purposes'][string]>().toEqualTypeOf<
	'description' | 'descriptionLegal' | 'id' | 'illustrations' | 'name'
>();
expectTypeOf<keyof GlobalVendorList['specialPurposes'][string]>().toEqualTypeOf<
	'description' | 'descriptionLegal' | 'id' | 'illustrations' | 'name'
>();
expectTypeOf<keyof GlobalVendorList['features'][string]>().toEqualTypeOf<
	'description' | 'descriptionLegal' | 'id' | 'illustrations' | 'name'
>();
expectTypeOf<keyof GlobalVendorList['specialFeatures'][string]>().toEqualTypeOf<
	'description' | 'descriptionLegal' | 'id' | 'illustrations' | 'name'
>();
expectTypeOf<keyof GlobalVendorList['stacks'][string]>().toEqualTypeOf<
	'description' | 'id' | 'name' | 'purposes' | 'specialFeatures'
>();
expectTypeOf<
	keyof NonNullable<GlobalVendorList['dataCategories']>[string]
>().toEqualTypeOf<'description' | 'id' | 'name'>();
expectTypeOf<keyof GVLVendor['urls'][number]>().toEqualTypeOf<
	'langId' | 'legIntClaim' | 'privacy'
>();
expectTypeOf<keyof NonNullable<GVLVendor['dataRetention']>>().toEqualTypeOf<
	'purposes' | 'specialPurposes' | 'stdRetention'
>();
expectTypeOf<
	keyof NonNullable<GVLVendor['overflow']>
>().toEqualTypeOf<'httpGetLimit'>();

// The IAB slot: the one name a device carries, and the kernel's own "no list yet".
expectTypeOf<keyof NativeIABState>().toEqualTypeOf<'gvl'>();
expectTypeOf<NativeIABState['gvl']>().toEqualTypeOf<GlobalVendorList | null>();
expectTypeOf<
	KernelIABState['gvl']
>().toEqualTypeOf<KernelGlobalVendorList | null>();

// And the snapshot holds the slot as nullable, which is what lets the `null`
// Android pins and the body iOS folds in share one declared type.
expectTypeOf<ConsentSnapshot['iab']>().toEqualTypeOf<NativeIABState | null>();
