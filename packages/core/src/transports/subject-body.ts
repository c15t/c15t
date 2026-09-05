/**
 * The `POST /subjects` body.
 *
 * Two representations of the same act travel together, on purpose:
 *
 * - `preferences` is the complete map of explicit values after the act:
 *   `necessary` plus every category that holds a receipt, with the receipt's
 *   value. It is what a 2.x backend reads and what fills the granted-purpose
 *   columns. It is never the effective permissions: a GPC mask or a strict
 *   scope can deny a category the subject explicitly granted, and recording
 *   the masked value would rewrite what the subject chose.
 * - `choice` carries only the categories this act confirmed, each with the
 *   confirmation time captured once before any network call and the policy
 *   basis it was made under. A v3 backend stores these as sent, so a partial
 *   save never renews a category the subject did not touch, and a queued
 *   replay resubmits the identical receipts.
 *
 * A payload without a receipt (an older kernel, or a save that confirmed
 * nothing) sends no `choice` at all, and its `consents` map as-is.
 */
import type { SubjectChoiceWire } from '@c15t/schema/types';

import { OPTIONAL_CONSENT_CATEGORIES } from '../consent-record/types';
import type {
	ExplicitChoice,
	OptionalConsentCategory,
} from '../consent-record/types';
import type { SavePayload } from '../types';

export interface BuildSubjectPostBodyOptions {
	domain: string;
}

export type SubjectSavePayload = SavePayload;

export interface SubjectPostBody {
	subjectId: string;
	externalSubjectId?: string;
	identityProvider?: string;
	domain: string;
	type: 'cookie_banner';
	preferences: Record<string, boolean>;
	givenAt: number;
	/** Receipts for the categories this act confirmed. */
	choice?: SubjectChoiceWire;
	jurisdictionModel?: NonNullable<SavePayload['model']>;
	uiSource?: NonNullable<SavePayload['uiSource']>;
	consentAction: SavePayload['consentAction'];
	policySnapshotToken?: string;
	tcString?: string;
	metadata?: {
		userProperties: NonNullable<SavePayload['user']>['properties'];
	};
}

/**
 * The wire receipt for the categories one action confirmed.
 *
 * Reads receipts from the complete choice for exactly the confirmed keys, so
 * the confirmation time and basis are the kernel's, not restamped here.
 * Returns `undefined` when the payload has no receipt or confirmed nothing.
 */
export const buildConfirmedChoiceWire = function buildConfirmedChoiceWire(
	payload: Pick<SavePayload, 'choice' | 'confirmed'>
): SubjectChoiceWire | undefined {
	const { choice, confirmed } = payload;
	if (!choice || !confirmed) {
		return undefined;
	}
	const categories: SubjectChoiceWire['categories'] = {};
	let any = false;
	for (const key of Object.keys(confirmed.categories)) {
		const category = key as OptionalConsentCategory;
		const receipt = choice.categories[category];
		if (receipt === undefined) {
			continue;
		}
		categories[category] = {
			basis:
				receipt.basis.kind === 'choice-v1'
					? { fingerprint: receipt.basis.fingerprint, kind: 'choice-v1' }
					: {
							kind: 'legacy-v2',
							...(receipt.basis.materialFingerprint !== undefined && {
								materialFingerprint: receipt.basis.materialFingerprint,
							}),
						},
			confirmedAt: receipt.confirmedAt,
			value: receipt.value,
		};
		any = true;
	}
	return any ? { categories, version: 3 } : undefined;
};

/** The explicit values a complete receipt holds, as a preference map. */
export const explicitPreferences = function explicitPreferences(
	choice: Readonly<ExplicitChoice>
): Record<string, boolean> {
	const preferences: Record<string, boolean> = { necessary: true };
	for (const category of OPTIONAL_CONSENT_CATEGORIES) {
		const receipt = choice.categories[category];
		if (receipt !== undefined) {
			preferences[category] = receipt.value;
		}
	}
	return preferences;
};

export const buildSubjectPostBody = function buildSubjectPostBody(
	payload: SubjectSavePayload,
	opts: BuildSubjectPostBodyOptions
): SubjectPostBody {
	const choice = buildConfirmedChoiceWire(payload);
	return {
		consentAction: payload.consentAction,
		domain: opts.domain,
		externalSubjectId: payload.user?.externalId,
		// The action time captured once by the kernel; a queued replay reuses
		// it so the backend derives the same consent id.
		givenAt: payload.confirmed.actionAt,
		identityProvider: payload.user?.identityProvider,
		jurisdictionModel: payload.model ?? undefined,
		metadata: payload.user?.properties
			? { userProperties: payload.user.properties }
			: undefined,
		policySnapshotToken: payload.policySnapshotToken ?? undefined,
		preferences: explicitPreferences(payload.choice),
		subjectId: payload.subjectId,
		tcString: payload.tcString ?? undefined,
		type: 'cookie_banner',
		uiSource: payload.uiSource ?? undefined,
		...(choice !== undefined && { choice }),
	};
};
