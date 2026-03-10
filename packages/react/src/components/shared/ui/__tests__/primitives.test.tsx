/**
 * Comprehensive tests for shared UI primitives (Button, Switch, Accordion).
 *
 * @packageDocumentation
 */

import type { ReactNode } from 'react';
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
import { Root as Switch } from '../switch/switch';

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
			await userEvent.click(button!);
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
			await userEvent.click(switchEl!);
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
			await userEvent.click(switchEl!);
			expect(handleChange).toHaveBeenCalledWith(false);
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
						'[data-radix-collection-item]'
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
			await userEvent.click(trigger!);

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
			await userEvent.click(triggers[1]!);

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
			await userEvent.click(triggers[0]!);
			await vi.waitFor(
				() => {
					expect(
						document.querySelector('button[data-state="open"]')
					).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			await userEvent.click(triggers[1]!);

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
			await userEvent.click(trigger!);

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
	});
});
