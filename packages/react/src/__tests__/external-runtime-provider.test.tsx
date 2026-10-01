import { createConsentRuntime } from '@c15t/core/runtime';
import type { ConsentRuntime } from '@c15t/core/runtime';
import type { ComponentProps } from 'react';
import { useContext } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { KernelContext } from '../context';
import { ConsentProvider, offline, useConsent } from '../index';
import { policyFixture } from './policy-fixture';

const createRuntime = function createRuntime(
	callbacks?: Parameters<typeof createConsentRuntime>[0]['callbacks']
): ConsentRuntime {
	return createConsentRuntime({
		callbacks,
		consentCategories: [
			'functionality',
			'experience',
			'measurement',
			'marketing',
		],
		mode: offline(),
		pkg: '@c15t/react-external-test',
		prefetch: policyFixture({ measurement: false }),
	});
};

const KernelProbe = ({ onKernel }: { onKernel: (value: unknown) => void }) => {
	onKernel(useContext(KernelContext));
	return null;
};

const MeasurementProbe = () => (
	<output data-testid="measurement">{String(useConsent('measurement'))}</output>
);

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

	test('follows a replacement runtime and releases the previous kernel', async () => {
		const first = createRuntime();
		const second = createRuntime();
		const seen = vi.fn();
		const firstListeners = new Set<() => void>();
		const { subscribe } = first.kernel;
		vi.spyOn(first.kernel, 'subscribe').mockImplementation((listener) => {
			firstListeners.add(listener as () => void);
			const unsubscribe = subscribe(listener);
			return () => {
				firstListeners.delete(listener as () => void);
				unsubscribe();
			};
		});
		const tree = (runtime: ConsentRuntime) => (
			<ConsentProvider runtime={runtime}>
				<KernelProbe onKernel={seen} />
				<MeasurementProbe />
			</ConsentProvider>
		);

		const screen = await render(tree(first));
		await expect
			.element(screen.getByTestId('measurement'))
			.toHaveTextContent('false');
		expect(firstListeners.size).toBeGreaterThan(0);

		await screen.rerender(tree(second));
		expect(seen).toHaveBeenLastCalledWith(second.kernel);
		expect(firstListeners.size).toBe(0);

		await first.kernel.commands.save('all');
		await expect
			.element(screen.getByTestId('measurement'))
			.toHaveTextContent('false');
		await second.kernel.commands.save('all');
		await expect
			.element(screen.getByTestId('measurement'))
			.toHaveTextContent('true');
		expect(first.kernel.getSnapshot().effectivePermissions.measurement).toBe(
			true
		);
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

	test('warns that provider callbacks do not attach to a borrowed runtime', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const runtime = createRuntime();
		const onChoiceRecorded = vi.fn();

		await render(
			<ConsentProvider
				runtime={runtime}
				options={
					{ callbacks: { onChoiceRecorded } } as unknown as NonNullable<
						ComponentProps<typeof ConsentProvider>['options']
					>
				}
			>
				<div data-testid="child">borrowed</div>
			</ConsentProvider>
		);

		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('createConsentRuntime({ callbacks })')
		);
		await runtime.kernel.commands.save('all');
		await new Promise((resolve) => {
			setTimeout(resolve, 20);
		});
		expect(onChoiceRecorded).not.toHaveBeenCalled();
		warn.mockRestore();
	});

	test("runs the runtime owner's callbacks once", async () => {
		const warn = vi.spyOn(console, 'warn');
		const onChoiceRecorded = vi.fn();
		const runtime = createRuntime({ onChoiceRecorded });

		await render(
			<ConsentProvider runtime={runtime}>
				<div data-testid="child">borrowed</div>
			</ConsentProvider>
		);
		await runtime.kernel.commands.save('all');

		await vi.waitFor(() => expect(onChoiceRecorded).toHaveBeenCalled());
		await new Promise((resolve) => {
			setTimeout(resolve, 20);
		});
		expect(onChoiceRecorded).toHaveBeenCalledTimes(1);
		expect(warn).not.toHaveBeenCalledWith(
			expect.stringContaining('createConsentRuntime({ callbacks })')
		);
		warn.mockRestore();
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
