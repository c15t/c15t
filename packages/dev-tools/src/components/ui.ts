/**
 * UI Component Utilities
 * Common reusable components
 */

import { button, createSvgElement, div, input, span } from '../core/renderer';
import styles from '../styles/components.module.css';

// === Toggle ===

export interface ToggleOptions {
	checked: boolean;
	onChange: (checked: boolean) => void;
	ariaLabel?: string;
	disabled?: boolean;
}

export function createToggle(options: ToggleOptions): HTMLButtonElement {
	const { checked, onChange, ariaLabel, disabled = false } = options;

	const toggle = button({
		className: `${styles.toggle} ${checked ? styles.toggleActive : ''}`,
		role: 'switch',
		ariaLabel,
		ariaChecked: checked ? 'true' : 'false',
		disabled,
		onClick: () => {
			if (!disabled) {
				onChange(!checked);
			}
		},
	}) as HTMLButtonElement;

	const thumb = div({ className: styles.toggleThumb });
	toggle.appendChild(thumb);

	return toggle;
}

// === Badge ===

export type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';

export interface BadgeOptions {
	text: string;
	variant?: BadgeVariant;
}

export function createBadge(options: BadgeOptions): HTMLSpanElement {
	const { text, variant = 'neutral' } = options;

	const variantClass = {
		success: styles.badgeSuccess,
		error: styles.badgeError,
		warning: styles.badgeWarning,
		info: styles.badgeInfo,
		neutral: styles.badgeNeutral,
	}[variant];

	return span({
		className: `${styles.badge} ${variantClass}`,
		text,
	}) as HTMLSpanElement;
}

// === Button ===

export type ButtonVariant = 'default' | 'primary' | 'danger';

export interface ButtonOptions {
	text: string;
	variant?: ButtonVariant;
	small?: boolean;
	icon?: string;
	disabled?: boolean;
	onClick: () => void;
}

export function createButton(options: ButtonOptions): HTMLButtonElement {
	const {
		text,
		variant = 'default',
		small = false,
		icon,
		disabled = false,
		onClick,
	} = options;

	const variantClass = {
		default: '',
		primary: styles.btnPrimary,
		danger: styles.btnDanger,
	}[variant];

	const sizeClass = small ? styles.btnSmall : '';

	const btn = button({
		className: `${styles.btn} ${variantClass} ${sizeClass}`.trim(),
		disabled,
		onClick,
	}) as HTMLButtonElement;

	if (icon) {
		const iconWrapper = div({ className: styles.btnIcon });
		iconWrapper.appendChild(createSvgElement(icon, { width: 14, height: 14 }));
		btn.appendChild(iconWrapper);
	}

	btn.appendChild(document.createTextNode(text));

	return btn;
}

// === Input ===

export interface InputOptions {
	value?: string;
	placeholder?: string;
	ariaLabel?: string;
	small?: boolean;
	onInput?: (value: string) => void;
}

export function createInput(options: InputOptions): HTMLInputElement {
	const { value, placeholder, ariaLabel, small = false, onInput } = options;
	const sizeClass = small ? styles.inputSmall : '';
	return input({
		className: `${styles.input} ${sizeClass}`.trim(),
		type: 'text',
		value,
		placeholder,
		ariaLabel,
		onInput: (event: Event) => {
			const target = event.target as HTMLInputElement | null;
			onInput?.(target?.value ?? '');
		},
	});
}

// === List Item ===

export interface ListItemOptions {
	title: string;
	description?: string;
	actions?: HTMLElement[];
}

export function createListItem(options: ListItemOptions): HTMLElement {
	const { title, description, actions = [] } = options;

	const content = div({
		className: styles.listItemContent,
		children: [
			span({ className: styles.listItemTitle, text: title }),
			description
				? span({ className: styles.listItemDescription, text: description })
				: null,
		],
	});

	const actionsContainer = div({
		className: styles.listItemActions,
		children: actions,
	});

	return div({
		className: styles.listItem,
		children: [content, actionsContainer],
	});
}

// === Section ===

export interface SectionOptions {
	title: string;
	actions?: HTMLElement[];
	children: HTMLElement[];
}

export function createSection(options: SectionOptions): HTMLElement {
	const { title, actions = [], children } = options;

	const header = div({
		className: styles.sectionHeader,
		children: [
			span({ className: styles.sectionTitle, text: title }),
			...actions,
		],
	});

	return div({
		className: styles.section,
		children: [header, ...children],
	});
}

// === Info Row ===

export interface InfoRowOptions {
	label: string;
	value: string;
}

export function createInfoRow(options: InfoRowOptions): HTMLElement {
	const { label, value } = options;

	return div({
		className: styles.infoRow,
		children: [
			span({ className: styles.infoLabel, text: label }),
			span({ className: styles.infoValue, text: value }),
		],
	});
}

// === Empty State ===

export interface EmptyStateOptions {
	icon?: string;
	text: string;
}

export function createEmptyState(options: EmptyStateOptions): HTMLElement {
	const { icon, text } = options;

	const children: (HTMLElement | null)[] = [];

	if (icon) {
		const iconWrapper = div({ className: styles.emptyStateIcon });
		iconWrapper.appendChild(createSvgElement(icon, { width: 32, height: 32 }));
		children.push(iconWrapper);
	}

	children.push(span({ className: styles.emptyStateText, text }));

	return div({
		className: styles.emptyState,
		children: children.filter(Boolean) as HTMLElement[],
	});
}

// === Grid ===

export interface GridOptions {
	columns?: 2 | 3;
	children: HTMLElement[];
}

export function createGrid(options: GridOptions): HTMLElement {
	const { columns = 2, children } = options;

	const colsClass = columns === 3 ? styles.gridCols3 : styles.gridCols2;

	return div({
		className: `${styles.grid} ${colsClass}`,
		children,
	});
}

// === Grid Card ===

export interface GridCardOptions {
	title: string;
	action?: HTMLElement;
}

export function createGridCard(options: GridCardOptions): HTMLElement {
	const { title, action } = options;

	const children: HTMLElement[] = [
		span({ className: styles.gridCardTitle, text: title }),
	];

	if (action) {
		children.push(action);
	}

	return div({
		className: styles.gridCard,
		children,
	});
}

// === Disconnected State ===

/**
 * Creates a "Store not connected" message element
 * Used when the c15t store is not available
 */
export function createDisconnectedState(
	message = 'Store not connected'
): HTMLElement {
	return div({
		className: styles.disconnectedState,
		style: {
			padding: '24px',
			textAlign: 'center',
			color: 'var(--c15t-text-muted)',
			fontSize: 'var(--c15t-devtools-font-size-sm)',
		},
		text: message,
	});
}
