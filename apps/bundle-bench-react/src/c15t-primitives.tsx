import * as Accordion from '@c15t/react/primitives/accordion';
import * as Button from '@c15t/react/primitives/button';
import * as Dialog from '@c15t/react/primitives/dialog';
import * as Switch from '@c15t/react/primitives/switch';
import { createElement } from 'react';

export function PrimitiveBench() {
	return (
		<div>
			<Button.Root>Button</Button.Root>
			<Switch.Root aria-label="Analytics" />
			<Accordion.Root type="single" collapsible>
				<Accordion.Item value="one">
					<Accordion.Trigger>Accordion</Accordion.Trigger>
					<Accordion.Content>Content</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>
			<Dialog.Root open>
				<Dialog.Portal>
					<Dialog.Content>
						<Dialog.Title>Dialog</Dialog.Title>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	);
}

export default createElement(PrimitiveBench);
