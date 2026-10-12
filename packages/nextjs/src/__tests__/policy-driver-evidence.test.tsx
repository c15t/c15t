import { POLICY_CHOICE } from '@c15t/conformance/fixtures/policy-scenarios';
import { expect, it } from 'vitest';

import { createPolicySession } from './policy-driver';

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
