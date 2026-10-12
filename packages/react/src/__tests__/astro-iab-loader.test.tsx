import { createConsentRuntime } from '@c15t/core/runtime';
import { createIAB } from '@c15t/iab';
import { createRoot } from 'react-dom/client';
import { expect, test, vi } from 'vitest';

import AstroDialog from '../../../astro/src/components/islands/panel-surface';
import { mockGVL } from '../components/iab/__tests__/fixtures/mock-consent-state';
import { offline } from '../transports/offline';
import { policyFixture } from './policy-fixture';

const gate = vi.hoisted(() => {
	let requested!: () => void;
	let release!: () => void;
	const started = new Promise<void>((resolve) => {
		requested = resolve;
	});
	const ready = new Promise<void>((resolve) => {
		release = resolve;
	});
	return { ready, release, requested, started };
});

// Gate only module arrival. Render the actual island and imported component
// to reproduce the browser loading race.
// oxlint-disable-next-line anti-slop/no-module-mocking
vi.mock(
	'../../../astro/src/components/islands/iab-dialog-surface',
	async (importOriginal) => {
		gate.requested();
		await gate.ready;
		return importOriginal();
	}
);

test('reveals the cold Astro IAB island when its module is ready', async () => {
	const runtime = createConsentRuntime({
		createIAB,
		iab: { cmpId: 42, gvl: mockGVL },
		mode: offline(),
		persistence: false,
		prefetch: {
			...policyFixture({}, { model: 'iab' }),
			initialIab: { cmpId: 42, enabled: true, gvl: mockGVL },
		},
	});
	runtime.start();
	runtime.kernel.set.activeUI('dialog');
	const container = document.createElement('div');
	document.body.append(container);
	const root = createRoot(container);
	try {
		root.render(
			<AstroDialog
				runtime={runtime}
				options={{}}
				kind="iab"
			/>
		);
		await gate.started;
		expect(
			document.querySelector('[data-testid="iab-consent-dialog-root"]')
		).toBeNull();
		gate.release();
		await vi.dynamicImportSettled();
		await new Promise(requestAnimationFrame);
		await new Promise(requestAnimationFrame);
		await new Promise(requestAnimationFrame);
		expect(
			document.querySelector('[data-testid="iab-consent-dialog-root"]')
		).not.toBeNull();
	} finally {
		gate.release();
		root.unmount();
		container.remove();
		runtime.dispose();
	}
});
