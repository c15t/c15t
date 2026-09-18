/**
 * Vendor consent across the transport boundary: the save body carries the
 * grant map, a subject read maps grants back to denials, and init output
 * round-trips backend vendor declarations through the kernel config.
 */
import { describe, expect, test } from 'vitest';

import type { SavePayload } from '../../types';
import {
	kernelConfigToInitResponse,
	mapInitOutputToInitResponse,
	mergeInitResponseIntoKernelConfig,
} from '../init-output';
import { buildSubjectPostBody } from '../subject-body';
import { mapSubjectRecordToHydrationRecords } from '../subject-record';

const NOW = 1_700_000_200_000;

const payload: SavePayload = {
	choice: {
		categories: {
			marketing: {
				basis: { fingerprint: 'choice-fp', kind: 'choice-v1' },
				confirmedAt: NOW - 1000,
				value: true,
			},
		},
		version: 3,
	},
	confirmed: { actionAt: NOW - 1000, categories: { marketing: true } },
	consentAction: 'custom',
	consents: {
		experience: false,
		functionality: false,
		marketing: true,
		measurement: false,
		necessary: true,
	},
	model: 'opt-in',
	overrides: {},
	policySnapshotToken: null,
	subject: { subjectId: 'sub_test' },
	subjectId: 'sub_test',
	uiSource: 'dialog',
	user: null,
	vendorChoice: {
		confirmedAt: NOW - 1000,
		grants: { 'google-analytics': true, 'meta-pixel': false },
		version: 1,
	},
};

describe('save body', () => {
	test('carries the vendor grant map as a copy', () => {
		const body = buildSubjectPostBody(payload, { domain: 'example.com' });
		expect(body.vendorChoice).toEqual(payload.vendorChoice);
		expect(body.vendorChoice?.grants).not.toBe(payload.vendorChoice?.grants);
	});

	test('omits vendorChoice when the payload has none', () => {
		const { vendorChoice: _dropped, ...withoutVendors } = payload;
		const body = buildSubjectPostBody(withoutVendors, {
			domain: 'example.com',
		});
		expect(body).not.toHaveProperty('vendorChoice');
	});
});

describe('subject record', () => {
	const base = {
		consents: [],
		isValid: true,
		subject: { id: 'sub_test' },
	};

	test('maps denied grants onto the denial list', () => {
		const records = mapSubjectRecordToHydrationRecords(
			{
				...base,
				subjectVendorChoice: {
					confirmedAt: NOW - 50,
					grants: { 'google-analytics': true, 'meta-pixel': false },
					version: 1,
				},
			},
			{ now: NOW }
		);
		expect(records.vendorChoice).toEqual({
			confirmedAt: NOW - 50,
			denied: ['meta-pixel'],
			version: 1,
		});
	});

	test('an all-granted map, a future map and a missing map are all null', () => {
		expect(
			mapSubjectRecordToHydrationRecords(
				{
					...base,
					subjectVendorChoice: {
						confirmedAt: NOW - 50,
						grants: { 'meta-pixel': true },
						version: 1,
					},
				},
				{ now: NOW }
			).vendorChoice
		).toBeNull();
		expect(
			mapSubjectRecordToHydrationRecords(
				{
					...base,
					subjectVendorChoice: {
						confirmedAt: NOW + 1,
						grants: { 'meta-pixel': false },
						version: 1,
					},
				},
				{ now: NOW }
			).vendorChoice
		).toBeNull();
		expect(
			mapSubjectRecordToHydrationRecords(base, { now: NOW }).vendorChoice
		).toBeNull();
	});

	test('falls back to the newest per-consent map when the summary is absent', () => {
		const records = mapSubjectRecordToHydrationRecords(
			{
				...base,
				consents: [
					{
						givenAt: new Date(NOW - 200),
						id: 'c1',
						isLatestPolicy: true,
						type: 'cookie_banner',
						vendorChoice: {
							confirmedAt: NOW - 200,
							grants: { 'meta-pixel': false },
							version: 1,
						},
					},
					{
						givenAt: new Date(NOW - 100),
						id: 'c2',
						isLatestPolicy: true,
						type: 'cookie_banner',
						vendorChoice: {
							confirmedAt: NOW - 100,
							grants: { 'google-analytics': false, 'meta-pixel': true },
							version: 1,
						},
					},
				],
			},
			{ now: NOW }
		);
		expect(records.vendorChoice?.denied).toEqual(['google-analytics']);
	});
});

describe('init output', () => {
	const vendors = [
		{
			category: 'marketing' as const,
			id: 'meta-pixel',
			name: 'Meta Pixel',
			privacyPolicyUrl: 'https://www.facebook.com/privacy/policy/',
		},
	];
	const output = {
		branding: 'c15t' as const,
		jurisdiction: 'GDPR' as const,
		location: { countryCode: 'DE', regionCode: null },
		policyResolution: {
			policy: null,
			reason: 'invalid-configuration' as const,
			status: 'failed' as const,
			version: 1 as const,
		},
		translations: { language: 'en', translations: {} as never },
		vendorListVersion: '2026-09',
		vendors,
	};

	test('forwards vendors and the list version into the init response', () => {
		const mapped = mapInitOutputToInitResponse(output, {});
		expect(mapped.vendors).toEqual(vendors);
		expect(mapped.vendorListVersion).toBe('2026-09');
	});

	test('folds into the kernel config and survives a non-matched resolution', () => {
		const config = mergeInitResponseIntoKernelConfig(
			{},
			mapInitOutputToInitResponse(output, {})
		);
		expect(config.initialVendors?.listVersion).toBe('2026-09');
		expect(config.initialVendors?.declared[0]).toMatchObject({
			id: 'meta-pixel',
			presentable: true,
			source: 'manifest',
		});
	});

	test('lifts manifest vendors back into an init response', () => {
		const config = mergeInitResponseIntoKernelConfig(
			{},
			mapInitOutputToInitResponse(output, {})
		);
		const response = kernelConfigToInitResponse(config);
		expect(response?.vendors).toEqual(vendors);
		expect(response?.vendorListVersion).toBe('2026-09');
	});
});
