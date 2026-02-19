import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	getPreferenceCenterOpener,
	openPreferenceCenter,
} from '../../utils/preference-trigger';

describe('preference-trigger', () => {
	beforeEach(() => {
		delete (window as unknown as Record<string, unknown>).customStore;
		delete (window as unknown as Record<string, unknown>).c15tStore;
	});

	it('resolves opener from a custom namespace', () => {
		const setActiveUI = vi.fn();
		(window as unknown as Record<string, unknown>).customStore = {
			getState: () => ({
				setActiveUI,
			}),
		};

		const opener = getPreferenceCenterOpener('customStore');
		expect(opener).not.toBeNull();

		opener?.();
		expect(setActiveUI).toHaveBeenCalledWith('dialog');
	});

	it('openPreferenceCenter uses provided namespace', () => {
		const setActiveUI = vi.fn();
		(window as unknown as Record<string, unknown>).customStore = {
			getState: () => ({
				setActiveUI,
			}),
		};

		const opened = openPreferenceCenter('customStore');
		expect(opened).toBe(true);
		expect(setActiveUI).toHaveBeenCalledWith('dialog');
	});

	it('returns false when namespace is missing', () => {
		expect(openPreferenceCenter('missingStore')).toBe(false);
	});
});
