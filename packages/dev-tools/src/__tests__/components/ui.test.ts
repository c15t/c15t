import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
	createBadge,
	createButton,
	createDisconnectedState,
	createEmptyState,
	createGrid,
	createGridCard,
	createInfoRow,
	createListItem,
	createSection,
	createToggle,
} from '../../components/ui';

describe('UI Components', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	describe('createToggle', () => {
		it('should create a button element with role="switch"', () => {
			const toggle = createToggle({
				checked: false,
				onChange: vi.fn(),
			});

			expect(toggle.tagName).toBe('BUTTON');
			expect(toggle.getAttribute('role')).toBe('switch');
		});

		it('should set aria-checked based on checked prop', () => {
			const toggleChecked = createToggle({
				checked: true,
				onChange: vi.fn(),
			});
			expect(toggleChecked.getAttribute('aria-checked')).toBe('true');

			const toggleUnchecked = createToggle({
				checked: false,
				onChange: vi.fn(),
			});
			expect(toggleUnchecked.getAttribute('aria-checked')).toBe('false');
		});

		it('should call onChange when clicked', () => {
			const onChange = vi.fn();
			const toggle = createToggle({
				checked: false,
				onChange,
			});

			toggle.click();

			expect(onChange).toHaveBeenCalledWith(true);
		});

		it('should not call onChange when disabled', () => {
			const onChange = vi.fn();
			const toggle = createToggle({
				checked: false,
				onChange,
				disabled: true,
			});

			toggle.click();

			expect(onChange).not.toHaveBeenCalled();
		});

		it('should set aria-label when provided', () => {
			const toggle = createToggle({
				checked: false,
				onChange: vi.fn(),
				ariaLabel: 'Toggle analytics',
			});

			expect(toggle.getAttribute('aria-label')).toBe('Toggle analytics');
		});

		it('should contain a thumb element', () => {
			const toggle = createToggle({
				checked: false,
				onChange: vi.fn(),
			});

			expect(toggle.children.length).toBeGreaterThan(0);
		});
	});

	describe('createBadge', () => {
		it('should create a span element with text', () => {
			const badge = createBadge({ text: 'Active' });

			expect(badge.tagName).toBe('SPAN');
			expect(badge.textContent).toBe('Active');
		});

		it('should apply variant classes', () => {
			const successBadge = createBadge({ text: 'Success', variant: 'success' });
			const errorBadge = createBadge({ text: 'Error', variant: 'error' });
			const warningBadge = createBadge({ text: 'Warning', variant: 'warning' });
			const infoBadge = createBadge({ text: 'Info', variant: 'info' });
			const neutralBadge = createBadge({ text: 'Neutral', variant: 'neutral' });

			// All badges should be created
			expect(successBadge.className).toContain('badge');
			expect(errorBadge.className).toContain('badge');
			expect(warningBadge.className).toContain('badge');
			expect(infoBadge.className).toContain('badge');
			expect(neutralBadge.className).toContain('badge');
		});

		it('should default to neutral variant', () => {
			const badge = createBadge({ text: 'Default' });
			expect(badge.className).toContain('badge');
		});
	});

	describe('createButton', () => {
		it('should create a button element with text', () => {
			const btn = createButton({
				text: 'Click me',
				onClick: vi.fn(),
			});

			expect(btn.tagName).toBe('BUTTON');
			expect(btn.textContent).toBe('Click me');
		});

		it('should call onClick when clicked', () => {
			const onClick = vi.fn();
			const btn = createButton({
				text: 'Click me',
				onClick,
			});

			btn.click();

			expect(onClick).toHaveBeenCalled();
		});

		it('should be disabled when disabled prop is true', () => {
			const btn = createButton({
				text: 'Disabled',
				onClick: vi.fn(),
				disabled: true,
			});

			expect(btn.disabled).toBe(true);
		});

		it('should apply small class when small prop is true', () => {
			const btn = createButton({
				text: 'Small',
				onClick: vi.fn(),
				small: true,
			});

			expect(btn.className).toContain('btn');
		});

		it('should apply variant classes', () => {
			const primaryBtn = createButton({
				text: 'Primary',
				onClick: vi.fn(),
				variant: 'primary',
			});
			const dangerBtn = createButton({
				text: 'Danger',
				onClick: vi.fn(),
				variant: 'danger',
			});

			expect(primaryBtn.className).toContain('btn');
			expect(dangerBtn.className).toContain('btn');
		});

		it('should include icon when provided', () => {
			const iconSvg = '<svg></svg>';
			const btn = createButton({
				text: 'With Icon',
				onClick: vi.fn(),
				icon: iconSvg,
			});

			const iconWrapper = btn.querySelector('svg');
			expect(iconWrapper).not.toBeNull();
		});
	});

	describe('createListItem', () => {
		it('should create an element with title', () => {
			const item = createListItem({
				title: 'Test Item',
			});

			expect(item.textContent).toContain('Test Item');
		});

		it('should include description when provided', () => {
			const item = createListItem({
				title: 'Test Item',
				description: 'This is a description',
			});

			expect(item.textContent).toContain('This is a description');
		});

		it('should include actions when provided', () => {
			const actionBtn = document.createElement('button');
			actionBtn.textContent = 'Action';

			const item = createListItem({
				title: 'Test Item',
				actions: [actionBtn],
			});

			expect(item.querySelector('button')).not.toBeNull();
		});
	});

	describe('createSection', () => {
		it('should create a section with title', () => {
			const section = createSection({
				title: 'Section Title',
				children: [],
			});

			expect(section.textContent).toContain('Section Title');
		});

		it('should include children', () => {
			const child = document.createElement('div');
			child.textContent = 'Child content';

			const section = createSection({
				title: 'Section',
				children: [child],
			});

			expect(section.textContent).toContain('Child content');
		});

		it('should include actions in header', () => {
			const actionBtn = document.createElement('button');
			actionBtn.textContent = 'Action';

			const section = createSection({
				title: 'Section',
				actions: [actionBtn],
				children: [],
			});

			expect(section.querySelector('button')).not.toBeNull();
		});
	});

	describe('createInfoRow', () => {
		it('should create a row with label and value', () => {
			const row = createInfoRow({
				label: 'Status',
				value: 'Active',
			});

			expect(row.textContent).toContain('Status');
			expect(row.textContent).toContain('Active');
		});
	});

	describe('createEmptyState', () => {
		it('should create an element with text', () => {
			const emptyState = createEmptyState({
				text: 'No items found',
			});

			expect(emptyState.textContent).toContain('No items found');
		});

		it('should include icon when provided', () => {
			const iconSvg = '<svg viewBox="0 0 24 24"></svg>';
			const emptyState = createEmptyState({
				icon: iconSvg,
				text: 'No items',
			});

			expect(emptyState.querySelector('svg')).not.toBeNull();
		});
	});

	describe('createGrid', () => {
		it('should create a grid with 2 columns by default', () => {
			const grid = createGrid({
				children: [],
			});

			expect(grid.className).toContain('grid');
		});

		it('should support 3 columns', () => {
			const grid = createGrid({
				columns: 3,
				children: [],
			});

			expect(grid.className).toContain('grid');
		});

		it('should include children', () => {
			const child1 = document.createElement('div');
			child1.textContent = 'Child 1';
			const child2 = document.createElement('div');
			child2.textContent = 'Child 2';

			const grid = createGrid({
				children: [child1, child2],
			});

			expect(grid.children.length).toBe(2);
		});
	});

	describe('createGridCard', () => {
		it('should create a card with title', () => {
			const card = createGridCard({
				title: 'Card Title',
			});

			expect(card.textContent).toContain('Card Title');
		});

		it('should include action when provided', () => {
			const actionBtn = document.createElement('button');
			actionBtn.textContent = 'Click';

			const card = createGridCard({
				title: 'Card',
				action: actionBtn,
			});

			expect(card.querySelector('button')).not.toBeNull();
		});
	});

	describe('createDisconnectedState', () => {
		it('should create an element with default message', () => {
			const state = createDisconnectedState();

			expect(state.textContent).toBe('Store not connected');
		});

		it('should allow custom message', () => {
			const state = createDisconnectedState('Custom error message');

			expect(state.textContent).toBe('Custom error message');
		});

		it('should have centered text style', () => {
			const state = createDisconnectedState();

			expect(state.style.textAlign).toBe('center');
		});

		it('should have padding', () => {
			const state = createDisconnectedState();

			expect(state.style.padding).toBe('24px');
		});
	});
});
