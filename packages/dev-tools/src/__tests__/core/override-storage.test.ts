import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	clearPersistedOverrides,
	loadPersistedOverrides,
	persistOverrides,
} from '../../core/override-storage';

const STORAGE_KEY = 'test-devtools-overrides';

describe('override-storage', () => {
	let mockLocalStorage: Record<string, string>;

	beforeEach(() => {
		mockLocalStorage = {};

		vi.stubGlobal('localStorage', {
			getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
			removeItem: vi.fn((key: string) => {
				Reflect.deleteProperty(mockLocalStorage, key);
			}),
			setItem: vi.fn((key: string, value: string) => {
				mockLocalStorage[key] = value;
			}),
		});
	});

	it('loads persisted overrides from localStorage', () => {
		mockLocalStorage[STORAGE_KEY] = JSON.stringify({
			country: 'DE',
			gpc: true,
			language: 'de',
			region: 'BE',
		});

		const overrides = loadPersistedOverrides(STORAGE_KEY);

		expect(overrides).toEqual({
			country: 'DE',
			gpc: true,
			language: 'de',
			region: 'BE',
		});
	});

	it('normalizes empty string override values', () => {
		mockLocalStorage[STORAGE_KEY] = JSON.stringify({
			country: '  ',
			gpc: false,
			language: '  de  ',
			region: '',
		});

		const overrides = loadPersistedOverrides(STORAGE_KEY);

		expect(overrides).toEqual({
			country: undefined,
			gpc: false,
			language: 'de',
			region: undefined,
		});
	});

	it('returns null when persisted value is invalid json', () => {
		mockLocalStorage[STORAGE_KEY] = '{invalid-json';

		expect(loadPersistedOverrides(STORAGE_KEY)).toBeNull();
	});

	it('returns null when persisted data has no usable overrides', () => {
		mockLocalStorage[STORAGE_KEY] = JSON.stringify({
			country: '',
			gpc: 'true',
			language: '',
			region: ' ',
		});

		expect(loadPersistedOverrides(STORAGE_KEY)).toBeNull();
	});

	it('persists non-empty override data', () => {
		persistOverrides(
			{
				country: 'US',
				gpc: undefined,
				language: 'en',
				region: 'CA',
			},
			STORAGE_KEY
		);

		expect(localStorage.setItem).toHaveBeenCalledWith(
			STORAGE_KEY,
			JSON.stringify({
				country: 'US',
				gpc: undefined,
				language: 'en',
				region: 'CA',
			})
		);
	});

	it('clears storage when persist receives empty overrides', () => {
		persistOverrides(
			{
				country: undefined,
				gpc: undefined,
				language: undefined,
				region: undefined,
			},
			STORAGE_KEY
		);

		expect(localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
	});

	it('removes persisted overrides', () => {
		clearPersistedOverrides(STORAGE_KEY);
		expect(localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
	});
});
