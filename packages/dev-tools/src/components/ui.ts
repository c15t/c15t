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

export const createToggle = function createToggle(
	options: ToggleOptions
): HTMLButtonElement {
	const { checked, onChange, ariaLabel, disabled = false } = options;

	const toggle = button({
		ariaChecked: checked ? 'true' : 'false',
		ariaLabel,
		className: `${styles.toggle} ${checked ? styles.toggleActive : ''}`,
		disabled,
		onClick: () => {
			if (!disabled) {
				onChange(!checked);
			}
		},
		role: 'switch',
	}) as HTMLButtonElement;

	const thumb = div({ className: styles.toggleThumb });
	toggle.appendChild(thumb);

	return toggle;
};

// === Badge ===

export type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';

export interface BadgeOptions {
	text: string;
	variant?: BadgeVariant;
}

export const createBadge = function createBadge(
	options: BadgeOptions
): HTMLSpanElement {
	const { text, variant = 'neutral' } = options;

	const variantClass = {
		error: styles.badgeError,
		info: styles.badgeInfo,
		neutral: styles.badgeNeutral,
		success: styles.badgeSuccess,
		warning: styles.badgeWarning,
	}[variant];

	return span({
		className: `${styles.badge} ${variantClass}`,
		text,
	}) as HTMLSpanElement;
};

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

export const createButton = function createButton(
	options: ButtonOptions
): HTMLButtonElement {
	const {
		text,
		variant = 'default',
		small = false,
		icon,
		disabled = false,
		onClick,
	} = options;

	const variantClass = {
		danger: styles.btnDanger,
		default: '',
		primary: styles.btnPrimary,
	}[variant];

	const sizeClass = small ? styles.btnSmall : '';

	const btn = button({
		className: `${styles.btn} ${variantClass} ${sizeClass}`.trim(),
		disabled,
		onClick,
	}) as HTMLButtonElement;

	if (icon) {
		const iconWrapper = div({ className: styles.btnIcon });
		iconWrapper.appendChild(createSvgElement(icon, { height: 14, width: 14 }));
		btn.appendChild(iconWrapper);
	}

	btn.appendChild(document.createTextNode(text));

	return btn;
};

// === Input ===

export interface InputOptions {
	value?: string;
	placeholder?: string;
	ariaLabel?: string;
	small?: boolean;
	onInput?: (value: string) => void;
}

export const createInput = function createInput(
	options: InputOptions
): HTMLInputElement {
	const { value, placeholder, ariaLabel, small = false, onInput } = options;
	const sizeClass = small ? styles.inputSmall : '';
	return input({
		ariaLabel,
		className: `${styles.input} ${sizeClass}`.trim(),
		onInput: (event: Event) => {
			const target = event.target as HTMLInputElement | null;
			onInput?.(target?.value ?? '');
		},
		placeholder,
		type: 'text',
		value,
	});
};

// === List Item ===

export interface ListItemOptions {
	title: string;
	description?: string;
	actions?: HTMLElement[];
}

export const createListItem = function createListItem(
	options: ListItemOptions
): HTMLElement {
	const { title, description, actions = [] } = options;

	const content = div({
		children: [
			span({ className: styles.listItemTitle, text: title }),
			description
				? span({ className: styles.listItemDescription, text: description })
				: null,
		],
		className: styles.listItemContent,
	});

	const actionsContainer = div({
		children: actions,
		className: styles.listItemActions,
	});

	return div({
		children: [content, actionsContainer],
		className: styles.listItem,
	});
};

// === Section ===

export interface SectionOptions {
	title: string;
	actions?: HTMLElement[];
	children: HTMLElement[];
}

export const createSection = function createSection(
	options: SectionOptions
): HTMLElement {
	const { title, actions = [], children } = options;

	const header = div({
		children: [
			span({ className: styles.sectionTitle, text: title }),
			...actions,
		],
		className: styles.sectionHeader,
	});

	return div({
		children: [header, ...children],
		className: styles.section,
	});
};

// === Info Row ===

export interface InfoRowOptions {
	label: string;
	value: string;
}

export const createInfoRow = function createInfoRow(
	options: InfoRowOptions
): HTMLElement {
	const { label, value } = options;

	return div({
		children: [
			span({ className: styles.infoLabel, text: label }),
			span({ className: styles.infoValue, text: value }),
		],
		className: styles.infoRow,
	});
};

// === Empty State ===

export interface EmptyStateOptions {
	icon?: string;
	text: string;
}

export const createEmptyState = function createEmptyState(
	options: EmptyStateOptions
): HTMLElement {
	const { icon, text } = options;

	const children: (HTMLElement | null)[] = [];

	if (icon) {
		const iconWrapper = div({ className: styles.emptyStateIcon });
		iconWrapper.appendChild(createSvgElement(icon, { height: 32, width: 32 }));
		children.push(iconWrapper);
	}

	children.push(span({ className: styles.emptyStateText, text }));

	return div({
		children: children.filter(Boolean) as HTMLElement[],
		className: styles.emptyState,
	});
};

// === Grid ===

export interface GridOptions {
	columns?: 2 | 3;
	children: HTMLElement[];
}

export const createGrid = function createGrid(
	options: GridOptions
): HTMLElement {
	const { columns = 2, children } = options;

	const colsClass = columns === 3 ? styles.gridCols3 : styles.gridCols2;

	return div({
		children,
		className: `${styles.grid} ${colsClass}`,
	});
};

// === Grid Card ===

export interface GridCardOptions {
	title: string;
	action?: HTMLElement;
}

export const createGridCard = function createGridCard(
	options: GridCardOptions
): HTMLElement {
	const { title, action } = options;

	const children: HTMLElement[] = [
		span({ className: styles.gridCardTitle, text: title }),
	];

	if (action) {
		children.push(action);
	}

	return div({
		children,
		className: styles.gridCard,
	});
};

// === Disconnected State ===

/**
 * Creates a "Store not connected" message element
 * Used when the c15t store is not available
 */
export const createDisconnectedState = function createDisconnectedState(
	message = 'Store not connected'
): HTMLElement {
	return div({
		className: styles.disconnectedState,
		style: {
			color: 'var(--c15t-text-muted)',
			fontSize: 'var(--c15t-devtools-font-size-sm)',
			padding: '24px',
			textAlign: 'center',
		},
		text: message,
	});
};
