import { createConsentKernel, getIABControls } from '@c15t/core/v3';
import type {
	ConsentKernel,
	GlobalVendorList,
	SavePayload,
} from '@c15t/core/v3';
import { createScriptLoader } from '@c15t/core/v3/modules/script-loader';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { minimalGVL } from '../../../../iab/src/__tests__/tcf/fixtures/gvl-sample';
import { createMockGVL } from '../../../../iab/src/__tests__/tcf/test-setup';
import { createIAB } from '../../../../iab/src/v3';
import { decodeTCString } from '../../../../iab/src/v3/tcf/tc-string';
import { createDevTools } from '../../index';
import type { DevToolsInstance } from '../../index';

const cleanups: (() => void)[] = [];
const makeKernel = (): ConsentKernel =>
	createConsentKernel({
		initialPolicy: { model: 'iab' },
	});
const mount = (kernel: ConsentKernel) => {
	const tools = createDevTools({
		defaultOpen: true,
		defaultTab: 'iab',
		kernel,
	});
	cleanups.push(tools.destroy);
	return tools;
};
const attachIAB = (
	kernel: ConsentKernel,
	gvl: GlobalVendorList = minimalGVL
) => {
	const iab = createIAB({
		cmpId: 28,
		customVendors: [
			{
				id: 'internal-analytics',
				legIntPurposes: [1],
				name: 'Internal Analytics',
				privacyPolicyUrl: 'https://example.test/privacy',
				purposes: [1],
			},
		],
		gvl,
		kernel,
	});
	cleanups.push(iab.dispose);
	return iab;
};
const button = (tools: DevToolsInstance, name: string): HTMLButtonElement => {
	const found = [...(tools.element?.querySelectorAll('button') ?? [])].find(
		(element) => element.textContent === name
	);
	if (!found) {
		throw new Error(`Missing button: ${name}`);
	}
	return found;
};
const toggle = (tools: DevToolsInstance, key: string): HTMLInputElement => {
	const found = tools.element?.querySelector<HTMLInputElement>(
		`[data-focus-key="${key}"]`
	);
	if (!found) {
		throw new Error(`Missing toggle: ${key}`);
	}
	return found;
};
const selectGroup = (tools: DevToolsInstance, value: string) => {
	const select = tools.element?.querySelector<HTMLSelectElement>(
		'[data-focus-key="iab:group"]'
	);
	if (!select) {
		throw new Error('Missing group selector');
	}
	select.value = value;
	select.dispatchEvent(new Event('change', { bubbles: true }));
};

afterEach(() => {
	for (const cleanup of cleanups.splice(0).reverse()) {
		cleanup();
	}
	document.body.replaceChildren();
});

describe('IAB DevTools', () => {
	it('uses the existing module to edit vendors, purposes, legitimate interests, and features', () => {
		const kernel = makeKernel();
		attachIAB(kernel);
		const tools = mount(kernel);
		const otherKernel = makeKernel();
		expect(getIABControls(otherKernel)).toBeUndefined();

		toggle(tools, 'iab:vendors:1:consent').click();
		toggle(tools, 'iab:vendors:internal-analytics:consent').click();
		toggle(tools, 'iab:vendors:internal-analytics:li').click();
		expect(kernel.getSnapshot().iab?.vendorConsents).toMatchObject({
			1: true,
			'internal-analytics': true,
		});
		expect(
			kernel.getSnapshot().iab?.vendorLegitimateInterests['internal-analytics']
		).toBe(true);

		selectGroup(tools, 'purposes');
		toggle(tools, 'iab:purposes:1:consent').click();
		toggle(tools, 'iab:purposes:1:li').click();
		expect(kernel.getSnapshot().iab?.purposeConsents[1]).toBe(true);
		expect(kernel.getSnapshot().iab?.purposeLegitimateInterests[1]).toBe(true);
		selectGroup(tools, 'features');
		toggle(tools, 'iab:features:1:consent').click();
		expect(kernel.getSnapshot().iab?.specialFeatureOptIns[1]).toBe(true);
		expect(otherKernel.getSnapshot().iab).toBeNull();
	});

	it('updates gated scripts and includes custom vendors in bulk actions', async () => {
		const kernel = makeKernel();
		attachIAB(kernel);
		const loader = createScriptLoader({
			kernel,
			scripts: [
				{
					category: 'measurement',
					id: 'iab-test',
					textContent: 'void 0;',
					vendorId: 1,
				},
			],
		});
		cleanups.push(loader.dispose);
		const tools = mount(kernel);
		button(tools, 'Accept all IAB').click();
		expect(kernel.getSnapshot().iab?.vendorConsents['internal-analytics']).toBe(
			true
		);
		await vi.waitFor(() =>
			expect(tools.getState().scripts[0]?.status).toBe('loaded')
		);
		button(tools, 'Reject all IAB').click();
		expect(kernel.getSnapshot().iab?.vendorConsents['internal-analytics']).toBe(
			false
		);
		await vi.waitFor(() =>
			expect(tools.getState().scripts[0]?.status).toBe('blocked')
		);
	});

	it('generates a fresh TC string before saving and reports transport failures', async () => {
		const save = vi
			.fn<(payload: SavePayload) => Promise<{ ok: boolean }>>()
			.mockResolvedValueOnce({ ok: false })
			.mockResolvedValue({ ok: true });
		const kernel = createConsentKernel({
			initialPolicy: { model: 'iab' },
			transport: { save },
		});
		attachIAB(kernel, createMockGVL());
		const tools = mount(kernel);
		toggle(tools, 'iab:vendors:1:consent').click();
		selectGroup(tools, 'purposes');
		toggle(tools, 'iab:purposes:1:consent').click();
		button(tools, 'Save IAB consent').click();
		expect(button(tools, 'Save IAB consent').disabled).toBe(true);
		await vi.waitFor(() =>
			expect(
				tools.element?.querySelector('[role="alert"]')?.textContent
			).toContain('could not be saved')
		);
		expect(save).toHaveBeenCalledOnce();
		const payload = save.mock.calls[0]?.[0];
		expect(payload?.tcString).toBeTruthy();
		const decoded = await decodeTCString(payload?.tcString ?? '');
		expect(decoded.vendorConsents[1]).toBe(true);
		expect(decoded.purposeConsents[1]).toBe(true);
		button(tools, 'Save IAB consent').click();
		await vi.waitFor(() =>
			expect(tools.element?.querySelector('[role="status"]')?.textContent).toBe(
				'IAB consent saved.'
			)
		);
	});

	it('connects after lazy initialization and becomes read-only after module disposal', () => {
		const kernel = makeKernel();
		const tools = mount(kernel);
		expect(tools.element?.textContent).toContain('IAB is not enabled');
		const iab = attachIAB(kernel);
		expect(button(tools, 'Save IAB consent').disabled).toBe(false);
		iab.dispose();
		expect(button(tools, 'Save IAB consent').disabled).toBe(true);
		expect(tools.element?.textContent).toContain('Read-only');
		expect(getIABControls(kernel)).toBeUndefined();
	});

	it('paginates vendor lists and preserves search through live updates', () => {
		const [template] = Object.values(minimalGVL.vendors);
		if (!template) {
			throw new Error('Missing fixture vendor');
		}
		const vendors = Object.fromEntries(
			Array.from({ length: 45 }, (_, index) => [
				index + 1,
				{ ...template, id: index + 1, name: `Vendor ${index + 1}` },
			])
		);
		const kernel = makeKernel();
		attachIAB(kernel, { ...minimalGVL, vendors });
		const tools = mount(kernel);
		expect(
			tools.element?.querySelectorAll('.c15t-dev-tools__iab-choice')
		).toHaveLength(20);
		button(tools, 'Next IAB page').click();
		expect(tools.element?.textContent).toContain('Page 2 of 3');
		const search = tools.element?.querySelector<HTMLInputElement>(
			'input[type="search"]'
		);
		if (!search) {
			throw new Error('Missing search');
		}
		search.value = 'Vendor 45';
		search.dispatchEvent(new Event('input', { bubbles: true }));
		toggle(tools, 'iab:vendors:45:consent').click();
		expect(
			tools.element?.querySelector<HTMLInputElement>('input[type="search"]')
				?.value
		).toBe('Vendor 45');
		expect(
			tools.element?.querySelectorAll('.c15t-dev-tools__iab-choice')
		).toHaveLength(1);
	});
});
