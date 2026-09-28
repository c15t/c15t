/**
 * The mobile vocabulary against the JavaScript kernel's, type by type.
 *
 * `src/protocol/vocabulary.ts` copies the consent vocabulary out of `@c15t/core`
 * so a phone app never installs the web kernel. A copy is only safe while it is
 * still a copy, and a consent category that quietly disappears from one side is a
 * subject's decision going unrecorded, not a type error.
 *
 * `@c15t/core` is the oracle here, exactly as `native/CONTRACT.md` rule 4 makes it
 * the oracle for the Swift and Kotlin cores. Vitest does not check types, so this
 * file runs through `tsc -p tsconfig.type-tests.json`, which the package's
 * `check-types` script calls, and a drift is a compile error naming the pair.
 *
 * The runtime half of the same guarantee is in `vocabulary.test.ts`, which also
 * checks the spellings the Swift and Kotlin cores declare.
 */

import type {
	AllConsentNames as KernelAllConsentNames,
	CategoryDecision as KernelCategoryDecision,
	ChoiceBasis as KernelChoiceBasis,
	ConsentState as KernelConsentState,
	ConsentSubject as KernelConsentSubject,
	ExplicitChoice as KernelExplicitChoice,
	KernelActiveUI as KernelActiveUIType,
	KernelModel as KernelModelType,
	KernelOverrides as KernelOverridesType,
	KernelTranslations as KernelTranslationsType,
	KernelUser as KernelUserType,
	LocationResponse as KernelLocationResponse,
	OptionalConsentCategory as KernelOptionalConsentCategory,
	PolicyResolution as KernelPolicyResolution,
	PromptReason as KernelPromptReason,
	PromptRequirement as KernelPromptRequirement,
	RestrictionReason as KernelRestrictionReason,
	SavePayload as KernelSavePayload,
} from '@c15t/core';
import { expectTypeOf } from 'vitest';

import type { KernelUser, NativeSavePayload } from '../commit';
import type { NativeOverrides } from '../overrides';
import type { ConsentSnapshot, NativeModel } from '../snapshot';
import type {
	AllConsentNames,
	CategoryDecision,
	ChoiceBasis,
	ConsentState,
	ConsentSubject,
	ExplicitChoice,
	KernelActiveUI,
	KernelModel,
	KernelTranslations,
	LocationResponse,
	OptionalConsentCategory,
	PolicyResolutionStatus,
	PromptReason,
	PromptRequirement,
	RestrictionReason,
} from '../vocabulary';

/**
 * Write every property as mutable and non-optional-but-undefinable.
 *
 * The kernel puts `Readonly<>` on the members of the types it hands a transport,
 * and the bridge carries none of that: a JSON string has no mutability. Comparing
 * the two sides as they are written would report a difference no device can
 * observe, and would hide the ones it can.
 */
type Wire<T> = { -readonly [K in keyof T]: T[K] };

/**
 * `NativeOverrides`, projected the way it is written.
 *
 * `NativeOverrides` is deliberately not `KernelOverrides`: the snapshot's overrides
 * carry an explicit `null` rather than an absent key so a native serializer always
 * writes all four. Requiring that of a field the kernel has never heard of is the
 * point. `language` is the exception the contract grants a device, which always
 * resolves one, so it stays non-nullable.
 */
type NativeOverridesFromKernel = {
	[K in keyof KernelOverridesType]-?: K extends 'language'
		? string
		: Exclude<KernelOverridesType[K], undefined> | null;
};

// The category vocabulary: the names, the decidable subset, and the map gates read.
expectTypeOf<AllConsentNames>().toEqualTypeOf<KernelAllConsentNames>();
expectTypeOf<OptionalConsentCategory>().toEqualTypeOf<KernelOptionalConsentCategory>();
expectTypeOf<ConsentState>().toEqualTypeOf<KernelConsentState>();

// The snapshot enums, including the ones a native core refuses rather than approximates.
expectTypeOf<KernelModel>().toEqualTypeOf<KernelModelType>();
expectTypeOf<KernelActiveUI>().toEqualTypeOf<KernelActiveUIType>();
expectTypeOf<RestrictionReason>().toEqualTypeOf<KernelRestrictionReason>();
expectTypeOf<PromptReason>().toEqualTypeOf<KernelPromptReason>();
expectTypeOf<PromptRequirement>().toEqualTypeOf<KernelPromptRequirement>();
expectTypeOf<PolicyResolutionStatus>().toEqualTypeOf<
	KernelPolicyResolution['status']
>();

// The record shapes: what a subject's receipts and identity look like on the wire.
expectTypeOf<ChoiceBasis>().toEqualTypeOf<KernelChoiceBasis>();
expectTypeOf<CategoryDecision>().toEqualTypeOf<KernelCategoryDecision>();
expectTypeOf<ExplicitChoice>().toEqualTypeOf<KernelExplicitChoice>();
expectTypeOf<ConsentSubject>().toEqualTypeOf<KernelConsentSubject>();
expectTypeOf<LocationResponse>().toEqualTypeOf<KernelLocationResponse>();

// The translation bundle, which the native cores carry through untouched.
expectTypeOf<KernelTranslations>().toEqualTypeOf<KernelTranslationsType>();

// The save body. The pending queue replays it verbatim, so a field the kernel grew
// and this type did not is a write the backend reads as absent, with nothing failing
// on either side of the bridge.
expectTypeOf<Wire<NativeSavePayload>>().toEqualTypeOf<
	Wire<KernelSavePayload>
>();
expectTypeOf<KernelUser>().toEqualTypeOf<KernelUserType>();

// The two places the mobile type is deliberately narrower or wider than the
// kernel's. Both are projections of the kernel type rather than independent
// declarations, so a kernel that moves moves them too.
expectTypeOf<NativeModel>().toEqualTypeOf<Exclude<KernelModelType, 'iab'>>();
expectTypeOf<
	Wire<NativeOverrides>
>().toEqualTypeOf<NativeOverridesFromKernel>();

// And the snapshot reads the vocabulary rather than a second copy of it.
expectTypeOf<ConsentSnapshot['model']>().toEqualTypeOf<NativeModel>();
expectTypeOf<
	ConsentSnapshot['effectivePermissions']
>().toEqualTypeOf<ConsentState>();
expectTypeOf<ConsentSnapshot['consentCategories']>().toEqualTypeOf<
	readonly AllConsentNames[] | null
>();
expectTypeOf<
	ConsentSnapshot['promptRequirement']
>().toEqualTypeOf<PromptRequirement>();
