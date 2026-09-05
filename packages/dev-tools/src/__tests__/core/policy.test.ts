import { createConsentKernel } from '@c15t/core';
import { createPersistence } from '@c15t/core/modules/persistence';
import { afterEach, expect, it, vi } from 'vitest';

import { writePolicyResolutionWire } from '../../../../schema/src/types';
import { createDevTools } from '../../index';
import { policyResolution } from '../helpers/kernel';

const cleanups: (() => void)[] = [];
afterEach(() => {
	for (const cleanup of cleanups.splice(0).reverse()) {
		cleanup();
	}
	document.body.replaceChildren();
	localStorage.clear();
	for (const entry of document.cookie.split(';')) {
		document.cookie = `${entry.split('=')[0]}=; Max-Age=0; Path=/`;
	}
	vi.restoreAllMocks();
});

it('inspects notice, privacy and rights without creating a choice or writing storage', async () => {
	const kernel = createConsentKernel({
		initialPolicyResolution: policyResolution({
			model: 'opt-out',
			privacySignals: { gpc: { denyCategories: ['marketing'] } },
			prompt: 'notice',
		}),
	});
	cleanups.push(kernel.dispose);
	await kernel.commands.init();
	kernel.set.privacySignals({ gpc: true });
	const choice = vi.fn();
	kernel.events.on('choice:recorded', choice);
	const writes = vi.spyOn(Storage.prototype, 'setItem');
	const tools = createDevTools({
		defaultOpen: true,
		defaultTab: 'policy',
		kernel,
	});
	cleanups.push(tools.destroy);
	const text = tools.element?.textContent ?? '';
	for (const expected of [
		'Explicit choice receipts',
		'Effective permissions',
		'Required prompt',
		'missing',
		'Local notice dismissal',
		'Standing privacy directives',
		'Action constraints and persistent rights',
		'opt-out',
		'Presentation resolution',
		'Resolved defaults only',
	]) {
		expect(text).toContain(expected);
	}
	expect(text).toContain(`"evaluatedAt": ${kernel.getSnapshot().evaluatedAt}`);
	expect(text).toContain('"nextDeadline": null');
	expect(kernel.getSnapshot().explicitChoice).toBeNull();
	expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
	expect(kernel.getSnapshot().optOutDirectives).toHaveLength(1);
	expect(writes).not.toHaveBeenCalled();
	expect(choice).not.toHaveBeenCalled();
	const [directive] = kernel.getSnapshot().optOutDirectives;
	await tools.actions.dismissNotice();
	expect(kernel.getSnapshot().noticeDismissal).not.toBeNull();
	expect(kernel.getSnapshot().explicitChoice).toBeNull();
	expect(kernel.getSnapshot().optOutDirectives[0]).toEqual(directive);
	expect(
		tools.getState().events.some((event) => event.type === 'notice:dismissed')
	).toBe(true);
	expect(choice).not.toHaveBeenCalled();
});

it('saves unmasked displayed choices under GPC and preserves hidden receipt clocks', async () => {
	const kernel = createConsentKernel({
		initialPolicyResolution: policyResolution({
			model: 'opt-out',
			privacySignals: { gpc: { denyCategories: ['marketing'] } },
			prompt: 'notice',
		}),
	});
	cleanups.push(kernel.dispose);
	await kernel.commands.save({ experience: false });
	const hidden = kernel.getSnapshot().explicitChoice?.categories.experience;
	kernel.set.privacySignals({ gpc: true });
	const tools = createDevTools({
		defaultOpen: true,
		getConsentCategories: () => ['necessary', 'marketing'],
		kernel,
	});
	cleanups.push(tools.destroy);
	expect(
		tools.element?.querySelector<HTMLInputElement>(
			'[data-focus-key="consent:marketing"]'
		)?.checked
	).toBe(true);
	expect(tools.element?.textContent).toContain('Effective: blocked');
	tools.actions.setDraft({ experience: true, marketing: false });
	expect(
		kernel.getSnapshot().explicitChoice?.categories.marketing
	).toBeUndefined();
	expect(tools.getState().draft).toEqual({ marketing: false });
	await tools.actions.save();
	expect(kernel.getSnapshot().explicitChoice?.categories.marketing?.value).toBe(
		false
	);
	expect(kernel.getSnapshot().explicitChoice?.categories.experience).toEqual(
		hidden
	);
	expect(kernel.getSnapshot().noticeDismissal).toBeNull();
	await tools.actions.save('all');
	expect(kernel.getSnapshot().explicitChoice?.categories.marketing?.value).toBe(
		true
	);
	expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
	expect(kernel.getSnapshot().explicitChoice?.categories.experience).toEqual(
		hidden
	);
});

it('keeps persistent rights and labels host presentation diagnostics without claiming rendered equivalence', () => {
	const kernel = createConsentKernel({
		initialPolicyResolution: policyResolution({
			model: 'opt-out',
			prompt: 'none',
		}),
	});
	cleanups.push(kernel.dispose);
	const tools = createDevTools({
		defaultOpen: true,
		defaultTab: 'policy',
		getPresentation: () => ({ preferences: { primaryActions: ['accept'] } }),
		kernel,
	});
	cleanups.push(tools.destroy);
	expect(tools.element?.textContent).toContain('host-options');
	expect(tools.element?.textContent).toContain(
		'equivalent-prominence-overridden'
	);
	expect(tools.element?.textContent).toContain(
		'does not verify the rendered controls'
	);
	expect(tools.element?.textContent).toContain('disclosure');
	expect(tools.element?.textContent).toContain('preferences');
	tools.setActiveTab('actions');
	expect(tools.element?.textContent).toContain('Open preferences');
	expect(tools.element?.textContent).not.toContain('Dismiss local notice');
});

it('clears through the supplied persistence handle and discards unsaved selections', async () => {
	const kernel = createConsentKernel();
	cleanups.push(kernel.dispose);
	const persistence = createPersistence({
		kernel,
		skipHydration: true,
		storageConfig: { storageKey: 'devtools-custom' },
	});
	cleanups.push(persistence.dispose);
	const tools = createDevTools({ clearRecords: persistence.clear, kernel });
	cleanups.push(tools.destroy);
	await tools.actions.save('all');
	await vi.waitFor(() =>
		expect(localStorage.getItem('devtools-custom')).not.toBeNull()
	);
	tools.actions.setDraft({ marketing: false });
	tools.actions.clearRecords?.();
	expect(localStorage.getItem('devtools-custom')).toBeNull();
	expect(kernel.getSnapshot().explicitChoice).toBeNull();
	expect(tools.getState().draft).toEqual({});
	expect(
		tools.getState().events.some((event) => event.type === 'records:cleared')
	).toBe(true);
});

it('records choice and permission provenance separately without calling a draft change consent', async () => {
	const kernel = createConsentKernel();
	cleanups.push(kernel.dispose);
	const tools = createDevTools({ kernel });
	cleanups.push(tools.destroy);
	tools.actions.setDraft({ marketing: true });
	expect(tools.getState().events).toEqual([]);
	expect(kernel.getSnapshot().explicitChoice).toBeNull();
	await tools.actions.save({ marketing: true });
	const { events } = tools.getState();
	const recorded = events.find((event) => event.type === 'choice:recorded');
	expect(recorded?.data?.confirmed).toEqual(['marketing']);
	expect(recorded?.data?.actionAt).toBe(
		kernel.getSnapshot().explicitChoice?.categories.marketing?.confirmedAt
	);
	expect(events.some((event) => event.type === 'permissions:changed')).toBe(
		true
	);
});

it('keeps drafts local across privacy updates and resets them when a choice is recorded', async () => {
	const kernel = createConsentKernel({
		initialPolicyResolution: policyResolution({
			model: 'opt-out',
			privacySignals: { gpc: { denyCategories: ['marketing'] } },
		}),
	});
	cleanups.push(kernel.dispose);
	const first = createDevTools({
		getPresentation: () => ({
			preferences: { defaults: { measurement: false } },
		}),
		kernel,
	});
	const second = createDevTools({ kernel });
	cleanups.push(first.destroy, second.destroy);
	first.actions.setDraft({ marketing: true });
	kernel.set.privacySignals({ gpc: true });
	expect(first.getState().draft).toEqual({ marketing: true });
	expect(second.getState().draft).toEqual({});
	await first.actions.save();
	expect(kernel.getSnapshot().explicitChoice?.categories.marketing?.value).toBe(
		true
	);
	expect(
		kernel.getSnapshot().explicitChoice?.categories.measurement?.value
	).toBe(false);
	expect(kernel.getSnapshot().effectivePermissions.marketing).toBe(false);
	expect(first.getState().draft).toEqual({});
});

it('discards the captured draft after Accept all so a later save cannot undo it', async () => {
	const kernel = createConsentKernel();
	cleanups.push(kernel.dispose);
	const tools = createDevTools({ defaultOpen: true, kernel });
	cleanups.push(tools.destroy);
	tools.actions.setDraft({ marketing: false });
	await tools.actions.save('all');
	expect(tools.getState().draft).toEqual({});
	expect(
		tools.element?.querySelector<HTMLInputElement>(
			'[data-focus-key="consent:marketing"]'
		)?.checked
	).toBe(true);
	await tools.actions.save();
	expect(kernel.getSnapshot().explicitChoice?.categories.marketing?.value).toBe(
		true
	);
});

it('requires review after a material policy change and provides an explicit discard action', async () => {
	const kernel = createConsentKernel({
		initialPolicyResolution: policyResolution(),
		transport: {
			init: () =>
				Promise.resolve({
					policyResolution: writePolicyResolutionWire(
						policyResolution({ model: 'opt-out' })
					),
				}),
		},
	});
	cleanups.push(kernel.dispose);
	const tools = createDevTools({ defaultOpen: true, kernel });
	cleanups.push(tools.destroy);
	tools.actions.setDraft({ marketing: false });
	await tools.actions.init();
	expect(kernel.getSnapshot().resolution.status).toBe('matched');
	expect(kernel.getSnapshot().model).toBe('opt-out');
	expect(tools.getState().draft).toEqual({ marketing: false });
	expect(tools.element?.querySelector('[role="alert"]')?.textContent).toContain(
		'Policy changed'
	);
	await expect(tools.actions.save()).rejects.toThrow('Discard the draft');
	await expect(tools.actions.save({ marketing: true })).rejects.toThrow(
		'Discard the draft'
	);
	expect(kernel.getSnapshot().explicitChoice).toBeNull();
	const discard = [...(tools.element?.querySelectorAll('button') ?? [])].find(
		(button) => button.textContent === 'Discard draft'
	);
	discard?.click();
	expect(tools.getState().draftFingerprint).toBeNull();
	await tools.actions.save();
	expect(kernel.getSnapshot().explicitChoice?.categories.marketing?.value).toBe(
		true
	);
});

it('preserves an edit made while an earlier save waits for its canonical subject acknowledgement', async () => {
	const acknowledgement = Promise.withResolvers<{
		ok: boolean;
		subjectId: string;
	}>();
	const save = vi.fn(() => acknowledgement.promise);
	const kernel = createConsentKernel({ transport: { save } });
	cleanups.push(kernel.dispose);
	const tools = createDevTools({ kernel });
	cleanups.push(tools.destroy);
	tools.actions.setDraft({ marketing: false });
	const pending = tools.actions.save('all');
	await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
	tools.actions.setDraft({ marketing: false, measurement: false });
	acknowledgement.resolve({
		ok: true,
		subjectId: 'canonical-devtools-subject',
	});
	await pending;
	expect(kernel.getSnapshot().explicitChoice?.categories.marketing?.value).toBe(
		true
	);
	expect(kernel.getSnapshot().subject?.subjectId).toBe(
		'canonical-devtools-subject'
	);
	expect(tools.getState().draft).toEqual({
		marketing: false,
		measurement: false,
	});
});
