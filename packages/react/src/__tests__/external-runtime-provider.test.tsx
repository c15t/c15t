import { createConsentRuntime } from '@c15t/core/runtime';
import type { ConsentRuntime } from '@c15t/core/runtime';
import { useContext } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { KernelContext } from '../context';
import { ConsentProvider, offline } from '../index';
import { policyFixture } from './policy-fixture';

const createRuntime = function createRuntime(): ConsentRuntime {
	return createConsentRuntime({
		mode: offline(),
		pkg: '@c15t/react-external-test',
		prefetch: policyFixture({ measurement: false }),
	});
};

const KernelProbe = ({ onKernel }: { onKernel: (value: unknown) => void }) => {
	onKernel(useContext(KernelContext));
	return null;
};

describe('ConsentProvider with an external runtime', () => {
	test('renders the runtime it was handed instead of building one', async () => {
		const runtime = createRuntime();
		const seen = vi.fn();

		await render(
			<ConsentProvider runtime={runtime}>
				<KernelProbe onKernel={seen} />
			</ConsentProvider>
		);

		expect(seen).toHaveBeenCalledWith(runtime.kernel);
	});

	test('does not dispose a runtime it does not own', async () => {
		const runtime = createRuntime();
		const dispose = vi.spyOn(runtime.kernel, 'dispose');

		const { unmount } = await render(
			<ConsentProvider runtime={runtime}>
				<div data-testid="child">borrowed</div>
			</ConsentProvider>
		);
		unmount();

		expect(dispose).not.toHaveBeenCalled();
		// Still usable afterwards, which a disposed kernel would not be.
		expect(runtime.kernel.getSnapshot()).toBeTruthy();
	});

	test('leaves init and every side-effecting module to the owner', async () => {
		const runtime = createRuntime();
		expect(runtime.kernel.getSnapshot().policyPending).toBe(false);
		expect(runtime.kernel.getSnapshot().effectivePermissions.measurement).toBe(
			false
		);
		const init = vi.spyOn(runtime.kernel.commands, 'init');
		localStorage.setItem('analytics:visitor', 'owner');

		await render(
			<ConsentProvider
				runtime={runtime}
				options={{
					clearOnRevocation: {
						measurement: { localStorage: ['analytics:visitor'] },
					},
				}}
			>
				<div data-testid="child">borrowed</div>
			</ConsentProvider>
		);

		// Cleanup follows the script loader's dynamic import. Wait for that
		// entire chain so an accidental mount has time to delete the target.
		await vi.dynamicImportSettled();

		expect(init).not.toHaveBeenCalled();
		expect(localStorage.getItem('analytics:visitor')).toBe('owner');
		localStorage.removeItem('analytics:visitor');
		expect(
			(window as Window & { c15t?: { pkg: string } }).c15t
		).toBeUndefined();
	});

	test('still owns the kernel when no runtime is passed', async () => {
		const seen = vi.fn();
		const { unmount } = await render(
			<ConsentProvider options={{ mode: offline() }}>
				<KernelProbe onKernel={seen} />
			</ConsentProvider>
		);
		const kernel = seen.mock.calls[0]?.[0] as { dispose: () => void };
		const dispose = vi.spyOn(kernel, 'dispose');
		unmount();
		await vi.waitFor(() => expect(dispose).toHaveBeenCalled());
	});
});
