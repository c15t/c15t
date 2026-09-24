/** @vitest-environment jsdom */
import type {
	ConsentManagerInterface,
	ConsentStoreState,
	GlobalVendorList,
} from 'c15t';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeIABMode } from '../init/iab-initializer';
import { createIABManager } from '../tcf/store';

const mocks = vi.hoisted(() => ({
	loadFromStorage: vi.fn(),
	generateTCString: vi.fn(),
	decodeTCString: vi.fn(),
}));

vi.mock('c15t', async (importOriginal) => ({
	...(await importOriginal<typeof import('c15t')>()),
	getConsentFromStorage: vi.fn(() => null),
	saveConsentToStorage: vi.fn(),
	generateSubjectId: vi.fn(() => 'sub_test'),
}));

vi.mock('../tcf', () => ({
	initializeIABStub: vi.fn(),
	fetchGVL: vi.fn(),
	createCMPApi: vi.fn(() => ({
		loadFromStorage: mocks.loadFromStorage,
		saveToStorage: vi.fn(),
		updateConsent: vi.fn(),
	})),
	decodeTCString: mocks.decodeTCString,
	generateTCString: mocks.generateTCString,
	iabPurposesToC15tConsents: vi.fn(() => ({
		necessary: true,
		marketing: false,
	})),
}));

const gvl: GlobalVendorList = {
	gvlSpecificationVersion: 3,
	vendorListVersion: 142,
	tcfPolicyVersion: 5,
	lastUpdated: '2024-01-15T16:00:00Z',
	purposes: {},
	specialPurposes: {},
	features: {},
	specialFeatures: {},
	vendors: {},
};

describe('IAB visit measurement hooks', () => {
	let state: ConsentStoreState;
	let manager: ConsentManagerInterface;
	let visitId: string | undefined;
	const get = () => state;
	const set = (partial: Partial<ConsentStoreState>) => {
		state = { ...state, ...partial };
	};
	const config = { enabled: true, cmpId: 123 };
	beforeEach(() => {
		vi.clearAllMocks();
		visitId = 'ac2025bb-d674-4f94-b528-4f4b48bf7806';
		mocks.loadFromStorage.mockReturnValue(null);
		mocks.generateTCString.mockResolvedValue('new-tc-string');
		mocks.decodeTCString.mockResolvedValue({
			purposeConsents: {},
			purposeLegitimateInterests: {},
			vendorConsents: {},
			vendorLegitimateInterests: {},
			specialFeatureOptIns: {},
		});
		manager = {
			init: vi.fn(),
			identifyUser: vi.fn(),
			$fetch: vi.fn(),
			setConsent: vi.fn().mockResolvedValue({ ok: true, data: {} }),
		};
		state = {
			consentInfo: null,
			activeUI: 'banner',
			callbacks: {},
			consents: {},
			selectedConsents: {},
			updateScripts: vi.fn(),
		} as unknown as ConsentStoreState;
		state.iab = createIABManager(config, get, set, manager, () => visitId);
	});

	it('restores an existing choice without creating a new save', async () => {
		mocks.loadFromStorage.mockReturnValue('stored-tc-string');
		await initializeIABMode(config, { get, set }, gvl);
		expect(state.iab?.tcString).toBe('stored-tc-string');
		expect(state.activeUI).toBe('none');
		expect(manager.setConsent).not.toHaveBeenCalled();
	});

	it('captures the visit before asynchronous save work and preserves TCF metadata', async () => {
		await initializeIABMode(config, { get, set }, gvl);
		const originalVisit = visitId;
		const saving = state.iab?.save();
		visitId = undefined;
		await saving;
		expect(manager.setConsent).toHaveBeenCalledWith({
			body: expect.objectContaining({
				tcString: 'new-tc-string',
				metadata: {
					source: 'iab_tcf',
					acceptanceMethod: 'iab',
					c15tVisitId: originalVisit,
				},
			}),
		});
	});

	it('omits the visit link when measurement is disabled', async () => {
		visitId = undefined;
		await initializeIABMode(config, { get, set }, gvl);
		await state.iab?.save();
		expect(manager.setConsent).toHaveBeenCalledWith({
			body: expect.objectContaining({
				metadata: { source: 'iab_tcf', acceptanceMethod: 'iab' },
			}),
		});
	});
});
