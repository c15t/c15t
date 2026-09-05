import { createConsentKernel } from '@c15t/core';

import { bench, runMicroBenchmarkSuite } from './wrapper';

bench('createConsentKernel', () => {
	createConsentKernel();
});

bench('kernel.getSnapshot()', () => {
	const kernel = createConsentKernel();
	kernel.getSnapshot();
	kernel.dispose();
});

bench('kernel.subscribe()', () => {
	const kernel = createConsentKernel();
	const unsubscribe = kernel.subscribe(() => undefined);
	unsubscribe();
	kernel.dispose();
});

bench('kernel.commands.save("all")', async () => {
	const kernel = createConsentKernel();
	await kernel.commands.save('all');
	kernel.dispose();
});

bench('kernel.commands.save("none")', async () => {
	const kernel = createConsentKernel({
		initialDraft: { marketing: true, measurement: true },
	});
	await kernel.commands.save('none');
	kernel.dispose();
});

bench('kernel.commands.save(custom)', async () => {
	const kernel = createConsentKernel();
	await kernel.commands.save({ marketing: true, measurement: true });
	kernel.dispose();
});

bench('kernel.set.draft()', () => {
	const kernel = createConsentKernel();
	kernel.set.draft({ marketing: true });
	kernel.dispose();
});

bench('kernel.set.activeUI()', () => {
	const kernel = createConsentKernel();
	kernel.set.activeUI('dialog');
	kernel.set.activeUI('none');
	kernel.dispose();
});

await runMicroBenchmarkSuite('store');
