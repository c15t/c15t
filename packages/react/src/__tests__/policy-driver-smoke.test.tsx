import { POLICY_CHOICE } from '@c15t/conformance/fixtures/policy-scenarios';
import { expect, it } from 'vitest';

import { createPolicySession } from './policy-driver';

it('observes real gate transitions and separate callback records', async () => {
	const clock = Date.now();
	const session = await createPolicySession({
		clock: { now: () => clock },
		gpc: false,
		policy: POLICY_CHOICE,
		probeGates: true,
		storage: {},
	});
	try {
		await session.execute({ kind: 'hydrate' });
		let evidence = await session.observe();
		expect(evidence.gates?.scriptAttached).toBe(false);
		expect(evidence.gates?.networkCompletions).toBe(0);
		expect(evidence.gates?.consentMode.ad_storage).toBe('denied');
		await session.execute({ kind: 'accept' });
		evidence = await session.observe();
		expect(evidence.gates?.scriptAttached).toBe(true);
		expect(evidence.gates?.scriptLoads).toBe(1);
		expect(evidence.gates?.networkCompletions).toBe(1);
		expect(evidence.gates?.iframeSrc).toContain('c15t-policy-probe');
		expect(evidence.gates?.consentMode.ad_storage).toBe('granted');
		expect(
			evidence.logs.callbacks.filter(
				(event) => event.name === 'onChoiceRecorded'
			)
		).toHaveLength(1);
	} finally {
		await session.dispose();
	}
});

it('reports hidden ancestors in actual server and client prompt evidence', async () => {
	const clock = Date.now();
	const session = await createPolicySession({
		clock: { now: () => clock },
		gpc: false,
		policy: POLICY_CHOICE,
		probeGates: false,
		storage: {},
	});
	const { opacity } = document.body.style;
	try {
		document.body.style.opacity = '0';
		await session.execute({ kind: 'ssr-hydrate' });
		const evidence = await session.observe();
		expect(evidence.ssr?.server.prompt.kind).toBe('choice');
		expect(evidence.ssr?.server.now).toBe(clock);
		expect(evidence.ssr?.server.firstLayer).toBe('hidden');
		expect(evidence.ssr?.client.firstLayer).toBe('hidden');
		expect(evidence.dom.actions.every((action) => !action.visible)).toBe(true);
		document.body.style.opacity = opacity;
		expect((await session.observe()).dom.firstLayer).toBe('choice');
		await session.execute({ kind: 'accept' });
		const after = await session.observe();
		expect(after.snapshot.promptRequirement.kind).toBe('none');
		expect(after.ssr?.server.prompt.kind).toBe('choice');
	} finally {
		document.body.style.opacity = opacity;
		await session.dispose();
	}
});
