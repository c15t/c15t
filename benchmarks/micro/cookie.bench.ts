import {
	deleteConsentFromStorage,
	deleteCookie,
	getConsentFromStorage,
	getCookie,
	getRootDomain,
	saveConsentToStorage,
	setCookie,
} from 'c15t';
import { bench, run } from 'mitata';

// Mock localStorage for Node.js environment
if (typeof globalThis.localStorage === 'undefined') {
	const store: Record<string, string> = {};
	globalThis.localStorage = {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			for (const key in store) {
				delete store[key];
			}
		},
		key: (index: number) => Object.keys(store)[index] || null,
		length: Object.keys(store).length,
	} as Storage;
}

// Mock document.cookie for Node.js environment
if (typeof globalThis.document === 'undefined') {
	let cookieStore = '';
	globalThis.document = {
		get cookie() {
			return cookieStore;
		},
		set cookie(value: string) {
			cookieStore = value;
		},
	} as Document;
}

// Sample consent data (typical structure)
const sampleConsents = {
	necessary: true,
	measurement: true,
	marketing: false,
	functionality: false,
	experience: false,
};

const sampleConsentInfo = {
	time: 1704067200000,
	type: 'custom' as const,
	identified: false,
};

// All consents true (larger cookie)
const allConsentsTrue = {
	necessary: true,
	measurement: true,
	marketing: true,
	functionality: true,
	experience: true,
};

// Storage configuration options
const defaultStorageConfig = undefined;
const customStorageConfig = {
	storageKey: 'custom-consent',
	crossSubdomain: true,
	defaultExpiryDays: 365,
};

// High-level storage benchmarks
bench('saveConsentToStorage - typical consents', () => {
	saveConsentToStorage(sampleConsents, sampleConsentInfo);
});

bench('saveConsentToStorage - all consents true', () => {
	saveConsentToStorage(allConsentsTrue, sampleConsentInfo);
});

bench('saveConsentToStorage - with custom config', () => {
	saveConsentToStorage(sampleConsents, sampleConsentInfo, customStorageConfig);
});

bench('getConsentFromStorage - after save', () => {
	getConsentFromStorage();
});

bench('getConsentFromStorage - with custom config', () => {
	getConsentFromStorage(customStorageConfig);
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
		expires: 365,
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
	saveConsentToStorage(sampleConsents, sampleConsentInfo);
	getConsentFromStorage();
	deleteConsentFromStorage();
});

await run();
