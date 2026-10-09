import {
	devToolsPrefetch,
	devToolsPresentation,
	devToolsScripts,
	getDevToolsCategories,
} from '@c15t/conformance/fixtures/devtools';
import { devToolsFlow, devToolsReady } from '@c15t/conformance/play/devtools';
import type { HydrationRecords, HydrationResult } from '@c15t/core';
import { createScriptLoader } from '@c15t/core/modules/script-loader';
import { writePolicyResolutionWire } from '@c15t/schema/types';
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { onUnmounted } from 'vue';

import { DevTools } from '../../../packages/vue/src/devtools';
import { createVueConsentKernelContext } from '../../../packages/vue/src/runtime/kernel';
import {
	provideStorybookConsentContext,
	storybookConsentConfig,
	storybookInit,
	storybookMode,
} from './storybook-consent-fixtures';

/**
 * `hydrate` applies stored records the way persistence does. It is a verb
 * only core's own modules call, so it is not on `ConsentKernel`.
 */
const hydrateRecords = <KernelType extends object>(
	kernel: KernelType,
	records: HydrationRecords
): HydrationResult =>
	(
		kernel as KernelType & {
			hydrate: (input: HydrationRecords) => HydrationResult;
		}
	).hydrate(records);

const meta = {
	component: DevTools,
	parameters: { layout: 'fullscreen' },
	tags: ['devtools'],
	title: 'COMPONENTS - VUE/Core/DevTools',
} satisfies Meta<typeof DevTools>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: devToolsReady,
	render: () => ({
		components: { DevTools },
		setup() {
			const init = {
				branding: storybookInit.branding,
				location: devToolsPrefetch.initialLocation,
				policyResolution: writePolicyResolutionWire(
					devToolsPrefetch.initialPolicyResolution
				),
				translations: storybookInit.translations,
			};
			const config = {
				...storybookConsentConfig,
				consentCategories: [...getDevToolsCategories()],
				presentation: devToolsPresentation,
				// The shared play verifies script cleanup after rejecting consent.
				reloadOnConsentRevoked: false,
			};
			const context = createVueConsentKernelContext({
				config,
				mode: storybookMode(((input: RequestInfo | URL) =>
					Promise.resolve(
						new Response(
							JSON.stringify(
								String(input).endsWith('/subjects') ? { ok: true } : init
							),
							{
								headers: {
									'content-type': 'application/json',
									'x-c15t-policy-contract': '1',
								},
							}
						)
					)) as typeof fetch),
				prefetch: init,
				producerContract: 1,
			});
			hydrateRecords(context.kernel, { now: devToolsPrefetch.now });
			provideStorybookConsentContext(null, context, config);
			const loader = createScriptLoader({
				kernel: context.kernel,
				scripts: devToolsScripts,
			});
			void context.kernel.commands.init();
			onUnmounted(() => {
				loader.dispose();
				context.dispose();
			});
			return { getDevToolsCategories };
		},
		template:
			'<DevTools default-open :get-consent-categories="getDevToolsCategories" />',
	}),
};
export const ConsentAndScriptsFlow: Story = { ...Default, play: devToolsFlow };
