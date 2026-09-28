import type * as Core from '@c15t/core';
import type { ConsentKernel, RevocationReloadOptions } from '@c15t/core';
import { useContext, useEffect } from 'react';
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { KernelContext } from '../context';
import { custom } from '../index';
import { ConsentProvider } from '../provider';
import { policyFixture } from './policy-fixture';

const reload = vi.hoisted(() => vi.fn());
// oxlint-disable-next-line anti-slop/no-module-mocking -- `window.location.reload` cannot be replaced in a real browser, and reloading restarts the test iframe. The factory returns the real module and records the reload instead.
vi.mock('@c15t/core', async (importOriginal) => {
	const actual = await importOriginal<typeof Core>();
	return {
		...actual,
		watchRevocationReload: (options: RevocationReloadOptions) =>
			actual.watchRevocationReload({ ...options, reload }),
	};
});

let kernel: ConsentKernel;
const Capture = () => {
	const value = useContext(KernelContext);
	useEffect(() => {
		if (value) {
			kernel = value;
		}
	}, [value]);
	return null;
};

const grantThenRevoke = async (reloadOnConsentRevoked?: boolean) => {
	reload.mockClear();
	const onBeforeConsentRevocationReload = vi.fn();
	await render(
		<ConsentProvider
			options={{
				callbacks: { onBeforeConsentRevocationReload },
				mode: custom({ save: () => Promise.resolve({ ok: true }) }),
				persistence: false,
				prefetch: policyFixture(),
				reloadOnConsentRevoked,
			}}
		>
			<Capture />
		</ConsentProvider>
	);
	await kernel.commands.save({ marketing: true });
	await kernel.commands.save({ marketing: false });
	return onBeforeConsentRevocationReload;
};

test('reloads after an explicit revocation by default', async () => {
	const onBeforeConsentRevocationReload = await grantThenRevoke();
	await vi.waitFor(() => expect(reload).toHaveBeenCalledOnce());
	expect(onBeforeConsentRevocationReload).toHaveBeenCalledOnce();
});

test('honours `reloadOnConsentRevoked: false`', async () => {
	const onBeforeConsentRevocationReload = await grantThenRevoke(false);
	await new Promise((resolve) => {
		setTimeout(resolve, 20);
	});
	expect(onBeforeConsentRevocationReload).not.toHaveBeenCalled();
	expect(reload).not.toHaveBeenCalled();
});
