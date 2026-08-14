/**
 * @fileoverview Tests for the clear-on-revocation store integration
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConsentStoreState } from '../../../store/type';
import { runClearOnRevocation } from '../core';
import { createClearOnRevocationManager } from '../store';
import type { ClearOnRevocationConfig } from '../types';

vi.mock('../core', () => ({
	runClearOnRevocation: vi.fn(),
}));

const runClearOnRevocationMock = vi.mocked(runClearOnRevocation);

const baseConsents = {
	necessary: true,
	functionality: false,
	experience: false,
	marketing: false,
	measurement: true,
};

const baseCategories = [
	'necessary',
	'functionality',
	'experience',
	'marketing',
	'measurement',
] as ConsentStoreState['consentCategories'];

function createState(
	overrides: Partial<
		Pick<
			ConsentStoreState,
			'consents' | 'consentCategories' | 'clearOnRevocation'
		>
	> = {}
): ConsentStoreState {
	return {
		consents: baseConsents,
		consentCategories: baseCategories,
		clearOnRevocation: undefined,
		...overrides,
	} as ConsentStoreState;
}

describe('createClearOnRevocationManager', () => {
	let getState: ReturnType<typeof vi.fn>;
	let setState: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		getState = vi.fn();
		setState = vi.fn();
		vi.clearAllMocks();
	});

	it('sweeps every currently denied category present in consentCategories', () => {
		const config: ClearOnRevocationConfig = {
			marketing: { cookies: ['_fbq'] },
		};

		getState.mockReturnValue(createState({ clearOnRevocation: config }));

		const manager = createClearOnRevocationManager(getState, setState);
		manager.sweepClearOnRevocation();

		expect(runClearOnRevocationMock).toHaveBeenCalledTimes(1);
		const [calledConfig, deniedCategories] =
			runClearOnRevocationMock.mock.calls[0];
		expect(calledConfig).toBe(config);
		expect(deniedCategories).toEqual(
			expect.arrayContaining(['functionality', 'experience', 'marketing'])
		);
		expect(deniedCategories).not.toContain('necessary');
		expect(deniedCategories).not.toContain('measurement');
	});

	it('setClearOnRevocation stores the config and immediately sweeps', () => {
		const config: ClearOnRevocationConfig = {
			marketing: { cookies: ['_fbq'] },
		};

		getState.mockReturnValue(createState({ clearOnRevocation: config }));

		const manager = createClearOnRevocationManager(getState, setState);
		manager.setClearOnRevocation(config);

		expect(setState).toHaveBeenCalledWith({ clearOnRevocation: config });
		expect(runClearOnRevocationMock).toHaveBeenCalledTimes(1);
	});

	it('passes an undefined config through to runClearOnRevocation as-is', () => {
		getState.mockReturnValue(createState({ clearOnRevocation: undefined }));

		const manager = createClearOnRevocationManager(getState, setState);
		manager.sweepClearOnRevocation();

		expect(runClearOnRevocationMock).toHaveBeenCalledWith(
			undefined,
			expect.any(Array)
		);
	});
});
