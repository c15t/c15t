import { afterEach, expect, it, vi } from 'vitest';

import { createGlobal, installGlobal } from '../global';
import type { C15tGlobal } from '../global';
import type { ConsentClientOptions } from '../types';

const testWindow = window as Window & { c15t?: unknown };
let api: C15tGlobal | undefined;

const seedAnalytics = (): void => {
	document.cookie = 'analytics-id=visitor; Path=/';
	localStorage.setItem('analytics:visitor', 'visitor');
	sessionStorage.setItem('analytics:session', 'session');
};

const expectAnalyticsCleared = (): void => {
	expect(document.cookie).not.toContain('analytics-id=');
	expect(localStorage.getItem('analytics:visitor')).toBeNull();
	expect(sessionStorage.getItem('analytics:session')).toBeNull();
};

afterEach(() => {
	api?.dispose();
	api = undefined;
	testWindow.c15t = undefined;
	localStorage.clear();
	sessionStorage.clear();
	for (const entry of document.cookie.split(';')) {
		const name = entry.split('=')[0]?.trim();
		if (name) {
			document.cookie = `${name}=; Max-Age=0; Path=/`;
		}
	}
});

it.each(['direct init', 'queued config'])(
	'clears denied browser data through %s and preserves granted categories',
	async (configuration) => {
		const options: ConsentClientOptions = {
			clearOnRevocation: {
				marketing: { localStorage: ['marketing:visitor'] },
				measurement: {
					cookies: ['analytics-id'],
					localStorage: ['analytics:*'],
					sessionStorage: ['analytics:session'],
				},
			},
			mode: 'offline',
			policyRules: [
				{
					categories: ['measurement', 'marketing'],
					id: 'cleanup-test',
					match: { fallback: true },
					model: 'opt-in',
					prompt: 'choice',
					scopeMode: 'strict',
				},
			],
			storageConfig: { storageKey: 'analytics:consent' },
			ui: false,
		};
		if (configuration === 'queued config') {
			testWindow.c15t = [['config', options]];
		}
		api = installGlobal(createGlobal({}));
		seedAnalytics();
		api.init(configuration === 'direct init' ? options : undefined);
		await api.ready();
		expect(api.has('measurement')).toBe(false);
		expectAnalyticsCleared();

		await api.acceptAll();
		await vi.waitFor(() =>
			expect(localStorage.getItem('analytics:consent')).not.toBeNull()
		);
		seedAnalytics();
		localStorage.setItem('marketing:visitor', 'keep');
		localStorage.setItem('application:setting', 'keep');
		expect(document.cookie).toContain('analytics-id=visitor');
		expect(localStorage.getItem('analytics:visitor')).toBe('visitor');
		expect(sessionStorage.getItem('analytics:session')).toBe('session');

		await api.save({ marketing: true, measurement: false });

		expectAnalyticsCleared();
		expect(localStorage.getItem('marketing:visitor')).toBe('keep');
		expect(localStorage.getItem('application:setting')).toBe('keep');
		expect(localStorage.getItem('analytics:consent')).not.toBeNull();
	}
);
