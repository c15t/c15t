import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	detectPreferenceTrigger,
	getPreferenceCenterOpener,
	openPreferenceCenter,
	setPreferenceTriggerVisibility,
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

	it('detects trigger using stable data attribute', () => {
		const trigger = document.createElement('button');
		trigger.setAttribute('data-c15t-trigger', 'true');
		document.body.appendChild(trigger);

		expect(detectPreferenceTrigger()).toBe(true);
	});

	it('detects trigger with case-insensitive aria label', () => {
		const trigger = document.createElement('button');
		trigger.setAttribute('aria-label', 'Open Privacy Settings');
		document.body.appendChild(trigger);

		expect(detectPreferenceTrigger()).toBe(true);
	});

	it('restores previous inline display when toggling visibility', () => {
		const trigger = document.createElement('button');
		trigger.setAttribute('data-c15t-trigger', 'true');
		trigger.style.display = 'inline-flex';
		document.body.appendChild(trigger);

		setPreferenceTriggerVisibility(false);
		expect(trigger.style.display).toBe('none');

		setPreferenceTriggerVisibility(true);
		expect(trigger.style.display).toBe('inline-flex');
	});
});
