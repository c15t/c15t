import {
	deleteConsentFromStorage,
	deleteCookie,
	getCookie,
	getRootDomain,
	setCookie,
} from '@c15t/core';

import type { StoredConsentEnvelope } from '../../packages/core/src/modules/persistence/record-codec';
import {
	readStoredConsentRecord,
	writeStoredConsentEnvelope,
} from '../../packages/core/src/modules/persistence/record-storage';
import { bench, runMicroBenchmarkSuite } from './wrapper';

// In-memory browser stores preserve separate cookie keys and deletion semantics.
const storage = new Map<string, string>();
const cookies = new Map<string, string>();
const localStorage = {
	clear: () => storage.clear(),
	getItem: (key: string) => storage.get(key) ?? null,
	key: (index: number) => [...storage.keys()][index] ?? null,
	get length() {
		return storage.size;
	},
	removeItem: (key: string) => storage.delete(key),
	setItem: (key: string, value: string) => storage.set(key, value),
};
Object.defineProperty(globalThis, 'window', {
	value: { localStorage, location: new URL('https://app.example.com') },
});
Object.defineProperty(globalThis, 'document', {
	value: {
		get cookie() {
			return [...cookies].map(([key, value]) => `${key}=${value}`).join('; ');
		},
		set cookie(value: string) {
			const [pair = '', ...attributes] = value.split(';');
			const separator = pair.indexOf('=');
			const key = pair.slice(0, separator);
			const expires = attributes.find((attribute) =>
				attribute.trim().toLowerCase().startsWith('expires=')
			);
			if (expires && Date.parse(expires.trim().slice(8)) <= Date.now()) {
				cookies.delete(key);
			} else {
				cookies.set(key, pair.slice(separator + 1));
			}
		},
	},
});

const now = Date.now();
const basis = { fingerprint: 'benchmark-choice', kind: 'choice-v1' } as const;
const sampleEnvelope: StoredConsentEnvelope = {
	categories: {
		experience: { basis, confirmedAt: now, value: false },
		functionality: { basis, confirmedAt: now, value: false },
		marketing: { basis, confirmedAt: now, value: false },
		measurement: { basis, confirmedAt: now, value: true },
	},
	version: 3,
};
const allGrantedEnvelope: StoredConsentEnvelope = {
	...sampleEnvelope,
	categories: Object.fromEntries(
		Object.entries(sampleEnvelope.categories).map(([key, receipt]) => [
			key,
			{ ...receipt, value: true },
		])
	),
};
const customStorageConfig = {
	crossSubdomain: true,
	defaultExpiryDays: 365,
	storageKey: 'custom-consent',
};

// Seed read benchmarks independently of the order Mitata executes trials.
const readConfig = { storageKey: 'benchmark-read' };
writeStoredConsentEnvelope(sampleEnvelope, { config: readConfig, now });
if (!readStoredConsentRecord(readConfig, now).selected) {
	throw new Error(
		'Cookie benchmark failed to round-trip its v3 consent record'
	);
}

bench('writeStoredConsentEnvelope - typical receipts', () => {
	writeStoredConsentEnvelope(sampleEnvelope, { now });
});
bench('writeStoredConsentEnvelope - all granted', () => {
	writeStoredConsentEnvelope(allGrantedEnvelope, { now });
});
bench('writeStoredConsentEnvelope - with custom config', () => {
	writeStoredConsentEnvelope(sampleEnvelope, {
		config: customStorageConfig,
		now,
	});
});
bench('readStoredConsentRecord - saved receipts', () => {
	readStoredConsentRecord(readConfig, now);
});
bench('deleteConsentFromStorage', () => {
	deleteConsentFromStorage();
});

// Low-level cookie operations
bench('setCookie - simple value', () => {
	setCookie('test-cookie', 'test-value');
});

bench('setCookie - with options', () => {
	setCookie('test-cookie', 'test-value', {
		expiryDays: 365,
		path: '/',
		sameSite: 'Lax',
	});
});

bench('getCookie - existing cookie', () => {
	getCookie('test-cookie');
});

bench('getCookie - non-existent cookie', () => {
	getCookie('non-existent');
});

bench('deleteCookie', () => {
	deleteCookie('test-cookie');
});

// Domain utilities
bench('getRootDomain', () => {
	getRootDomain();
});

// Full round-trip benchmark
bench('full round-trip: save -> get -> delete', () => {
	writeStoredConsentEnvelope(sampleEnvelope, { now });
	readStoredConsentRecord(undefined, now);
	deleteConsentFromStorage();
});

await runMicroBenchmarkSuite('cookie');
