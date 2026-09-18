/**
 * Write kernel records to storage.
 *
 * Every write is driven by an explicit kernel event: a recorded choice
 * writes the v3 envelope, a dismissed notice writes the notice record, a
 * recorded directive writes the privacy record, a recorded vendor toggle
 * writes the vendor record. Category times are
 * written exactly as the kernel holds them; nothing here stamps the clock
 * into a receipt.
 */

import type { ConsentSnapshot } from '../../types';
import type { StoredConsentEnvelope, StoredIabMetadata } from './record-codec';
import {
	clearStoredVendorChoice,
	writeStoredConsentEnvelope,
	writeStoredNoticeDismissal,
	writeStoredPrivacyOptOuts,
	writeStoredVendorChoice,
} from './record-storage';
import type { StorageConfig } from './types';

/** Envelope a snapshot's explicit choice serializes to, or `null`. */
export const buildStoredEnvelope = function buildStoredEnvelope(
	snapshot: ConsentSnapshot,
	iab: StoredIabMetadata | null
): StoredConsentEnvelope | null {
	if (!snapshot.explicitChoice) {
		return null;
	}
	const envelope: StoredConsentEnvelope = {
		categories: snapshot.explicitChoice.categories,
		version: 3,
	};
	if (snapshot.subject && Object.keys(snapshot.subject).length > 0) {
		envelope.subject = { ...snapshot.subject };
	}
	if (iab) {
		envelope.iab = iab;
	}
	return envelope;
};

/**
 * Write the explicit choice to storage. No-op outside the browser or when
 * no choice exists.
 */
export const writeChoiceToStorage = function writeChoiceToStorage(
	snapshot: ConsentSnapshot,
	iab: StoredIabMetadata | null,
	storageConfig: StorageConfig | undefined,
	now: number
): void {
	if (typeof document === 'undefined') {
		return;
	}
	const envelope = buildStoredEnvelope(snapshot, iab);
	if (!envelope) {
		return;
	}
	const result = writeStoredConsentEnvelope(envelope, {
		config: storageConfig,
		now,
	});
	if (result.ok === false) {
		console.warn('[c15t] Consent record was not written.', result.issues);
	}
};

/** Write the notice dismissal. No-op outside the browser or when absent. */
export const writeNoticeToStorage = function writeNoticeToStorage(
	snapshot: ConsentSnapshot,
	storageConfig: StorageConfig | undefined,
	now: number
): void {
	if (typeof document === 'undefined' || !snapshot.noticeDismissal) {
		return;
	}
	writeStoredNoticeDismissal(snapshot.noticeDismissal, storageConfig, now);
};

/** Write the standing privacy directives. No-op outside the browser. */
export const writePrivacyToStorage = function writePrivacyToStorage(
	snapshot: ConsentSnapshot,
	storageConfig: StorageConfig | undefined,
	now: number
): void {
	if (typeof document === 'undefined') {
		return;
	}
	writeStoredPrivacyOptOuts(snapshot.optOutDirectives, storageConfig, now);
};

/**
 * Write the vendor denial list. A snapshot with no denials removes the
 * record so an empty list never lingers in storage. No-op outside the
 * browser.
 */
export const writeVendorChoiceToStorage = function writeVendorChoiceToStorage(
	snapshot: ConsentSnapshot,
	storageConfig: StorageConfig | undefined,
	now: number
): void {
	if (typeof document === 'undefined') {
		return;
	}
	if (!snapshot.vendorChoice) {
		clearStoredVendorChoice(storageConfig);
		return;
	}
	const result = writeStoredVendorChoice(
		snapshot.vendorChoice,
		storageConfig,
		now
	);
	if (result.ok === false) {
		console.warn('[c15t] Vendor choice was not written.', result.issues);
		return;
	}
	// A server render reads the cookie only. When the browser dropped it, most
	// likely because many long ids pushed it past the per-cookie limit, the
	// next SSR page would seed an older or absent list; say so rather than
	// let it pass silently.
	if (result.written && !result.written.cookie) {
		console.warn(
			'[c15t] Vendor choice cookie was not stored; the localStorage copy is current but a server render will not see it. Shorten vendor ids or deny fewer vendors.',
			result.written.cookieDetail
		);
	}
};
