import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { brandTheme } from '../../../docs/examples/brand-theme';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentProvider,
	offline,
} from '../../../packages/react/src/index';
import { storybookPolicy } from '../../storybook-consent-policy';

const demoMode = offline({ policyRules: [storybookPolicy] });

const Recipe = ({
	variant = 'floating',
}: {
	variant?: 'floating' | 'bar' | 'wall';
}) => {
	const [revision, setRevision] = useState(0);
	return (
		<ConsentProvider
			key={revision}
			options={{ mode: demoMode, persistence: false, theme: brandTheme }}
		>
			<main style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
				<h1 style={{ fontSize: 20 }}>A banner that fits your site</h1>
				<p>Try a choice, reopen preferences, or reset the example.</p>
				<button
					type="button"
					onClick={() => setRevision((value) => value + 1)}
				>
					Reset example
				</button>{' '}
				<ConsentDialogLink>Privacy settings</ConsentDialogLink>
			</main>
			<ConsentBanner variant={variant} />
			<ConsentDialog />
		</ConsentProvider>
	);
};

const meta = {
	component: Recipe,
	parameters: { layout: 'fullscreen' },
	title: 'Docs/Customization',
} satisfies Meta<typeof Recipe>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BrandCard: Story = { args: { variant: 'floating' } };
export const BrandBar: Story = { args: { variant: 'bar' } };
export const ChoiceWall: Story = { args: { variant: 'wall' } };
