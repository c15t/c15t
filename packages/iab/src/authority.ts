import type { ConsentSnapshot, KernelIABAuthority } from '@c15t/core';

import { decodeTCString } from './tcf/tc-string';
import type { DecodedTCString } from './tcf/tc-string';

const AUTHORITY_KEY = 'c15t-iab-authority-v1';
const RETENTION_MS = 395 * 86_400_000;
const DISCLOSURE_REQUIRED_AT = Date.UTC(2026, 1, 28);

interface StoredAuthority {
	tcString: string;
	confirmedAt: number;
	expiresAt: number;
	choiceFingerprint: string;
	customConsents: Record<string, boolean>;
	customLegitimateInterests: Record<string, boolean>;
}

const ownBooleanMap = function ownBooleanMap(
	value: unknown
): Record<string, boolean> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}
	return Object.fromEntries(
		Object.entries(value).filter(([, entry]) => typeof entry === 'boolean')
	);
};

/** Reads the addon receipt without writing or extending its lifetime. */
export const readAuthorityReceipt = function readAuthorityReceipt(): unknown {
	try {
		return JSON.parse(localStorage.getItem(AUTHORITY_KEY) ?? 'null');
	} catch {
		return null;
	}
};

/** Stores only confirmed authority, separately from editable IAB maps. */
export const storeAuthority = function storeAuthority(
	authority: KernelIABAuthority
): void {
	try {
		localStorage.setItem(
			AUTHORITY_KEY,
			JSON.stringify({
				...authority,
				customConsents: authority.vendorConsents,
				customLegitimateInterests: authority.vendorLegitimateInterests,
			})
		);
	} catch {
		// Storage can be unavailable while the in-memory confirmation remains valid.
	}
};

/** Builds a receipt at the explicit confirmation clock. */
export const createAuthorityReceipt = function createAuthorityReceipt(
	snapshot: ConsentSnapshot,
	tcString: string,
	confirmedAt: number
): StoredAuthority {
	return {
		choiceFingerprint: snapshot.evaluationPolicy.choice.fingerprint,
		confirmedAt,
		customConsents: { ...snapshot.iab?.vendorConsents },
		customLegitimateInterests: { ...snapshot.iab?.vendorLegitimateInterests },
		expiresAt:
			confirmedAt +
			Math.min(
				snapshot.evaluationPolicy.choice.maxAgeMs ?? RETENTION_MS,
				RETENTION_MS
			),
		tcString,
	};
};

const readReceipt = function readReceipt(
	value: Record<string, unknown>,
	snapshot: ConsentSnapshot,
	now: number
): StoredAuthority | null {
	const { tcString, confirmedAt, expiresAt, choiceFingerprint } = value;
	if (
		typeof tcString !== 'string' ||
		typeof confirmedAt !== 'number' ||
		typeof expiresAt !== 'number' ||
		!Number.isSafeInteger(confirmedAt) ||
		!Number.isSafeInteger(expiresAt) ||
		confirmedAt < 0 ||
		confirmedAt > now ||
		expiresAt <= now ||
		expiresAt <= confirmedAt ||
		choiceFingerprint !== snapshot.evaluationPolicy.choice.fingerprint ||
		expiresAt >
			confirmedAt +
				Math.min(
					snapshot.evaluationPolicy.choice.maxAgeMs ?? RETENTION_MS,
					RETENTION_MS
				)
	) {
		return null;
	}
	return {
		choiceFingerprint,
		confirmedAt,
		customConsents: ownBooleanMap(value.customConsents),
		customLegitimateInterests: ownBooleanMap(value.customLegitimateInterests),
		expiresAt,
		tcString,
	};
};

const compatibleTC = function compatibleTC(
	decoded: DecodedTCString,
	receipt: StoredAuthority,
	snapshot: ConsentSnapshot
): boolean {
	const updatedAt = decoded.lastUpdated.getTime();
	if (
		!Number.isFinite(updatedAt) ||
		updatedAt < 0 ||
		updatedAt > receipt.confirmedAt ||
		receipt.confirmedAt - updatedAt >= 86_400_000 ||
		decoded.created.getTime() !== updatedAt ||
		decoded.cmpId !== snapshot.iab?.cmpId ||
		decoded.policyVersion !== snapshot.iab?.gvl?.tcfPolicyVersion ||
		decoded.vendorListVersion > (snapshot.iab?.gvl?.vendorListVersion ?? 0)
	) {
		return false;
	}
	if (updatedAt < DISCLOSURE_REQUIRED_AT) {
		return true;
	}
	return (
		receipt.tcString.includes('.') &&
		[
			...Object.keys(decoded.vendorConsents),
			...Object.keys(decoded.vendorLegitimateInterests),
		].every((id) => decoded.vendorsDisclosed[Number(id)] === true)
	);
};

/** Decode TC authority and check its receipt, current policy and original clock. */
export const validateAuthority = async function validateAuthority(
	input: unknown,
	snapshot: ConsentSnapshot,
	now: number
): Promise<KernelIABAuthority | null> {
	if (
		!input ||
		typeof input !== 'object' ||
		Array.isArray(input) ||
		snapshot.resolution.status !== 'matched' ||
		snapshot.model !== 'iab' ||
		!snapshot.iab?.enabled
	) {
		return null;
	}
	const receipt = readReceipt(input as Record<string, unknown>, snapshot, now);
	if (!receipt) {
		return null;
	}
	const { tcString, confirmedAt, expiresAt, choiceFingerprint } = receipt;
	try {
		const decoded = await decodeTCString(tcString);
		if (!compatibleTC(decoded, receipt, snapshot)) {
			return null;
		}
		const vendorConsents = { ...decoded.vendorConsents };
		const vendorLegitimateInterests = { ...decoded.vendorLegitimateInterests };
		const { customConsents } = receipt;
		const customLI = receipt.customLegitimateInterests;
		for (const vendor of snapshot.iab.customVendors) {
			const id = String(vendor.id);
			// Numeric registered vendors are represented only by the TC string.
			if (Object.hasOwn(snapshot.iab.gvl?.vendors ?? {}, id)) {
				continue;
			}
			Object.defineProperty(vendorConsents, id, {
				enumerable: true,
				value: customConsents[id] === true && Object.hasOwn(customConsents, id),
			});
			Object.defineProperty(vendorLegitimateInterests, id, {
				enumerable: true,
				value: customLI[id] === true && Object.hasOwn(customLI, id),
			});
		}
		return {
			choiceFingerprint,
			confirmedAt,
			expiresAt,
			purposeConsents: decoded.purposeConsents,
			purposeLegitimateInterests: decoded.purposeLegitimateInterests,
			specialFeatureOptIns: decoded.specialFeatureOptIns,
			tcString,
			vendorConsents,
			vendorLegitimateInterests,
		};
	} catch {
		return null;
	}
};

/** Removes the addon receipt when authority is cleared by a lifecycle change. */
export const clearAuthorityReceipt = function clearAuthorityReceipt(): void {
	try {
		localStorage.removeItem(AUTHORITY_KEY);
	} catch {
		/* Storage may be unavailable. */
	}
};
