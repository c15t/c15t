/** @vitest-environment jsdom */
import { expect, test } from 'vitest';

import {
	matchedResolution,
	optInRule,
} from '../../__tests__/fixtures/kernel-fixtures';
import { createConsentKernel } from '../../kernel';
import { createIframeBlocker } from '../iframe-blocker';
import { createNetworkBlocker } from '../network-blocker';
import { createScriptLoader } from '../script-loader';

const createKernel = () =>
	createConsentKernel({
		initialPolicyResolution: matchedResolution(
			optInRule({ categories: ['necessary'], scopeMode: 'permissive' })
		),
	});

test('scripts discover compound conditions and newly registered categories require a choice', async () => {
	const kernel = createKernel();
	const loader = createScriptLoader({
		kernel,
		scripts: [
			{
				callbackOnly: true,
				category: {
					and: ['necessary', { or: ['measurement', { not: 'marketing' }] }],
				},
				id: 'analytics',
			},
		],
	});
	try {
		expect(kernel.getSnapshot().evaluationPolicy.choiceScope).toEqual([
			'marketing',
			'measurement',
		]);
		await kernel.commands.save('all');
		expect(kernel.getSnapshot().promptRequirement.kind).toBe('none');
		const choice = kernel.getSnapshot().explicitChoice;
		kernel.set.consentCategories(['necessary']);
		expect(kernel.getSnapshot().evaluationPolicy.choiceScope).toEqual([
			'marketing',
			'measurement',
		]);
		loader.updateScripts([
			{ callbackOnly: true, category: 'functionality', id: 'widget' },
		]);
		expect(kernel.getSnapshot().evaluationPolicy.choiceScope).toEqual([
			'functionality',
			'marketing',
			'measurement',
		]);
		expect(kernel.getSnapshot().promptRequirement.kind).toBe('choice');
		expect(kernel.getSnapshot().explicitChoice).toEqual(choice);
		expect(kernel.getSnapshot().effectivePermissions.functionality).toBe(false);
	} finally {
		loader.dispose();
		kernel.dispose();
	}
});

test('iframe discovery includes initial, inserted, and recategorized frames', async () => {
	const kernel = createKernel();
	const frame = document.createElement('iframe');
	frame.dataset.category = 'measurement';
	document.body.append(frame);
	const blocker = createIframeBlocker({ kernel });
	const unrelated = document.createElement('div');
	document.body.append(unrelated);
	const inserted = document.createElement('iframe');
	try {
		expect(kernel.getSnapshot().evaluationPolicy.choiceScope).toEqual([
			'measurement',
		]);
		unrelated.dataset.category = 'functionality';
		await Promise.resolve();
		expect(kernel.getSnapshot().evaluationPolicy.choiceScope).toEqual([
			'measurement',
		]);
		await kernel.commands.save('all');
		inserted.dataset.category = 'marketing';
		document.body.append(inserted);
		await Promise.resolve();
		expect(kernel.getSnapshot().evaluationPolicy.choiceScope).toEqual([
			'marketing',
			'measurement',
		]);
		expect(kernel.getSnapshot().promptRequirement.kind).toBe('choice');
		inserted.dataset.category = 'experience';
		await Promise.resolve();
		expect(kernel.getSnapshot().evaluationPolicy.choiceScope).toEqual([
			'experience',
			'marketing',
			'measurement',
		]);
	} finally {
		blocker.dispose();
		kernel.dispose();
		frame.remove();
		unrelated.remove();
		inserted.remove();
	}
});

test('network discovery merges with configured categories without expanding a strict backend scope', () => {
	const kernel = createConsentKernel({
		consentCategories: ['necessary', 'measurement'],
		initialPolicyResolution: matchedResolution(
			optInRule({
				categories: ['marketing', 'measurement'],
				scopeMode: 'strict',
			})
		),
	});
	const blocker = createNetworkBlocker({
		kernel,
		rules: [{ category: 'marketing', domain: 'example.com' }],
	});
	try {
		expect(kernel.getSnapshot().evaluationPolicy.choiceScope).toEqual([
			'marketing',
			'measurement',
		]);
		blocker.updateRules([{ category: 'experience', domain: 'example.com' }]);
		expect(kernel.getSnapshot().evaluationPolicy.choiceScope).toEqual([
			'marketing',
			'measurement',
		]);
		expect(kernel.getSnapshot().effectivePermissions.experience).toBe(false);
	} finally {
		blocker.dispose();
		kernel.dispose();
	}
});
