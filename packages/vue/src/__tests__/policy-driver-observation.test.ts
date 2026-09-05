import { expect, test } from 'vitest';

import { createPolicySession } from './policy-driver';

test.each(['display', 'visibility', 'opacity', 'hidden'] as const)(
	'policy observations detect %s hiding on an ancestor',
	async (attribute) => {
		const session = await createPolicySession({
			clock: { now: () => 1_800_000_000_000 },
			gpc: false,
			policy: {
				choice: { fingerprint: 'choice-observation', maxAgeMs: 86_400_000 },
				gpcDenyCategories: [],
				legacyMaterialFingerprint: 'legacy-observation',
				model: 'opt-in',
				notice: { fingerprint: 'notice-observation', maxAgeMs: 86_400_000 },
				prompt: 'choice',
				rights: ['preferences'],
				scope: ['marketing'],
				scopeMode: 'strict',
			},
			probeGates: false,
			storage: {},
		});
		let ancestor: HTMLElement | undefined;
		try {
			await session.execute({ kind: 'hydrate' });
			expect((await session.observe()).dom.firstLayer).toBe('choice');
			const root = document.querySelector(
				'[data-testid="consent-banner-root"]'
			);
			if (!root) {
				throw new Error('Missing mounted banner');
			}
			ancestor = document.createElement('div');
			root.parentNode?.insertBefore(ancestor, root);
			ancestor.append(root);
			if (attribute === 'hidden') {
				ancestor.hidden = true;
			} else if (attribute === 'opacity') {
				ancestor.style.opacity = '0';
			} else if (attribute === 'visibility') {
				ancestor.style.visibility = 'hidden';
			} else {
				ancestor.style.display = 'none';
			}
			const hidden = await session.observe();
			expect(hidden.snapshot.promptRequirement.kind).toBe('choice');
			expect(hidden.dom.firstLayer).toBe('hidden');
			expect(hidden.dom.actions.every((action) => !action.visible)).toBe(true);
		} finally {
			if (ancestor) {
				while (ancestor.firstChild) {
					ancestor.parentNode?.insertBefore(ancestor.firstChild, ancestor);
				}
				ancestor.remove();
			}
			await session.dispose();
		}
	}
);
