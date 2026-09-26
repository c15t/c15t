/**
 * ConsentRoot loads offline mode on demand.
 *
 * `offline()` carries the recommended policy-rule pack. A root with a
 * backend URL never runs it, so the module must not load with the root;
 * a root without one must still resolve those rules.
 *
 * The tests share one module registry and run in order: the first checks
 * that nothing loaded, the second that offline init loads it.
 */
import { useActiveUI, useModel } from '@c15t/react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentRoot } from '../root';
import { policyFixture } from './policy-fixture';

const offlineModule = vi.hoisted(() => ({ loads: 0 }));

// oxlint-disable-next-line anti-slop/no-module-mocking -- The property under test is whether ConsentRoot evaluates this module at all. The factory only counts loads and returns the real module.
vi.mock('../offline-mode', async (importOriginal) => {
	offlineModule.loads += 1;
	return await importOriginal();
});

const PolicyStatus = () => {
	const model = useModel();
	const activeUI = useActiveUI();
	return (
		<div data-testid="policy">
			{model ?? 'pending'}/{activeUI}
		</div>
	);
};

describe('ConsentRoot offline mode', () => {
	test('a root with a backend URL does not load offline mode', async () => {
		const { getByTestId } = await render(
			<ConsentRoot
				backendURL="/api/c15t"
				persistence={false}
				state={policyFixture()}
			>
				<PolicyStatus />
			</ConsentRoot>
		);

		await expect
			.element(getByTestId('policy'))
			.toHaveTextContent('opt-in/banner');
		expect(offlineModule.loads).toBe(0);
	});

	test('a root without a backend resolves the recommended rules', async () => {
		const { getByTestId } = await render(
			<ConsentRoot
				persistence={false}
				state={{ initialOverrides: { country: 'DE' } }}
			>
				<PolicyStatus />
			</ConsentRoot>
		);

		await expect
			.element(getByTestId('policy'))
			.toHaveTextContent('opt-in/banner');
		expect(offlineModule.loads).toBe(1);
	});
});
