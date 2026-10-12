import {
	ConsentBanner,
	ConsentDialog,
	ConsentProvider,
	offline,
} from 'c15t/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './app.css';

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

// #region docs:slot
const options = {
	components: {
		banner: {
			root: { className: '!p-[7px] dark:!p-[11px]' },
		},
	},
	mode,
	// Tailwind 3 builds c15t's stylesheet from app.css.
	styles: false,
};
// #endregion docs:slot

const root = document.querySelector('#root');
if (!root) {
	throw new Error('Missing #root');
}

createRoot(root).render(
	<StrictMode>
		<ConsentProvider options={{ ...options, persistence: false }}>
			<p
				className="bg-emerald-600 text-white"
				data-testid="tailwind-probe"
			>
				Tailwind utilities are active on this page.
			</p>
			<ConsentBanner />
			<ConsentDialog />
		</ConsentProvider>
	</StrictMode>
);
