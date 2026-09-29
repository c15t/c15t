/**
 * Regression tests for IAB state after a material policy change.
 *
 * When core marks the saved choice as requiring re-consent, restoring the old
 * TC string or custom-vendor grants would re-enable invalidated grants and
 * hide the consent prompt. A fresh IAB choice must then clear the marker.
 *
 * @vitest-environment jsdom
 */

import type {
	ConsentManagerInterface,
	ConsentStoreState,
	IABConfig,
} from 'c15t';
import { getConsentFromStorage, saveConsentToStorage } from 'c15t';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeIABMode } from '../../init/iab-initializer';
import { IAB_STORAGE_KEYS } from '../../tcf/constants';
import { createIABActions, createInitialIABState } from '../../tcf/store';
import { destroyIABStub } from '../../tcf/stub';
import { generateTCString } from '../../tcf/tc-string';
import {
	cleanupTCFApi,
	createMockGVL,
	createMockTCFConsentAllGranted,
	setupStorageMock,
} from './test-setup';

const CUSTOM_VENDOR_ID = 'custom-analytics';

describe('IAB state during re-consent', () => {
	let storageMock: ReturnType<typeof setupStorageMock>;

	beforeEach(() => {
		storageMock = setupStorageMock();
		document.cookie = `${IAB_STORAGE_KEYS.TC_STRING_COOKIE}=; max-age=0; path=/`;
		document.cookie = 'c15t=; max-age=0; path=/';
	});

	afterEach(() => {
		destroyIABStub();
		cleanupTCFApi();
		storageMock.cleanup();
		document.cookie = `${IAB_STORAGE_KEYS.TC_STRING_COOKIE}=; max-age=0; path=/`;
		document.cookie = 'c15t=; max-age=0; path=/';
	});

	async function initWithStoredGrant(requiresReconsent: boolean) {
		const gvl = createMockGVL();
		const tcString = await generateTCString(
			createMockTCFConsentAllGranted(),
			gvl,
			{ cmpId: 28, cmpVersion: 1 }
		);
		storageMock.storage.set(IAB_STORAGE_KEYS.TC_STRING_LOCAL, tcString);

		const deniedConsents = {
			necessary: true,
			functionality: false,
			experience: false,
			marketing: false,
			measurement: false,
		};
		const consentInfo = {
			time: 1,
			subjectId: 'sub_existing',
			materialPolicyFingerprint: 'f'.repeat(64),
			...(requiresReconsent ? { requiresReconsent: true } : {}),
		};
		saveConsentToStorage({
			consents: deniedConsents,
			consentInfo,
			iabCustomVendorConsents: { [CUSTOM_VENDOR_ID]: true },
		});

		const config: IABConfig = {
			enabled: true,
			cmpId: 28,
			cmpVersion: 1,
			customVendors: [
				{
					id: CUSTOM_VENDOR_ID,
					name: 'Custom analytics',
					privacyPolicyUrl: 'https://example.com/privacy',
					purposes: [1, 8],
				},
			],
		};
		let state = {
			iab: createInitialIABState(config),
			consents: deniedConsents,
			selectedConsents: deniedConsents,
			consentInfo,
			activeUI: 'banner',
			lastBannerFetchData: {
				policy: { id: 'policy_iab', model: 'iab' },
			},
			updateScripts: vi.fn(),
			callbacks: {},
		} as unknown as ConsentStoreState;
		const get = () => state;
		const set = (partial: Partial<ConsentStoreState>) => {
			state = { ...state, ...partial };
		};

		await initializeIABMode(config, { get, set }, gvl);
		return { get, set, tcString };
	}

	it('restores stored grants when no re-consent is required', async () => {
		const { get, tcString } = await initWithStoredGrant(false);

		expect(get().iab?.tcString).toBe(tcString);
		expect(get().iab?.vendorConsents[CUSTOM_VENDOR_ID]).toBe(true);
		expect(get().consents.measurement).toBe(true);
		expect(get().activeUI).toBe('none');
	});

	it('keeps invalidated grants denied and the prompt open', async () => {
		const { get } = await initWithStoredGrant(true);

		expect(get().iab?.tcString).toBeFalsy();
		expect(get().iab?.vendorConsents[CUSTOM_VENDOR_ID]).toBe(false);
		expect(get().consents.measurement).toBe(false);
		expect(get().activeUI).toBe('banner');
	});

	it('clears the re-consent marker when the visitor saves a new choice', async () => {
		const { get, set } = await initWithStoredGrant(true);
		const manager = {
			setConsent: vi.fn().mockResolvedValue({ ok: true, data: {} }),
		} as unknown as ConsentManagerInterface;

		await createIABActions(get, set, manager).save();

		const stored = getConsentFromStorage<{
			consentInfo: ConsentStoreState['consentInfo'];
		}>();
		for (const consentInfo of [get().consentInfo, stored?.consentInfo]) {
			// Cookies omit false flags, so check that the marker is not set.
			expect(consentInfo?.requiresReconsent).toBeFalsy();
			expect(consentInfo?.subjectId).toBe('sub_existing');
			expect(consentInfo?.materialPolicyFingerprint).toMatch(/^[a-f0-9]{64}$/);
			expect(consentInfo?.materialPolicyFingerprint).not.toBe('f'.repeat(64));
		}
	});
});
