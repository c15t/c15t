import { afterEach, describe, expect, it, vi } from 'vitest';

import { readPreviewVisitor, rememberPreviewVisitor } from './visitor-storage';

const unavailableStorage = () => {
	throw new DOMException('Storage is blocked', 'SecurityError');
};

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('visitor preview storage', () => {
	it('remembers the selected visitor for the next mount', () => {
		const records = new Map<string, string>();
		vi.stubGlobal('sessionStorage', {
			getItem: (key: string) => records.get(key) ?? null,
			setItem: (key: string, value: string) => records.set(key, value),
		});

		expect(readPreviewVisitor()).toBeNull();
		rememberPreviewVisitor('usCa');
		expect(readPreviewVisitor()).toBe('usCa');
	});

	it('treats blocked storage access as no remembered visitor', () => {
		vi.stubGlobal('sessionStorage', undefined);
		Object.defineProperty(globalThis, 'sessionStorage', {
			configurable: true,
			get: unavailableStorage,
		});

		expect(readPreviewVisitor()).toBeNull();
	});

	it('ignores blocked storage access when remembering a visitor', () => {
		vi.stubGlobal('sessionStorage', undefined);
		Object.defineProperty(globalThis, 'sessionStorage', {
			configurable: true,
			get: unavailableStorage,
		});

		expect(() => rememberPreviewVisitor('de')).not.toThrow();
	});

	it('treats a failed read as no remembered visitor', () => {
		vi.stubGlobal('sessionStorage', { getItem: unavailableStorage });

		expect(readPreviewVisitor()).toBeNull();
	});

	it('ignores a failed write when remembering a visitor', () => {
		vi.stubGlobal('sessionStorage', { setItem: unavailableStorage });

		expect(() => rememberPreviewVisitor('br')).not.toThrow();
	});
});
