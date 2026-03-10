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
			setItem: vi.fn((key: string, value: string) => {
				mockLocalStorage[key] = value;
			}),
			removeItem: vi.fn((key: string) => {
				delete mockLocalStorage[key];
			}),
		});
	});

	it('loads persisted overrides from localStorage', () => {
		mockLocalStorage[STORAGE_KEY] = JSON.stringify({
			country: 'DE',
			region: 'BE',
			language: 'de',
			gpc: true,
		});

		const overrides = loadPersistedOverrides(STORAGE_KEY);

		expect(overrides).toEqual({
			country: 'DE',
			region: 'BE',
			language: 'de',
			gpc: true,
		});
	});

	it('normalizes empty string override values', () => {
		mockLocalStorage[STORAGE_KEY] = JSON.stringify({
			country: '  ',
			region: '',
			language: '  de  ',
			gpc: false,
		});

		const overrides = loadPersistedOverrides(STORAGE_KEY);

		expect(overrides).toEqual({
			country: undefined,
			region: undefined,
			language: 'de',
			gpc: false,
		});
	});

	it('returns null when persisted value is invalid json', () => {
		mockLocalStorage[STORAGE_KEY] = '{invalid-json';

		expect(loadPersistedOverrides(STORAGE_KEY)).toBeNull();
	});

	it('returns null when persisted data has no usable overrides', () => {
		mockLocalStorage[STORAGE_KEY] = JSON.stringify({
			country: '',
			region: ' ',
			language: '',
			gpc: 'true',
		});

		expect(loadPersistedOverrides(STORAGE_KEY)).toBeNull();
	});

	it('persists non-empty override data', () => {
		persistOverrides(
			{
				country: 'US',
				region: 'CA',
				language: 'en',
				gpc: undefined,
			},
			STORAGE_KEY
		);

		expect(localStorage.setItem).toHaveBeenCalledWith(
			STORAGE_KEY,
			JSON.stringify({
				country: 'US',
				region: 'CA',
				language: 'en',
				gpc: undefined,
			})
		);
	});

	it('clears storage when persist receives empty overrides', () => {
		persistOverrides(
			{
				country: undefined,
				region: undefined,
				language: undefined,
				gpc: undefined,
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
