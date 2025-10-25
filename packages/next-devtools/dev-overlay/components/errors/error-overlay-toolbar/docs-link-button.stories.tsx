import type { Meta, StoryObj } from '@storybook/react';
import { withShadowPortal } from '../../../storybook/with-shadow-portal';
import { DocsLinkButton } from './docs-link-button';

const meta: Meta<typeof DocsLinkButton> = {
	component: DocsLinkButton,
	parameters: {
		layout: 'centered',
	},
	decorators: [withShadowPortal],
};

export default meta;
type Story = StoryObj<typeof DocsLinkButton>;

export const WithDocsUrl: Story = {
	args: {
		errorMessage: 'Learn more at https://nextjs.org/docs',
	},
};

export const WithoutDocsUrl: Story = {
	args: {
		errorMessage: 'An error occurred without any documentation link',
	},
};
