import type { Meta, StoryObj } from '@storybook/svelte-vite';
import PrimitivesDemo from './PrimitivesDemo.svelte';

const meta = {
	component: PrimitivesDemo,
	title: 'Primitives/Overview',
} satisfies Meta<PrimitivesDemo>;

export default meta;

export const Overview: StoryObj<typeof meta> = {};
