/**
 * Regression tests for TC string restoration after a material policy change.
 *
 * When core marks the saved choice as requiring re-consent, restoring the old
 * TC string would re-enable invalidated grants and hide the consent prompt.
 *
 * @vitest-environment jsdom
 */

import type { ConsentStoreState, IABConfig } from 'c15t';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeIABMode } from '../../init/iab-initializer';
import { IAB_STORAGE_KEYS } from '../../tcf/constants';
import { createInitialIABState } from '../../tcf/store';
import { destroyIABStub } from '../../tcf/stub';
import { generateTCString } from '../../tcf/tc-string';
import {
	cleanupTCFApi,
	createMockGVL,
	createMockTCFConsentAllGranted,
	setupStorageMock,
} from './test-setup';

describe('TC string restoration', () => {
	let storageMock: ReturnType<typeof setupStorageMock>;

	beforeEach(() => {
		storageMock = setupStorageMock();
		document.cookie = `${IAB_STORAGE_KEYS.TC_STRING_COOKIE}=; max-age=0; path=/`;
	});

	afterEach(() => {
		destroyIABStub();
		cleanupTCFApi();
		storageMock.cleanup();
		document.cookie = `${IAB_STORAGE_KEYS.TC_STRING_COOKIE}=; max-age=0; path=/`;
	});

	async function initWithStoredGrant(consentInfo: {
		requiresReconsent?: boolean;
	}) {
		const gvl = createMockGVL();
		const tcString = await generateTCString(
			createMockTCFConsentAllGranted(),
			gvl,
			{ cmpId: 28, cmpVersion: 1 }
		);
		storageMock.storage.set(IAB_STORAGE_KEYS.TC_STRING_LOCAL, tcString);

		const config: IABConfig = { enabled: true, cmpId: 28, cmpVersion: 1 };
		const deniedConsents = {
			necessary: true,
			functionality: false,
			experience: false,
			marketing: false,
			measurement: false,
		};
		let state = {
			iab: createInitialIABState(config),
			consents: deniedConsents,
			selectedConsents: deniedConsents,
			consentInfo: { time: 1, subjectId: 'sub_existing', ...consentInfo },
			activeUI: 'banner',
			updateScripts: vi.fn(),
			callbacks: {},
		} as unknown as ConsentStoreState;
		const get = () => state;
		const set = (partial: Partial<ConsentStoreState>) => {
			state = { ...state, ...partial };
		};

		await initializeIABMode(config, { get, set }, gvl);
		return { state, tcString };
	}

	it('restores the stored grant when no re-consent is required', async () => {
		const { state, tcString } = await initWithStoredGrant({});

		expect(state.iab?.tcString).toBe(tcString);
		expect(state.consents.measurement).toBe(true);
		expect(state.activeUI).toBe('none');
	});

	it('keeps invalidated grants denied and the prompt open during re-consent', async () => {
		const { state } = await initWithStoredGrant({ requiresReconsent: true });

		expect(state.iab?.tcString).toBeFalsy();
		expect(state.consents.measurement).toBe(false);
		expect(state.activeUI).toBe('banner');
	});
});
