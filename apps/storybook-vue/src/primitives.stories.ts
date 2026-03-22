import { buttonVariants, switchVariants } from '@c15t/framework-vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
	title: 'Primitives/Overview',
} satisfies Meta;

export default meta;

export const Overview: StoryObj = {
	render: () => ({
		setup() {
			return {
				buttonClass: buttonVariants({ variant: 'primary' }).root(),
				switchRoot: switchVariants().root(),
				switchTrack: switchVariants().track(),
				switchThumb: switchVariants().thumb(),
			};
		},
		template: `
			<div style="display:grid;gap:1rem;min-width:20rem;">
				<button :class="buttonClass">Button</button>
				<button :class="switchRoot" role="switch" aria-checked="false" type="button">
					<span :class="switchTrack"><span :class="switchThumb" /></span>
				</button>
				<details open>
					<summary>Accordion</summary>
					<div>Content</div>
				</details>
				<dialog open>
					<h2>Privacy settings</h2>
					<p>Vue workbench scaffold for primitives.</p>
				</dialog>
			</div>
		`,
	}),
};
