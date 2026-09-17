/**
 * The cached-consent span has to be a real store read that answers with what the
 * store holds. Otherwise the row times a fallback and still prints a number.
 */

import { describe, expect, it } from 'vitest';

import {
	STORED_ENVELOPE,
	STORED_SNAPSHOT,
	measureCachedConsent,
} from '../measure/cached-consent';
import { REALISTIC_SNAPSHOT_JSON, buildSnapshot } from '../support/fixtures';

const result = measureCachedConsent(3, 12);

describe('time until cached consent is available', () => {
	it('measures without giving up', () => {
		expect(result.unavailable).toBeUndefined();
	});

	it('reports a span for every sample it took', () => {
		expect(result.samples).toBe(12);
		expect(result.coldMs).toBeGreaterThan(0);
	});

	it('reports the bytes it actually read, envelope and records', () => {
		expect(result.envelopeBytes).toBe(
			Buffer.byteLength(STORED_ENVELOPE, 'utf8')
		);
		// The envelope is the snapshot plus the records behind it, so a row that
		// quietly shrank to the snapshot alone would read as a faster launch.
		expect(result.envelopeBytes).toBeGreaterThan(
			Buffer.byteLength(REALISTIC_SNAPSHOT_JSON, 'utf8')
		);
	});
});

describe('the stored answer the guard depends on', () => {
	it('grants marketing, so a deny-all fallback cannot pass for it', () => {
		expect(STORED_SNAPSHOT.effectivePermissions.marketing).toBe(true);
		expect(buildSnapshot().effectivePermissions.marketing).toBe(false);
	});

	it('carries what a device stores beside the snapshot', () => {
		const envelope = JSON.parse(STORED_ENVELOPE) as {
			noticeDismissal: unknown;
			policyResolution: {
				fingerprints: Record<string, string>;
				policyId: string;
			};
			snapshot: { explicitChoice: { categories: Record<string, unknown> } };
			storedAt: number;
			subject: { subjectId: string };
			version: number;
		};

		// The policy the receipts were judged against. Without it a relaunch has to
		// reach the backend before it can answer, which turns a cached grant back into
		// a prompt, and the row would then time a network call it never reports.
		expect(envelope.policyResolution.policyId).toBe('europe_opt_in');
		expect(
			Object.keys(envelope.policyResolution.fingerprints).length
		).toBeGreaterThan(0);
		expect(envelope.noticeDismissal).toBeNull();
		expect(envelope.subject.subjectId).toBeTruthy();
		expect(envelope.version).toBeGreaterThan(0);
		expect(
			Object.keys(envelope.snapshot.explicitChoice.categories).length
		).toBeGreaterThan(0);
	});
});
