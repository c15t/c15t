import { createElement } from 'react';

import {
	ConsentBanner,
	ConsentDialog,
	ConsentProvider,
	offline,
} from '../../../packages/react/src/index';
import { benchmarkConsentOptions } from './fixtures';

export const CurrentConsentSurfaces = () => (
	<ConsentProvider
		options={{
			...benchmarkConsentOptions,
			mode: offline({
				policyRules: [
					{
						id: 'bench-opt-in',
						match: { fallback: true, isDefault: true },
						model: 'opt-in',
						prompt: 'choice',
					},
				],
			}),
		}}
	>
		<ConsentBanner />
		<ConsentDialog />
	</ConsentProvider>
);

export default createElement(CurrentConsentSurfaces);
