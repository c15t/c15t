/**
 * Publisher restriction validation and conversion.
 *
 * A publisher restriction overrides a vendor's declared use of one purpose
 * (TCF v2 core segment, `PubRestrictions` section). This module checks
 * restrictions before they are encoded and after they are decoded, so an
 * unsupported restriction fails with {@link PublisherRestrictionError}
 * instead of being dropped by the encoder.
 *
 * @packageDocumentation
 */

import type { GlobalVendorList } from '@c15t/core';

import type { PublisherRestriction } from './iab-tcf-types';

/**
 * Restriction types defined by the TCF v2 core segment.
 *
 * Type `3` is reserved by the spec and never valid.
 *
 * @public
 */
export const PUBLISHER_RESTRICTION_TYPES = {
	/** The vendor may not process the purpose on any legal basis. */
	PURPOSE_PROHIBITED: 0,
	/** A flexible purpose the vendor declares for LI must use consent. */
	REQUIRE_CONSENT: 1,
	/** A flexible purpose the vendor declares for consent must use LI. */
	REQUIRE_LEGITIMATE_INTEREST: 2,
} as const;

/**
 * Purposes that TCF policy version 4 and later allow only with consent.
 * Purpose 1 was never allowed legitimate interest; TCF 2.2 removed it for
 * purposes 3 to 6.
 *
 * @public
 */
export const CONSENT_ONLY_PURPOSES: readonly number[] = [1, 3, 4, 5, 6];

/** The spec encodes a purpose ID in 6 bits. */
const MAX_PURPOSE_ID = 63;
/** The spec encodes a vendor ID in 16 bits. */
const MAX_VENDOR_ID = 65_535;

/**
 * Thrown when a publisher restriction cannot be encoded, or when a TC
 * string carries one c15t does not support.
 *
 * @public
 */
export class PublisherRestrictionError extends TypeError {
	override name = 'PublisherRestrictionError';
}

/** Context for checks that depend on how the TC string is produced. */
export interface PublisherRestrictionContext {
	/**
	 * Vendor list the restrictions are encoded against. When present, every
	 * restriction must match a vendor declaration in it.
	 */
	gvl?: GlobalVendorList;
	/**
	 * Whether the TC string is service-specific. The spec allows publisher
	 * restrictions only in service-specific strings. Default: `true`.
	 */
	isServiceSpecific?: boolean;
}

const fail = (message: string): never => {
	throw new PublisherRestrictionError(message);
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === 'object' && !Array.isArray(value);

const readRestrictionEntry = (
	entry: unknown,
	index: number
): { purposeId: number; restrictionType: 0 | 1 | 2; vendorIds: number[] } => {
	const at = `publisherRestrictions[${index}]`;
	if (!isPlainObject(entry)) {
		return fail(`${at} must be an object.`);
	}
	const { purposeId, restrictionType, vendorIds } = entry;
	if (
		typeof purposeId !== 'number' ||
		!Number.isInteger(purposeId) ||
		purposeId < 1 ||
		purposeId > MAX_PURPOSE_ID
	) {
		return fail(
			`${at}.purposeId must be an integer from 1 to ${MAX_PURPOSE_ID}.`
		);
	}
	if (restrictionType === 3) {
		return fail(
			`${at}.restrictionType 3 is reserved by the TCF spec and cannot be used.`
		);
	}
	if (restrictionType !== 0 && restrictionType !== 1 && restrictionType !== 2) {
		return fail(`${at}.restrictionType must be 0, 1 or 2.`);
	}
	if (
		restrictionType ===
			PUBLISHER_RESTRICTION_TYPES.REQUIRE_LEGITIMATE_INTEREST &&
		CONSENT_ONLY_PURPOSES.includes(purposeId)
	) {
		return fail(
			`${at} requires legitimate interest for purpose ${purposeId}, which TCF allows only with consent.`
		);
	}
	if (!Array.isArray(vendorIds) || vendorIds.length === 0) {
		return fail(`${at}.vendorIds must be a non-empty array.`);
	}
	for (const vendorId of vendorIds) {
		if (
			typeof vendorId !== 'number' ||
			!Number.isInteger(vendorId) ||
			vendorId < 1 ||
			vendorId > MAX_VENDOR_ID
		) {
			return fail(
				`${at}.vendorIds contains ${String(vendorId)}; vendor IDs must be integers from 1 to ${MAX_VENDOR_ID}.`
			);
		}
	}
	return { purposeId, restrictionType, vendorIds: vendorIds as number[] };
};

const checkDeclaration = (
	restriction: PublisherRestriction,
	vendorId: number,
	gvl: GlobalVendorList
): void => {
	const { purposeId, restrictionType } = restriction;
	const vendor = gvl.vendors?.[vendorId];
	if (!vendor) {
		fail(
			`Publisher restriction for purpose ${purposeId} names vendor ${vendorId}, which is not in the vendor list.`
		);
		return;
	}
	const consent = vendor.purposes.includes(purposeId);
	const legitimateInterest = vendor.legIntPurposes.includes(purposeId);
	const flexible = vendor.flexiblePurposes?.includes(purposeId) ?? false;
	if (restrictionType === PUBLISHER_RESTRICTION_TYPES.PURPOSE_PROHIBITED) {
		if (!(consent || legitimateInterest)) {
			fail(
				`Vendor ${vendorId} does not declare purpose ${purposeId}, so prohibiting it has no effect.`
			);
		}
		return;
	}
	if (restrictionType === PUBLISHER_RESTRICTION_TYPES.REQUIRE_CONSENT) {
		if (!(legitimateInterest && flexible)) {
			fail(
				`Vendor ${vendorId} must declare purpose ${purposeId} as a flexible legitimate interest purpose to require consent for it. Use restriction type 0 to prohibit it instead.`
			);
		}
		return;
	}
	if (!(consent && flexible)) {
		fail(
			`Vendor ${vendorId} must declare purpose ${purposeId} as a flexible consent purpose to require legitimate interest for it. Use restriction type 0 to prohibit it instead.`
		);
	}
};

/**
 * Checks publisher restrictions and returns a normalized copy.
 *
 * Entries with the same purpose and type are merged, vendor IDs are sorted
 * and de-duplicated, and the result is ordered by purpose, then type.
 *
 * @param input - Restrictions from configuration or a decoded TC string.
 * @param context - Vendor list and string scope to check against.
 * @returns The normalized restrictions. `undefined` returns an empty list.
 * @throws {PublisherRestrictionError} When a restriction is malformed,
 * uses the reserved type `3`, requires legitimate interest for a
 * consent-only purpose, gives one vendor two types for the same purpose,
 * appears in a string that is not service-specific, or, with a vendor
 * list, does not match the vendor's declarations.
 *
 * @example
 * ```ts
 * validatePublisherRestrictions([
 *   { purposeId: 2, restrictionType: 0, vendorIds: [755] },
 * ]);
 * ```
 *
 * @public
 */
export const validatePublisherRestrictions =
	function validatePublisherRestrictions(
		input: unknown,
		context: PublisherRestrictionContext = {}
	): PublisherRestriction[] {
		if (input === undefined) {
			return [];
		}
		if (!Array.isArray(input)) {
			return fail('publisherRestrictions must be an array.');
		}
		if (input.length > 0 && context.isServiceSpecific === false) {
			fail(
				'Publisher restrictions are only allowed in service-specific TC strings. Remove them or set isServiceSpecific to true.'
			);
		}
		const groups = new Map<string, PublisherRestriction>();
		const byVendorPurpose = new Map<string, number>();
		for (const [index, entry] of input.entries()) {
			const { purposeId, restrictionType, vendorIds } = readRestrictionEntry(
				entry,
				index
			);
			if (
				context.gvl &&
				!Object.hasOwn(context.gvl.purposes ?? {}, purposeId)
			) {
				fail(
					`publisherRestrictions[${index}].purposeId ${purposeId} is not a purpose in the vendor list.`
				);
			}
			const key = `${purposeId}-${restrictionType}`;
			const group = groups.get(key) ?? {
				purposeId,
				restrictionType,
				vendorIds: [],
			};
			groups.set(key, group);
			for (const vendorId of vendorIds) {
				const vendorPurpose = `${vendorId}-${purposeId}`;
				const existing = byVendorPurpose.get(vendorPurpose);
				if (existing !== undefined && existing !== restrictionType) {
					fail(
						`Vendor ${vendorId} has restriction types ${existing} and ${restrictionType} for purpose ${purposeId}. Give each vendor one restriction per purpose.`
					);
				}
				if (existing === undefined) {
					byVendorPurpose.set(vendorPurpose, restrictionType);
					group.vendorIds.push(vendorId);
				}
			}
		}
		const restrictions = [...groups.values()]
			.map((group) => ({
				...group,
				vendorIds: [...group.vendorIds].sort((a, b) => a - b),
			}))
			.sort(
				(a, b) =>
					a.purposeId - b.purposeId || a.restrictionType - b.restrictionType
			);
		const { gvl } = context;
		if (gvl) {
			for (const restriction of restrictions) {
				for (const vendorId of restriction.vendorIds) {
					checkDeclaration(restriction, vendorId, gvl);
				}
			}
		}
		return restrictions;
	};

/**
 * Copies restriction input so later changes to the caller's array or its
 * entries cannot change what is validated and encoded. Anything that is not
 * an array is returned as is for {@link validatePublisherRestrictions} to
 * reject; holes become `undefined` entries, which it also rejects.
 *
 * @param input - Restrictions as configured.
 * @returns A copy that shares no arrays or entries with `input`.
 *
 * @internal
 */
export const copyPublisherRestrictionInput =
	function copyPublisherRestrictionInput(input: unknown): unknown {
		if (!Array.isArray(input)) {
			return input;
		}
		return Array.from(input, (entry: unknown) =>
			isPlainObject(entry)
				? {
						...entry,
						vendorIds: Array.isArray(entry.vendorIds)
							? Array.from(entry.vendorIds)
							: entry.vendorIds,
					}
				: entry
		);
	};

/**
 * Converts restrictions to the `__tcfapi` shape: purpose ID, then vendor
 * ID, then restriction type.
 *
 * @param restrictions - Normalized restrictions.
 * @returns The `publisher.restrictions` value for `TCData`.
 *
 * @public
 */
export const toTCDataRestrictions = function toTCDataRestrictions(
	restrictions: readonly PublisherRestriction[]
): Record<number, Record<number, number>> {
	const result: Record<number, Record<number, number>> = {};
	for (const { purposeId, restrictionType, vendorIds } of restrictions) {
		const byVendor = result[purposeId] ?? {};
		result[purposeId] = byVendor;
		for (const vendorId of vendorIds) {
			byVendor[vendorId] = restrictionType;
		}
	}
	return result;
};

/**
 * Whether two restriction lists restrict the listed vendors the same way.
 *
 * Decoded ranges may cover IDs that are not in the vendor list, so only
 * vendors in `gvl` are compared.
 *
 * @param left - Restrictions from one source.
 * @param right - Restrictions from another source.
 * @param vendors - Vendors of the list whose entries are compared.
 * @returns `true` when every listed vendor has the same restrictions.
 *
 * @internal
 */
export const sameListedRestrictions = function sameListedRestrictions(
	left: readonly PublisherRestriction[],
	right: readonly PublisherRestriction[],
	vendors: GlobalVendorList['vendors'] | undefined
): boolean {
	const listed = (restrictions: readonly PublisherRestriction[]) => {
		const entries: string[] = [];
		for (const { purposeId, restrictionType, vendorIds } of restrictions) {
			for (const vendorId of vendorIds) {
				if (Object.hasOwn(vendors ?? {}, vendorId)) {
					entries.push(`${purposeId}-${vendorId}-${restrictionType}`);
				}
			}
		}
		return entries.sort().join(',');
	};
	return listed(left) === listed(right);
};
