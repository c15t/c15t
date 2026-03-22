import { buttonVariants, switchVariants } from '@c15t/framework-solid';
import type { Meta, StoryObj } from 'storybook-solidjs-vite';

function Demo() {
	const switchClasses = switchVariants();

	return (
		<div style={{ display: 'grid', gap: '1rem', 'min-width': '20rem' }}>
			<button class={buttonVariants({ variant: 'primary' }).root()}>
				Button
			</button>
			<button
				aria-checked="false"
				class={switchClasses.root()}
				role="switch"
				type="button"
			>
				<span class={switchClasses.track()}>
					<span class={switchClasses.thumb()} />
				</span>
			</button>
			<details open>
				<summary>Accordion</summary>
				<div>Content</div>
			</details>
			<dialog open>
				<h2>Privacy settings</h2>
				<p>Solid workbench scaffold for primitives.</p>
			</dialog>
		</div>
	);
}

const meta = {
	component: Demo,
	title: 'Primitives/Overview',
} satisfies Meta<typeof Demo>;

export default meta;

export const Overview: StoryObj<typeof meta> = {};
