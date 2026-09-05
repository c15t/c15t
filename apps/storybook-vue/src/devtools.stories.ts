import {
	devToolsPrefetch,
	devToolsPresentation,
	devToolsScripts,
	getDevToolsCategories,
} from '@c15t/conformance/fixtures/devtools';
import { devToolsFlow, devToolsReady } from '@c15t/conformance/play/devtools';
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
} from './storybook-consent-fixtures';

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
				jurisdiction: storybookInit.jurisdiction,
				location: devToolsPrefetch.initialLocation,
				policyResolution: writePolicyResolutionWire(
					devToolsPrefetch.initialPolicyResolution
				),
				translations: storybookInit.translations,
			};
			const config = {
				...storybookConsentConfig,
				consentCategories: [...getDevToolsCategories()],
				customFetch: (input: RequestInfo | URL) =>
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
					),
				presentation: devToolsPresentation,
			};
			const context = createVueConsentKernelContext({
				config,
				prefetch: init,
				producerContract: 1,
			});
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
