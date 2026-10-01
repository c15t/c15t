'use client';

import { ConsentBanner, ConsentDialog, ConsentRoot, offline } from 'c15t/next';
import type { ReactNode } from 'react';

const mode = offline({
	policyRules: [
		{
			id: 'tailwind-matrix',
			match: { isDefault: true },
			model: 'opt-in',
			prompt: 'choice',
		},
	],
});

export const Consent = ({ children }: { children: ReactNode }) => (
	<ConsentRoot
		persistence={false}
		state={{}}
		// #region docs:slot
		options={{
			components: {
				banner: {
					root: { className: 'p-[7px] dark:p-[11px]' },
				},
			},
			mode,
		}}
		// #endregion docs:slot
	>
		{children}
		<ConsentBanner />
		<ConsentDialog />
	</ConsentRoot>
);
