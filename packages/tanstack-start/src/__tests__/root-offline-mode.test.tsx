/**
 * ConsentRoot runs the mode the state carries.
 *
 * `offline()` from the server function resolves the recommended rules in the
 * browser, with no backend. That the offline code stays out of the root's
 * first-load JavaScript is checked on the built package in
 * `client-chunks.test.ts`.
 */
import { offline } from '@c15t/core/modes';
import { useActiveUI, useModel } from '@c15t/react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { ConsentRoot } from '../root';

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
	test('offline() in the state resolves the recommended rules locally', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		try {
			const { getByTestId } = await render(
				<ConsentRoot
					persistence={false}
					state={{ initialOverrides: { country: 'DE' }, mode: offline() }}
				>
					<PolicyStatus />
				</ConsentRoot>
			);

			await expect
				.element(getByTestId('policy'))
				.toHaveTextContent('opt-in/banner');
			expect(fetchSpy).not.toHaveBeenCalled();
		} finally {
			fetchSpy.mockRestore();
		}
	});

	test('a state without a backend URL fails loudly instead of guessing', async () => {
		const error = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined);
		try {
			await expect(
				render(
					<ConsentRoot
						persistence={false}
						state={{}}
					>
						<PolicyStatus />
					</ConsentRoot>
				)
			).rejects.toThrow('manifest() needs a backend URL');
		} finally {
			error.mockRestore();
		}
	});
});
