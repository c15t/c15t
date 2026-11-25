/**
 * Without a CMP handle there is nothing to encode a TC string, so an IAB
 * save records nothing instead of writing the kernel and saving a choice
 * no TC string backs.
 *
 * @vitest-environment jsdom
 */
import { mount } from '@vue/test-utils';
import { expect, onTestFinished, test, vi } from 'vitest';
import { defineComponent, ref } from 'vue';

import { minimalGVL } from '../../../iab/src/__tests__/fixtures/gvl-sample';
import {
	createDefaultIabSelection,
	useConsentIabSave,
} from '../runtime/composables/iabSelection';
import {
	symbolInit,
	symbolKernel,
	symbolKernelContext,
} from '../runtime/utils/symbols';
import { createVueConsentKernelContext } from './test-kernel';

test('a selection saved with no CMP handle records nothing', async () => {
	const context = createVueConsentKernelContext({ config: {} });
	onTestFinished(() => context.dispose());
	const commandSave = vi.spyOn(context.kernel.commands, 'save');
	let save: ReturnType<typeof useConsentIabSave> | undefined;
	mount(
		defineComponent({
			render: () => null,
			setup() {
				save = useConsentIabSave();
			},
		}),
		{
			global: {
				provide: {
					[symbolInit as symbol]: ref({ gvl: minimalGVL }),
					[symbolKernel as symbol]: context.kernel,
					[symbolKernelContext as symbol]: context,
				},
			},
		}
	);

	await save?.({
		...createDefaultIabSelection(),
		purposeConsents: { 1: true },
	});

	expect(commandSave).not.toHaveBeenCalled();
	expect(context.kernel.getSnapshot().iab?.purposeConsents[1]).toBeUndefined();
});
