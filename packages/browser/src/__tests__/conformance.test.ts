import type { TestDriver, MountOptions } from '@c15t/conformance/driver';
import {
	IAB_FIXTURE_CMP_ID,
	IAB_FIXTURE_CMP_VERSION,
	MINIMAL_GVL,
} from '@c15t/conformance/fixtures/gvl';
import {
	runA11yConformance,
	runIabUiConformance,
	clearBrowserConsentStorage,
} from '@c15t/conformance/suite';
import type { SuiteApi } from '@c15t/conformance/suite';
import type { ConsentPresentation } from '@c15t/core';
import { afterEach, describe, expect, test } from 'vitest';

import { init as initIAB } from '../iab';
import { init } from '../index';
import type { ConsentClient } from '../types';

const clients = new Set<ConsentClient>();
let current: ConsentClient | undefined;
const driver = (shadow: boolean): TestDriver => ({
	framework: 'browser',
	getStore() {
		if (!current) {
			throw new Error('Mount the browser client first.');
		}
		const client = current;
		return {
			getState: () => ({ ...client.getSnapshot() }),
			subscribe: (listener) => client.subscribe(listener),
		};
	},
	async mount(options: MountOptions) {
		const iab = options.component.startsWith('iab-');
		const provided = options.providerOptions as
			| { presentation?: ConsentPresentation; trapFocus?: boolean }
			| undefined;
		const client = (iab ? initIAB : init)({
			iab: iab
				? {
						cmpId: IAB_FIXTURE_CMP_ID,
						cmpVersion: IAB_FIXTURE_CMP_VERSION,
						gvl: structuredClone(MINIMAL_GVL),
					}
				: undefined,
			mode: 'offline',
			overrides: { country: 'DE' },
			policyRules: [iab ? 'europeIab' : 'europeOptIn'],
			presentation: provided?.presentation,
			ui: {
				banner: { trapFocus: provided?.trapFocus },
				disableAnimation: true,
				shadow,
				styles: false,
			},
		});
		clients.add(client);
		current = client;
		await client.ready();
		await client.runtime.iab?.whenReady?.();
		if (options.component.endsWith('dialog')) {
			client.openDialog();
		}
		const root = client.ui?.host;
		if (!root) {
			throw new Error('Missing browser UI host.');
		}
		return {
			root,
			unmount: () => {
				client.dispose();
				clients.delete(client);
			},
		};
	},
	serverRender: () => {
		throw new Error(
			'Script-tag UI is client rendered; this driver runs UI suites only.'
		);
	},
});
const api: SuiteApi = { describe, expect, test };

afterEach(() => {
	for (const client of clients) {
		client.dispose();
	}
	clients.clear();
	clearBrowserConsentStorage();
});

describe('shared ordinary UI accessibility', () =>
	runA11yConformance(driver(false), api));
for (const shadow of [false, true]) {
	describe(`shared IAB UI, shadow=${shadow}`, () =>
		runIabUiConformance(driver(shadow), api));
}
