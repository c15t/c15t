import { createRef } from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';

import { Slot } from '../slot';

afterEach(() => {
	vi.restoreAllMocks();
});

describe('Slot', () => {
	test('composes the slot ref with the child ref without touching element.ref', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const slotRef = createRef<HTMLElement>();
		const childRef = createRef<HTMLDivElement>();

		render(
			<Slot
				ref={slotRef}
				data-testid="slot-host"
			>
				<div
					ref={childRef}
					data-testid="slot-child"
				/>
			</Slot>
		);

		await vi.waitFor(() => {
			expect(childRef.current).toBeInstanceOf(HTMLDivElement);
		});
		expect(slotRef.current).toBe(childRef.current);
		expect(childRef.current?.dataset.testid).toBe('slot-child');
		expect(
			error.mock.calls.some((call) => String(call[0]).includes('element.ref'))
		).toBe(false);
	});

	test('merges class names, styles and event handlers onto the child', async () => {
		const slotClick = vi.fn();
		const childClick = vi.fn();

		render(
			<Slot
				className="from-slot"
				onClick={slotClick}
				style={{ color: 'red' }}
			>
				<button
					type="button"
					className="from-child"
					onClick={childClick}
					style={{ margin: 0 }}
				>
					go
				</button>
			</Slot>
		);

		const element = await vi.waitFor(() => {
			const button = document.querySelector('button');
			expect(button).not.toBeNull();
			return button as HTMLButtonElement;
		});
		await userEvent.click(element);
		expect(element?.className).toBe('from-slot from-child');
		expect(element?.style.color).toBe('red');
		expect(element?.style.margin).toBe('0px');
		expect(childClick).toHaveBeenCalledOnce();
		expect(slotClick).toHaveBeenCalledOnce();
	});
});
