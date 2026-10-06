import { saveIABConsentSurface } from '@c15t/core/surface-actions';
import { expect, onTestFinished, test } from 'vitest';

import { createVueConsentKernelContext } from '../runtime/kernel';

const createContext = () => {
	const context = createVueConsentKernelContext({ config: {} });
	onTestFinished(() => context.dispose());
	return context;
};

test('the Vue activeUI setter is explicit navigation: it supersedes a pending IAB save', async () => {
	const { activeUI, kernel } = createContext();
	kernel.set.activeUI('dialog');
	const pending = Promise.withResolvers<undefined>();
	const save = saveIABConsentSurface(kernel, () => pending.promise);

	activeUI.value = 'manager';
	activeUI.value = null;
	pending.reject(new Error('offline'));
	await expect(save).rejects.toThrow('offline');
	expect(kernel.getSnapshot().activeUI).toBe('none');
});
