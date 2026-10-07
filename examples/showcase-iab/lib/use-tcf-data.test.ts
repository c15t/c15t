/** @vitest-environment jsdom */
import type { TCData } from 'c15t';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { useTcfData } from './use-tcf-data';

type Listener = (data: TCData | null, success: boolean) => void;

const savedChoice = (listenerId: number): TCData => ({
	cmpStatus: 'loaded',
	eventStatus: 'tcloaded',
	gdprApplies: true,
	isServiceSpecific: true,
	listenerId,
	publisher: {
		consents: {},
		customPurpose: { consents: {}, legitimateInterests: {} },
		legitimateInterests: {},
		restrictions: {},
	},
	publisherCC: 'GB',
	purpose: { consents: {}, legitimateInterests: {} },
	purposeOneTreatment: false,
	specialFeatureOptins: {},
	tcString: 'saved-choice',
	useNonStandardTexts: false,
	vendor: { consents: {}, disclosedVendors: {}, legitimateInterests: {} },
});

let root: Root | undefined;
let container: HTMLDivElement;

const Probe = () => {
	const data = useTcfData();
	return createElement('output', null, data?.tcString ?? 'no choice');
};

const mount = async () => {
	root = createRoot(container);
	await act(() => root?.render(createElement(Probe)));
};

const unmount = async () => {
	await act(() => root?.unmount());
	root = undefined;
};

beforeEach(() => {
	vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
	container = document.createElement('div');
	document.body.append(container);
});

afterEach(async () => {
	await unmount();
	container.remove();
	delete window.__tcfapi;
	vi.unstubAllGlobals();
});

test('removes a queued subscription through the API that replaced its stub', async () => {
	const stub = vi.fn();
	window.__tcfapi = stub;
	await mount();
	const notify = stub.mock.calls[0]?.[2] as Listener;
	const activeApi = vi.fn();
	window.__tcfapi = activeApi;
	await act(() => notify(savedChoice(7), true));
	expect(container.textContent).toBe('saved-choice');

	await unmount();

	expect(activeApi).toHaveBeenCalledWith(
		'removeEventListener',
		2,
		expect.any(Function),
		7
	);
	expect(stub).toHaveBeenCalledTimes(1);
});

test('removes a registration whose listener ID arrives after unmount', async () => {
	const api = vi.fn();
	window.__tcfapi = api;
	await mount();
	const notify = api.mock.calls[0]?.[2] as Listener;
	await unmount();

	await act(() => notify(savedChoice(8), true));

	expect(api).toHaveBeenLastCalledWith(
		'removeEventListener',
		2,
		expect.any(Function),
		8
	);
});

test('keeps a saved choice while the preferences UI is open', async () => {
	const api = vi.fn();
	window.__tcfapi = api;
	await mount();
	const notify = api.mock.calls[0]?.[2] as Listener;
	await act(() => notify(savedChoice(9), true));
	await act(() =>
		notify({ ...savedChoice(9), eventStatus: 'cmpuishown', tcString: '' }, true)
	);

	expect(container.textContent).toBe('saved-choice');
});
