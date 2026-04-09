import * as Accordion from '@radix-ui/react-accordion';
import * as Dialog from '@radix-ui/react-dialog';
import { Slot } from '@radix-ui/react-slot';
import * as Switch from '@radix-ui/react-switch';
import { createElement } from 'react';

export function Baseline() {
	return (
		<div>
			<Slot>
				<button type="button">Button</button>
			</Slot>
			<Switch.Root aria-label="Analytics">
				<span>
					<Switch.Thumb />
				</span>
			</Switch.Root>
			<Accordion.Root type="single" collapsible>
				<Accordion.Item value="one">
					<Accordion.Trigger>Accordion</Accordion.Trigger>
					<Accordion.Content>Content</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>
			<Dialog.Root open>
				<Dialog.Portal>
					<Dialog.Overlay />
					<Dialog.Content>
						<Dialog.Title>Dialog</Dialog.Title>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	);
}

export default createElement(Baseline);
