'use client';

import { ConsentRoot, offline } from 'c15t/next';
import type { ConsentPresentation } from 'c15t/next';
import type { ReactNode } from 'react';

import { scripts, vendors } from '@/lib/scripts';

import { ConsentDialog } from './consent-dialog';

// Offline mode keeps the policy in this bundle and choices in the browser,
// so the demo runs without an account. In production, point it at your
// backend instead:
// const mode = hosted({ url: 'https://your-project.inth.app' });
const mode = offline();

// A wall blocks the page until the visitor answers. c15t reports it as
// `banner.blocking`, and refuses it for a notice, which must never block.
const presentation: ConsentPresentation = { prompt: { variant: 'wall' } };

/**
 * The c15t runtime with Northwind's own consent UI. No stock banner, dialog
 * or c15t stylesheet: `ConsentDialog` renders everything from the headless
 * hooks.
 */
export const Consent = ({ children }: { children: ReactNode }) => (
	<ConsentRoot
		state={{}}
		scripts={scripts}
		vendors={vendors}
		options={{ mode, presentation }}
	>
		{children}
		<ConsentDialog />
	</ConsentRoot>
);
