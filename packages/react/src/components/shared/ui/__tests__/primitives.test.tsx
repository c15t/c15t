/**
 * Comprehensive tests for shared UI primitives (Button, Switch, Accordion).
 *
 * @packageDocumentation
 */

import type { ReactNode, RefObject } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';
import { GlobalThemeContext } from '~/context/theme-context';
import {
	Content as AccordionContent,
	Item as AccordionItem,
	Root as AccordionRoot,
	Trigger as AccordionTrigger,
} from '../accordion/accordion';
import { Root as Button, Icon as ButtonIcon } from '../button/button';
import {
	Content as CollapsibleContent,
	Root as CollapsibleRoot,
	Trigger as CollapsibleTrigger,
} from '../collapsible/collapsible';
import {
	Close as DialogClose,
	Content as DialogContent,
	Description as DialogDescription,
	Overlay as DialogOverlay,
	Portal as DialogPortal,
	Root as DialogRoot,
	Title as DialogTitle,
	Trigger as DialogTrigger,
} from '../dialog/dialog';
import { Root as Switch } from '../switch/switch';
import {
	Content as TabsContent,
	List as TabsList,
	Root as TabsRoot,
	Trigger as TabsTrigger,
} from '../tabs/tabs';

// Wrapper to provide theme context for accordion tests
const ThemeWrapper = ({ children }: { children: ReactNode }) => (
	<GlobalThemeContext.Provider value={{ noStyle: false }}>
		{children}
	</GlobalThemeContext.Provider>
);

describe('Button', () => {
	describe('Rendering', () => {
		test('should render a button element', async () => {
			render(<Button>Click me</Button>);

			await vi.waitFor(
				() => {
					const button = document.querySelector('button');
					expect(button).toBeInTheDocument();
					expect(button?.textContent).toBe('Click me');
				},
				{ timeout: 3000 }
			);
		});

		test('should render with children', async () => {
			render(
				<Button>
					<span>Button Text</span>
				</Button>
			);

			await vi.waitFor(
				() => {
					const button = document.querySelector('button');
					expect(button).toBeInTheDocument();
					expect(button?.querySelector('span')?.textContent).toBe(
						'Button Text'
					);
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Props', () => {
		test('should accept variant prop', async () => {
			render(<Button variant="primary">Primary</Button>);

			await vi.waitFor(
				() => {
					const button = document.querySelector('button');
					expect(button).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should accept mode prop', async () => {
			render(<Button mode="filled">Filled</Button>);

			await vi.waitFor(
				() => {
					const button = document.querySelector('button');
					expect(button).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should accept size prop', async () => {
			render(<Button size="large">Large</Button>);

			await vi.waitFor(
				() => {
					const button = document.querySelector('button');
					expect(button).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should accept className prop', async () => {
			render(<Button className="custom-class">Custom</Button>);

			await vi.waitFor(
				() => {
					const button = document.querySelector('button');
					expect(button).toBeInTheDocument();
					expect(button?.className).toContain('custom-class');
				},
				{ timeout: 3000 }
			);
		});

		test('should accept noStyle prop', async () => {
			render(
				<Button noStyle={true} className="only-this-class">
					No Style
				</Button>
			);

			await vi.waitFor(
				() => {
					const button = document.querySelector('button');
					expect(button).toBeInTheDocument();
					// When noStyle is true, only the custom className should be applied
					expect(button?.className).toBe('only-this-class');
				},
				{ timeout: 3000 }
			);
		});

		test('should accept disabled prop', async () => {
			render(<Button disabled>Disabled</Button>);

			await vi.waitFor(
				() => {
					const button = document.querySelector('button') as HTMLButtonElement;
					expect(button).toBeInTheDocument();
					expect(button?.disabled).toBe(true);
				},
				{ timeout: 3000 }
			);
		});

		test('should accept onClick handler', async () => {
			const handleClick = vi.fn();
			render(<Button onClick={handleClick}>Click</Button>);

			await vi.waitFor(
				() => {
					const button = document.querySelector('button');
					expect(button).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			const button = document.querySelector('button');
			expect(button).toBeInstanceOf(HTMLElement);
			if (!button) {
				throw new Error('Expected button to exist');
			}
			await userEvent.click(button);
			expect(handleClick).toHaveBeenCalledTimes(1);
		});

		test('should preserve native keyboard activation', async () => {
			const handleClick = vi.fn();
			render(<Button onClick={handleClick}>Keyboard</Button>);

			const button = document.querySelector('button');
			expect(button).toBeInstanceOf(HTMLElement);
			if (!button) {
				throw new Error('Expected button to exist');
			}

			button.focus();
			await userEvent.keyboard('{Enter}');
			expect(handleClick).toHaveBeenCalledTimes(1);
		});
	});

	describe('ButtonIcon', () => {
		test('should render icon component', async () => {
			const TestIcon = () => <svg data-testid="test-icon" />;
			render(
				<Button>
					<ButtonIcon as={TestIcon} />
					With Icon
				</Button>
			);

			await vi.waitFor(
				() => {
					const icon = document.querySelector('[data-testid="test-icon"]');
					expect(icon).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});
	});
});

describe('Switch', () => {
	describe('Rendering', () => {
		test('should render a switch element', async () => {
			render(<Switch />);

			await vi.waitFor(
				() => {
					const switchEl = document.querySelector('[role="switch"]');
					expect(switchEl).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should have unchecked state by default', async () => {
			render(<Switch />);

			await vi.waitFor(
				() => {
					const switchEl = document.querySelector('[role="switch"]');
					expect(switchEl).toBeInTheDocument();
					expect(switchEl?.getAttribute('aria-checked')).toBe('false');
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Props', () => {
		test('should accept checked prop', async () => {
			render(<Switch checked={true} />);

			await vi.waitFor(
				() => {
					const switchEl = document.querySelector('[role="switch"]');
					expect(switchEl).toBeInTheDocument();
					expect(switchEl?.getAttribute('aria-checked')).toBe('true');
				},
				{ timeout: 3000 }
			);
		});

		test('should accept defaultChecked prop', async () => {
			render(<Switch defaultChecked={true} />);

			await vi.waitFor(
				() => {
					const switchEl = document.querySelector('[role="switch"]');
					expect(switchEl).toBeInTheDocument();
					expect(switchEl?.getAttribute('aria-checked')).toBe('true');
				},
				{ timeout: 3000 }
			);
		});

		test('should accept disabled prop', async () => {
			render(<Switch disabled />);

			await vi.waitFor(
				() => {
					const switchEl = document.querySelector('[role="switch"]');
					expect(switchEl).toBeInTheDocument();
					expect(switchEl?.getAttribute('data-disabled')).toBe('');
				},
				{ timeout: 3000 }
			);
		});

		test('should accept size prop', async () => {
			render(<Switch size="small" />);

			await vi.waitFor(
				() => {
					const switchEl = document.querySelector('[role="switch"]');
					expect(switchEl).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should accept noStyle prop', async () => {
			render(<Switch noStyle={true} className="custom-switch" />);

			await vi.waitFor(
				() => {
					const switchEl = document.querySelector('[role="switch"]');
					expect(switchEl).toBeInTheDocument();
					expect(switchEl?.className).toBe('custom-switch');
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Interactions', () => {
		test('should toggle on click', async () => {
			const handleChange = vi.fn();
			render(<Switch onCheckedChange={handleChange} />);

			await vi.waitFor(
				() => {
					const switchEl = document.querySelector('[role="switch"]');
					expect(switchEl).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			const switchEl = document.querySelector('[role="switch"]');
			expect(switchEl).toBeInstanceOf(HTMLElement);
			if (!switchEl) {
				throw new Error('Expected switch to exist');
			}
			await userEvent.click(switchEl);
			expect(handleChange).toHaveBeenCalledWith(true);
		});

		test('should call onCheckedChange with new value', async () => {
			const handleChange = vi.fn();
			render(<Switch defaultChecked={true} onCheckedChange={handleChange} />);

			await vi.waitFor(
				() => {
					const switchEl = document.querySelector('[role="switch"]');
					expect(switchEl).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			const switchEl = document.querySelector('[role="switch"]');
			expect(switchEl).toBeInstanceOf(HTMLElement);
			if (!switchEl) {
				throw new Error('Expected switch to exist');
			}
			await userEvent.click(switchEl);
			expect(handleChange).toHaveBeenCalledWith(false);
		});

		test('should toggle on Enter key', async () => {
			const handleChange = vi.fn();
			render(<Switch onCheckedChange={handleChange} />);

			const switchEl = document.querySelector('[role="switch"]');
			expect(switchEl).toBeInstanceOf(HTMLElement);
			if (!switchEl) {
				throw new Error('Expected switch to exist');
			}

			switchEl.focus();
			await userEvent.keyboard('{Enter}');
			expect(handleChange).toHaveBeenCalledWith(true);
		});
	});

	describe('Accessibility', () => {
		test('should have role="switch"', async () => {
			render(<Switch />);

			await vi.waitFor(
				() => {
					const switchEl = document.querySelector('[role="switch"]');
					expect(switchEl).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should have aria-checked attribute', async () => {
			render(<Switch />);

			await vi.waitFor(
				() => {
					const switchEl = document.querySelector('[role="switch"]');
					expect(switchEl?.hasAttribute('aria-checked')).toBe(true);
				},
				{ timeout: 3000 }
			);
		});
	});
});

describe('Accordion', () => {
	const TestAccordion = ({
		type = 'single' as const,
		defaultValue,
	}: {
		type?: 'single' | 'multiple';
		defaultValue?: string;
	}) => (
		<ThemeWrapper>
			<AccordionRoot type={type} defaultValue={defaultValue}>
				<AccordionItem value="item-1">
					<AccordionTrigger>Section 1</AccordionTrigger>
					<AccordionContent>Content 1</AccordionContent>
				</AccordionItem>
				<AccordionItem value="item-2">
					<AccordionTrigger>Section 2</AccordionTrigger>
					<AccordionContent>Content 2</AccordionContent>
				</AccordionItem>
			</AccordionRoot>
		</ThemeWrapper>
	);

	describe('Rendering', () => {
		test('should render accordion items', async () => {
			render(<TestAccordion />);

			await vi.waitFor(
				() => {
					const triggers = document.querySelectorAll(
						'[data-slot="accordion-trigger"]'
					);
					expect(triggers.length).toBe(2);
				},
				{ timeout: 3000 }
			);
		});

		test('should render trigger text', async () => {
			render(<TestAccordion />);

			await vi.waitFor(
				() => {
					const trigger = document.querySelector('button');
					expect(trigger?.textContent).toBe('Section 1');
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Interactions', () => {
		test('should expand item on trigger click', async () => {
			render(<TestAccordion />);

			await vi.waitFor(
				() => {
					const trigger = document.querySelector('button');
					expect(trigger).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			const trigger = document.querySelector('button');
			expect(trigger).toBeInstanceOf(HTMLElement);
			if (!trigger) {
				throw new Error('Expected accordion trigger to exist');
			}
			await userEvent.click(trigger);

			await vi.waitFor(
				() => {
					const content = document.querySelector('[data-state="open"]');
					expect(content).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should close first item when second item is clicked (single type)', async () => {
			render(<TestAccordion type="single" defaultValue="item-1" />);

			await vi.waitFor(
				() => {
					const openTrigger = document.querySelector(
						'button[data-state="open"]'
					);
					expect(openTrigger).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			// Click the second item
			const triggers = document.querySelectorAll('button');
			const secondTrigger = triggers.item(1);
			expect(secondTrigger).toBeInstanceOf(HTMLElement);
			if (!secondTrigger) {
				throw new Error('Expected second accordion trigger to exist');
			}
			await userEvent.click(secondTrigger);

			// First item should now be closed, second should be open
			await vi.waitFor(
				() => {
					const firstTrigger = document.querySelector(
						'button[data-state="closed"]'
					);
					const secondTrigger = document.querySelectorAll('button')[1];
					expect(firstTrigger).toBeInTheDocument();
					expect(secondTrigger?.getAttribute('data-state')).toBe('open');
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Props', () => {
		test('should accept defaultValue prop', async () => {
			render(<TestAccordion defaultValue="item-1" />);

			await vi.waitFor(
				() => {
					const openTrigger = document.querySelector(
						'button[data-state="open"]'
					);
					expect(openTrigger).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should accept type="multiple"', async () => {
			render(
				<ThemeWrapper>
					<AccordionRoot type="multiple">
						<AccordionItem value="item-1">
							<AccordionTrigger>Section 1</AccordionTrigger>
							<AccordionContent>Content 1</AccordionContent>
						</AccordionItem>
						<AccordionItem value="item-2">
							<AccordionTrigger>Section 2</AccordionTrigger>
							<AccordionContent>Content 2</AccordionContent>
						</AccordionItem>
					</AccordionRoot>
				</ThemeWrapper>
			);

			await vi.waitFor(
				() => {
					const triggers = document.querySelectorAll('button');
					expect(triggers.length).toBe(2);
				},
				{ timeout: 3000 }
			);

			// Click both triggers, waiting for state to settle between clicks
			const triggers = document.querySelectorAll('button');
			const firstTrigger = triggers.item(0);
			expect(firstTrigger).toBeInstanceOf(HTMLElement);
			if (!firstTrigger) {
				throw new Error('Expected first accordion trigger to exist');
			}
			await userEvent.click(firstTrigger);
			await vi.waitFor(
				() => {
					expect(
						document.querySelector('button[data-state="open"]')
					).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			const secondTrigger = triggers.item(1);
			expect(secondTrigger).toBeInstanceOf(HTMLElement);
			if (!secondTrigger) {
				throw new Error('Expected second accordion trigger to exist');
			}
			await userEvent.click(secondTrigger);

			// Both should be open
			await vi.waitFor(
				() => {
					const openTriggers = document.querySelectorAll(
						'button[data-state="open"]'
					);
					expect(openTriggers.length).toBe(2);
				},
				{ timeout: 3000 }
			);
		});

		test('should accept noStyle prop', async () => {
			render(
				<ThemeWrapper>
					<AccordionRoot type="single" noStyle className="custom-accordion">
						<AccordionItem value="item-1" noStyle className="custom-item">
							<AccordionTrigger noStyle className="custom-trigger">
								Section
							</AccordionTrigger>
							<AccordionContent noStyle className="custom-content">
								Content
							</AccordionContent>
						</AccordionItem>
					</AccordionRoot>
				</ThemeWrapper>
			);

			await vi.waitFor(
				() => {
					const trigger = document.querySelector('.custom-trigger');
					expect(trigger).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});
	});

	describe('Accessibility', () => {
		test('should have correct ARIA attributes on trigger', async () => {
			render(<TestAccordion />);

			await vi.waitFor(
				() => {
					const trigger = document.querySelector('button');
					expect(trigger?.hasAttribute('aria-controls')).toBe(true);
					expect(trigger?.hasAttribute('aria-expanded')).toBe(true);
				},
				{ timeout: 3000 }
			);
		});

		test('should update aria-expanded on click', async () => {
			render(<TestAccordion />);

			await vi.waitFor(
				() => {
					const trigger = document.querySelector('button');
					expect(trigger?.getAttribute('aria-expanded')).toBe('false');
				},
				{ timeout: 3000 }
			);

			// Query fresh reference right before clicking to avoid stale node
			const trigger = document.querySelector('button[aria-expanded="false"]');
			expect(trigger).toBeInstanceOf(HTMLElement);
			if (!trigger) {
				throw new Error('Expected closed accordion trigger to exist');
			}
			await userEvent.click(trigger);

			await vi.waitFor(
				() => {
					const updatedTrigger = document.querySelector(
						'button[aria-expanded="true"]'
					);
					expect(updatedTrigger).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);
		});

		test('should support keyboard activation', async () => {
			render(<TestAccordion />);

			const trigger = document.querySelector('button');
			expect(trigger).toBeInstanceOf(HTMLElement);
			if (!trigger) {
				throw new Error('Expected accordion trigger to exist');
			}

			trigger.focus();
			await userEvent.keyboard('{Enter}');

			await vi.waitFor(
				() => {
					expect(trigger.getAttribute('aria-expanded')).toBe('true');
				},
				{ timeout: 3000 }
			);
		});
	});
});

describe('Dialog', () => {
	const TestDialog = ({
		initialFocusRef,
		onOpenChange,
	}: {
		initialFocusRef?: RefObject<HTMLElement | null>;
		onOpenChange?: (open: boolean) => void;
	}) => (
		<DialogRoot onOpenChange={onOpenChange}>
			<DialogTrigger>Open dialog</DialogTrigger>
			<DialogPortal>
				<DialogOverlay />
				<DialogContent initialFocusRef={initialFocusRef}>
					<DialogTitle>Settings</DialogTitle>
					<DialogDescription>Manage privacy settings</DialogDescription>
					<button type="button" ref={initialFocusRef as never}>
						Primary action
					</button>
					<DialogClose>Close</DialogClose>
				</DialogContent>
			</DialogPortal>
		</DialogRoot>
	);

	test('should open and close with accessible semantics', async () => {
		render(<TestDialog />);

		const trigger = document.querySelector('[data-slot="dialog-trigger"]');
		expect(trigger).toBeInstanceOf(HTMLElement);
		if (!trigger) {
			throw new Error('Expected dialog trigger to exist');
		}
		await userEvent.click(trigger);

		await vi.waitFor(() => {
			const dialog = document.querySelector('[role="dialog"]');
			expect(dialog).toBeInTheDocument();
			expect(dialog?.getAttribute('aria-labelledby')).toBeTruthy();
			expect(dialog?.getAttribute('aria-describedby')).toBeTruthy();
			expect(dialog?.getAttribute('aria-modal')).toBe('true');
		});

		const closeButton = document.querySelector('[data-slot="dialog-close"]');
		expect(closeButton).toBeInstanceOf(HTMLElement);
		if (!closeButton) {
			throw new Error('Expected dialog close button to exist');
		}
		await userEvent.click(closeButton);

		await vi.waitFor(() => {
			expect(document.querySelector('[role="dialog"]')).not.toBeInTheDocument();
		});
	});

	test('should close on Escape and restore focus to the trigger', async () => {
		render(<TestDialog />);

		const trigger = document.querySelector('[data-slot="dialog-trigger"]');
		expect(trigger).toBeInstanceOf(HTMLElement);
		if (!trigger) {
			throw new Error('Expected dialog trigger to exist');
		}

		trigger.focus();
		await userEvent.click(trigger);

		const dialog = document.querySelector('[role="dialog"]');
		expect(dialog).toBeInstanceOf(HTMLElement);
		if (!dialog) {
			throw new Error('Expected dialog to exist');
		}

		await userEvent.keyboard('{Escape}');

		await vi.waitFor(() => {
			expect(document.querySelector('[role="dialog"]')).not.toBeInTheDocument();
			expect(document.activeElement).toBe(trigger);
		});
	});

	test('should move focus to initialFocusRef when opened', async () => {
		const initialFocusRef = { current: null as HTMLButtonElement | null };
		render(<TestDialog initialFocusRef={initialFocusRef} />);

		const trigger = document.querySelector('[data-slot="dialog-trigger"]');
		expect(trigger).toBeInstanceOf(HTMLElement);
		if (!trigger) {
			throw new Error('Expected dialog trigger to exist');
		}

		await userEvent.click(trigger);

		await vi.waitFor(() => {
			expect(initialFocusRef.current).toBeInstanceOf(HTMLElement);
			expect(document.activeElement).toBe(initialFocusRef.current);
		});
	});
});

describe('Tabs', () => {
	test('should render tabs with correct semantics', async () => {
		render(
			<ThemeWrapper>
				<TabsRoot defaultValue="overview">
					<TabsList>
						<TabsTrigger value="overview">Overview</TabsTrigger>
						<TabsTrigger value="vendors">Vendors</TabsTrigger>
					</TabsList>
					<TabsContent value="overview">Overview panel</TabsContent>
					<TabsContent value="vendors">Vendors panel</TabsContent>
				</TabsRoot>
			</ThemeWrapper>
		);

		await vi.waitFor(() => {
			const tablist = document.querySelector('[role="tablist"]');
			const tabs = document.querySelectorAll('[role="tab"]');
			const panel = document.querySelector('[role="tabpanel"]');
			expect(tablist).toBeInTheDocument();
			expect(tabs.length).toBe(2);
			expect(panel).toBeInTheDocument();
		});
	});

	test('should switch tabs on click and keyboard navigation', async () => {
		render(
			<ThemeWrapper>
				<TabsRoot defaultValue="overview">
					<TabsList>
						<TabsTrigger value="overview">Overview</TabsTrigger>
						<TabsTrigger value="vendors">Vendors</TabsTrigger>
					</TabsList>
					<TabsContent value="overview">Overview panel</TabsContent>
					<TabsContent value="vendors">Vendors panel</TabsContent>
				</TabsRoot>
			</ThemeWrapper>
		);

		const triggers = document.querySelectorAll('[role="tab"]');
		const overview = triggers.item(0);
		const vendors = triggers.item(1);
		expect(overview).toBeInstanceOf(HTMLElement);
		expect(vendors).toBeInstanceOf(HTMLElement);
		if (!overview || !vendors) {
			throw new Error('Expected tab triggers to exist');
		}

		await userEvent.click(vendors);
		await vi.waitFor(() => {
			expect(vendors.getAttribute('aria-selected')).toBe('true');
			expect(
				document.querySelector('[role="tabpanel"]')?.textContent
			).toContain('Vendors panel');
		});

		vendors.focus();
		await userEvent.keyboard('{ArrowLeft}');
		await vi.waitFor(() => {
			expect(overview.getAttribute('aria-selected')).toBe('true');
			expect(document.activeElement).toBe(overview);
		});
	});
});

describe('Collapsible', () => {
	test('should expose trigger and content relationships', async () => {
		render(
			<ThemeWrapper>
				<CollapsibleRoot defaultOpen={false}>
					<CollapsibleTrigger>Toggle details</CollapsibleTrigger>
					<CollapsibleContent>Hidden details</CollapsibleContent>
				</CollapsibleRoot>
			</ThemeWrapper>
		);

		const trigger = document.querySelector('[data-slot="collapsible-trigger"]');
		const content = document.querySelector('[data-slot="collapsible-content"]');
		expect(trigger?.getAttribute('aria-controls')).toBeTruthy();
		expect(trigger?.getAttribute('aria-expanded')).toBe('false');
		expect(content?.getAttribute('aria-hidden')).toBe('true');
	});

	test('should open and close without focus leaks', async () => {
		render(
			<ThemeWrapper>
				<CollapsibleRoot defaultOpen={false}>
					<CollapsibleTrigger>Toggle details</CollapsibleTrigger>
					<CollapsibleContent>
						<button type="button">Nested action</button>
					</CollapsibleContent>
				</CollapsibleRoot>
			</ThemeWrapper>
		);

		const trigger = document.querySelector('[data-slot="collapsible-trigger"]');
		expect(trigger).toBeInstanceOf(HTMLElement);
		if (!trigger) {
			throw new Error('Expected collapsible trigger to exist');
		}

		await userEvent.click(trigger);
		await vi.waitFor(() => {
			expect(trigger.getAttribute('aria-expanded')).toBe('true');
			expect(
				document
					.querySelector('[data-slot="collapsible-content"]')
					?.getAttribute('aria-hidden')
			).toBe('false');
		});

		await userEvent.click(trigger);
		await vi.waitFor(() => {
			expect(trigger.getAttribute('aria-expanded')).toBe('false');
			expect(
				document
					.querySelector('[data-slot="collapsible-content"]')
					?.getAttribute('aria-hidden')
			).toBe('true');
		});
	});
});
