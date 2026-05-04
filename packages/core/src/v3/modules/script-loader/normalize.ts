/**
 * Script normalization + element-ID resolution.
 *
 * Pure functions for shape conversion (`normalizeScripts`,
 * `generateRandomId`) and a small factory for the anonymized-ID cache
 * (`createElementIdResolver`). The cache lives in a closure rather than
 * a `Map<>` argument so callers don't have to plumb identity through.
 */
import type { AllConsentNames } from '../../../types/consent-types';
import type { NormalizedScript, Script } from './types';

const anonymizedElementIds = new Map<string, string>();

/**
 * Generate an opaque 8-char random ID. Uses `crypto.randomUUID()`
 * when available (the modern path); falls back to `Math.random()` in
 * environments where crypto isn't exposed.
 */
export function generateRandomId(): string {
	if (
		typeof crypto !== 'undefined' &&
		typeof crypto.randomUUID === 'function'
	) {
		return crypto.randomUUID().replace(/-/g, '').slice(0, 8);
	}
	return Math.random().toString(36).slice(2, 10);
}

/**
 * Normalize raw `Script` configs by precomputing the metadata
 * `eligibility.ts` consults on every reconcile. Pure: same input
 * always produces the same output.
 */
export function normalizeScripts(scripts: Script[]): NormalizedScript[] {
	return scripts.map((script) => ({
		script,
		hasIabMeta: Boolean(
			script.vendorId !== undefined ||
				(script.iabPurposes && script.iabPurposes.length > 0) ||
				(script.iabLegIntPurposes && script.iabLegIntPurposes.length > 0) ||
				(script.iabSpecialFeatures && script.iabSpecialFeatures.length > 0)
		),
		simpleCategory:
			typeof script.category === 'string'
				? (script.category as AllConsentNames)
				: null,
	}));
}

export interface ElementIdResolver {
	/** Resolve the DOM `id` attribute for a script. */
	resolve(script: Script): string;
	/** Drop cached IDs (used during dispose). */
	clear(): void;
}

/**
 * Build a per-loader element-ID resolver.
 *
 * When `script.anonymizeId` is `false`, the ID is `c15t-script-<id>` —
 * stable across mounts so consumers can target it from CSS / extensions.
 *
 * When `script.anonymizeId` is unset or `true`, the ID is a random
 * `c15t-<8 random chars>` token cached for the lifetime of this page's
 * module instance. The cache makes `getElementId()` idempotent across
 * fresh loader instances — same script always gets the same anon ID.
 */
export function createElementIdResolver(): ElementIdResolver {
	return {
		resolve(script) {
			const anonymize = script.anonymizeId !== false;
			if (!anonymize) return `c15t-script-${script.id}`;
			const cached = anonymizedElementIds.get(script.id);
			if (cached) return cached;
			const generated = `c15t-${generateRandomId()}`;
			anonymizedElementIds.set(script.id, generated);
			return generated;
		},
		clear() {},
	};
}
