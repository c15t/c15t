import { expect, onTestFinished, test } from 'vitest';

import { createVueConsentKernelContext } from '../runtime/kernel';
import { saveIABChoice } from '../runtime/utils/save-iab-choice';

const createContext = () => {
	const context = createVueConsentKernelContext({ config: {} });
	onTestFinished(() => context.dispose());
	return context;
};

test('a superseded IAB save does not reopen the surface a newer save closed', async () => {
	const { kernel } = createContext();
	kernel.set.activeUI('banner');
	const first = Promise.withResolvers<undefined>();
	const firstSave = saveIABChoice(kernel, () => first.promise);
	expect(kernel.getSnapshot().activeUI).toBe('none');

	// The visitor reopens the banner and saves again before the first
	// choice is encoded.
	kernel.set.activeUI('banner');
	const second = Promise.withResolvers<undefined>();
	const secondSave = saveIABChoice(kernel, () => second.promise);

	// The newer save invalidates the first, which records nothing.
	first.resolve(undefined);
	await firstSave;
	expect(kernel.getSnapshot().activeUI).toBe('none');

	// The newer save still gets the surface back if it records nothing.
	second.resolve(undefined);
	await secondSave;
	expect(kernel.getSnapshot().activeUI).toBe('banner');
});

test('explicit navigation supersedes a pending IAB save', async () => {
	const { activeUI, kernel } = createContext();
	kernel.set.activeUI('dialog');
	const pending = Promise.withResolvers<undefined>();
	const save = saveIABChoice(kernel, () => pending.promise);

	activeUI.value = 'manager';
	activeUI.value = null;
	pending.reject(new Error('offline'));
	await expect(save).rejects.toThrow('offline');
	expect(kernel.getSnapshot().activeUI).toBe('none');
});
