/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import {
	deniedConsents,
	installHeadProbe,
	loadScripts,
	registerVendorContractCleanup,
	type TestWindow,
} from './e2e-test-utils';
import { crisp } from './vendors/functional/crisp';
import { INTERCOM_API_BASES, intercom } from './vendors/functional/intercom';

const grantedFunctionalityConsents = {
	...deniedConsents,
	functionality: true,
};

function deepFreeze<ValueType>(value: ValueType): ValueType {
	if (value === null || typeof value !== 'object') {
		return value;
	}

	for (const nestedValue of Object.values(value as Record<string, unknown>)) {
		deepFreeze(nestedValue);
	}

	return Object.freeze(value);
}

function cloneFrozen<ValueType>(value: ValueType): ValueType {
	return deepFreeze(structuredClone(value));
}

describe('functional vendor contracts', () => {
	registerVendorContractCleanup();

	it('boots Crisp globals and safe-mode queue before append', () => {
		let crispQueue: unknown[][] | undefined;
		let globals:
			| Pick<
					TestWindow,
					| 'CRISP_COOKIE_DOMAIN'
					| 'CRISP_COOKIE_EXPIRE'
					| 'CRISP_RUNTIME_CONFIG'
					| 'CRISP_TOKEN_ID'
					| 'CRISP_WEBSITE_ID'
			  >
			| undefined;
		let scriptSrc: string | undefined;

		installHeadProbe((node, win) => {
			if (!node.src.includes('client.crisp.chat/l.js')) {
				return;
			}

			scriptSrc = node.src;
			crispQueue = win.$crisp?.map((entry) => [...entry]);
			globals = {
				CRISP_COOKIE_DOMAIN: win.CRISP_COOKIE_DOMAIN,
				CRISP_COOKIE_EXPIRE: win.CRISP_COOKIE_EXPIRE,
				CRISP_RUNTIME_CONFIG: win.CRISP_RUNTIME_CONFIG,
				CRISP_TOKEN_ID: win.CRISP_TOKEN_ID,
				CRISP_WEBSITE_ID: win.CRISP_WEBSITE_ID,
			};
			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...crisp({
						cookieDomain: 'example.com',
						cookieExpiry: 3600,
						locale: 'en',
						safeMode: true,
						sessionMerge: true,
						tokenId: 'CRISP-TOKEN',
						websiteId: 'CRISP-CONTRACT',
					}),
					id: 'crisp-contract',
				},
			],
			grantedFunctionalityConsents
		);

		expect(scriptSrc).toContain('/l.js');
		expect(globals).toEqual({
			CRISP_COOKIE_DOMAIN: 'example.com',
			CRISP_COOKIE_EXPIRE: 3600,
			CRISP_RUNTIME_CONFIG: {
				locale: 'en',
				session_merge: true,
			},
			CRISP_TOKEN_ID: 'CRISP-TOKEN',
			CRISP_WEBSITE_ID: 'CRISP-CONTRACT',
		});
		expect(crispQueue).toEqual([['safe', true]]);
	});

	it('boots Intercom settings and queue before append', () => {
		let queueSnapshot: unknown[][] | undefined;
		let settingsSnapshot: Record<string, unknown> | undefined;
		let scriptSrc: string | undefined;

		installHeadProbe((node, win) => {
			if (!node.src.includes('widget.intercom.io/widget/INTERCOM-CONTRACT')) {
				return;
			}

			win.Intercom?.('boot', { app_id: 'INTERCOM-CONTRACT' });
			if (win.Intercom?.q) {
				queueSnapshot = cloneFrozen(win.Intercom.q);
			} else {
				queueSnapshot = undefined;
			}
			if (win.intercomSettings) {
				settingsSnapshot = cloneFrozen(win.intercomSettings);
			} else {
				settingsSnapshot = undefined;
			}
			scriptSrc = node.src;
			node.dispatchEvent(new Event('load'));
		});

		loadScripts(
			[
				{
					...intercom({
						apiBase: INTERCOM_API_BASES.eu,
						appId: 'INTERCOM-CONTRACT',
						settings: {
							hide_default_launcher: true,
							user_id: 'user-123',
						},
					}),
					id: 'intercom-contract',
				},
			],
			grantedFunctionalityConsents
		);

		expect(scriptSrc).toContain('/widget/INTERCOM-CONTRACT');
		expect(settingsSnapshot).toEqual({
			api_base: INTERCOM_API_BASES.eu,
			app_id: 'INTERCOM-CONTRACT',
			hide_default_launcher: true,
			user_id: 'user-123',
		});
		expect(queueSnapshot).toEqual([['boot', { app_id: 'INTERCOM-CONTRACT' }]]);
	});
});
