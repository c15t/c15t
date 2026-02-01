/**
 * DOM Rendering Utilities
 * Provides declarative element creation for vanilla JS components
 */

/**
 * Attributes that can be set on an element
 */
export type ElementAttributes = {
	className?: string;
	id?: string;
	style?: Partial<CSSStyleDeclaration>;
	dataset?: Record<string, string>;
	role?: string;
	tabIndex?: number;
	ariaLabel?: string;
	ariaExpanded?: string;
	ariaHidden?: string;
	ariaSelected?: string;
	ariaControls?: string;
	ariaChecked?: string;
	title?: string;
	type?: string;
	value?: string;
	placeholder?: string;
	disabled?: boolean;
	checked?: boolean;
	name?: string;
	htmlFor?: string;
} & Record<string, unknown>;

/**
 * Event handlers that can be attached to an element
 */
export type ElementEvents = {
	onClick?: EventListener;
	onMouseEnter?: EventListener;
	onMouseLeave?: EventListener;
	onKeyDown?: EventListener;
	onKeyUp?: EventListener;
	onFocus?: EventListener;
	onBlur?: EventListener;
	onChange?: EventListener;
	onInput?: EventListener;
	onAnimationEnd?: EventListener;
	onTransitionEnd?: EventListener;
};

/**
 * Options for creating an element
 */
export interface CreateElementOptions extends ElementAttributes, ElementEvents {
	/** Tag name for the element */
	tag?: keyof HTMLElementTagNameMap;
	/** Text content */
	text?: string;
	/** HTML content (use with caution) */
	html?: string;
	/** Child elements */
	children?: (HTMLElement | string | null | undefined)[];
}

/**
 * Creates an HTML element with the given options
 */
export function createElement(options: CreateElementOptions = {}): HTMLElement {
	const {
		tag = 'div',
		text,
		html,
		children,
		className,
		id,
		style,
		dataset,
		onClick,
		onMouseEnter,
		onMouseLeave,
		onKeyDown,
		onKeyUp,
		onFocus,
		onBlur,
		onChange,
		onInput,
		onAnimationEnd,
		onTransitionEnd,
		...attrs
	} = options;

	const element = document.createElement(tag);

	// Set class name
	if (className) {
		element.className = className;
	}

	// Set ID
	if (id) {
		element.id = id;
	}

	// Set inline styles
	if (style) {
		for (const [key, value] of Object.entries(style)) {
			if (value !== undefined) {
				element.style.setProperty(
					key.replace(/([A-Z])/g, '-$1').toLowerCase(),
					String(value)
				);
			}
		}
	}

	// Set data attributes
	if (dataset) {
		for (const [key, value] of Object.entries(dataset)) {
			element.dataset[key] = value;
		}
	}

	// Set text content
	if (text) {
		element.textContent = text;
	}

	// Set HTML content (use with caution)
	if (html) {
		element.innerHTML = html;
	}

	// Add children
	if (children) {
		for (const child of children) {
			if (child === null || child === undefined) {
				continue;
			}
			if (typeof child === 'string') {
				element.appendChild(document.createTextNode(child));
			} else {
				element.appendChild(child);
			}
		}
	}

	// Set ARIA attributes
	if (attrs.ariaLabel !== undefined) {
		element.setAttribute('aria-label', attrs.ariaLabel as string);
	}
	if (attrs.ariaExpanded !== undefined) {
		element.setAttribute('aria-expanded', attrs.ariaExpanded as string);
	}
	if (attrs.ariaHidden !== undefined) {
		element.setAttribute('aria-hidden', attrs.ariaHidden as string);
	}
	if (attrs.ariaSelected !== undefined) {
		element.setAttribute('aria-selected', attrs.ariaSelected as string);
	}
	if (attrs.ariaControls !== undefined) {
		element.setAttribute('aria-controls', attrs.ariaControls as string);
	}
	if (attrs.ariaChecked !== undefined) {
		element.setAttribute('aria-checked', attrs.ariaChecked as string);
	}

	// Set other attributes
	for (const [key, value] of Object.entries(attrs)) {
		if (value !== undefined && !key.startsWith('aria')) {
			if (typeof value === 'boolean') {
				if (value) {
					element.setAttribute(key, '');
				}
			} else {
				element.setAttribute(key, String(value));
			}
		}
	}

	// Add event listeners
	if (onClick) {
		element.addEventListener('click', onClick);
	}
	if (onMouseEnter) {
		element.addEventListener('mouseenter', onMouseEnter);
	}
	if (onMouseLeave) {
		element.addEventListener('mouseleave', onMouseLeave);
	}
	if (onKeyDown) {
		element.addEventListener('keydown', onKeyDown);
	}
	if (onKeyUp) {
		element.addEventListener('keyup', onKeyUp);
	}
	if (onFocus) {
		element.addEventListener('focus', onFocus);
	}
	if (onBlur) {
		element.addEventListener('blur', onBlur);
	}
	if (onChange) {
		element.addEventListener('change', onChange);
	}
	if (onInput) {
		element.addEventListener('input', onInput);
	}
	if (onAnimationEnd) {
		element.addEventListener('animationend', onAnimationEnd);
	}
	if (onTransitionEnd) {
		element.addEventListener('transitionend', onTransitionEnd);
	}

	return element;
}

/**
 * Shorthand for creating a div element
 */
export function div(
	options: Omit<CreateElementOptions, 'tag'> = {}
): HTMLDivElement {
	return createElement({ ...options, tag: 'div' }) as HTMLDivElement;
}

/**
 * Shorthand for creating a button element
 */
export function button(
	options: Omit<CreateElementOptions, 'tag'> = {}
): HTMLButtonElement {
	return createElement({
		...options,
		tag: 'button',
		type: (options.type as string | undefined) ?? 'button',
	}) as HTMLButtonElement;
}

/**
 * Shorthand for creating a span element
 */
export function span(
	options: Omit<CreateElementOptions, 'tag'> = {}
): HTMLSpanElement {
	return createElement({ ...options, tag: 'span' }) as HTMLSpanElement;
}

/**
 * Shorthand for creating a label element
 */
export function label(
	options: Omit<CreateElementOptions, 'tag'> = {}
): HTMLLabelElement {
	return createElement({ ...options, tag: 'label' }) as HTMLLabelElement;
}

/**
 * Shorthand for creating an input element
 */
export function input(
	options: Omit<CreateElementOptions, 'tag'> = {}
): HTMLInputElement {
	return createElement({ ...options, tag: 'input' }) as HTMLInputElement;
}

/**
 * Options for creating a select element
 */
export interface SelectOption {
	value: string;
	label: string;
}

/**
 * Shorthand for creating a select element with options
 */
export function select(
	options: Omit<CreateElementOptions, 'tag'> & {
		options?: SelectOption[];
		selectedValue?: string;
	} = {}
): HTMLSelectElement {
	const { options: selectOptions, selectedValue, ...rest } = options;
	const selectElement = createElement({
		...rest,
		tag: 'select',
	}) as HTMLSelectElement;

	if (selectOptions) {
		for (const opt of selectOptions) {
			const optionElement = document.createElement('option');
			optionElement.value = opt.value;
			optionElement.textContent = opt.label;
			if (selectedValue === opt.value) {
				optionElement.selected = true;
			}
			selectElement.appendChild(optionElement);
		}
	}

	return selectElement;
}

/**
 * Creates an SVG element
 */
export function createSvgElement(
	svgContent: string,
	options: {
		className?: string;
		ariaHidden?: boolean;
		width?: number;
		height?: number;
	} = {}
): SVGSVGElement {
	const { className, ariaHidden = true, width = 24, height = 24 } = options;

	const wrapper = document.createElement('div');
	wrapper.innerHTML = svgContent.trim();

	const svg = wrapper.firstElementChild as SVGSVGElement;

	if (svg) {
		if (className) {
			svg.setAttribute('class', className);
		}
		if (ariaHidden) {
			svg.setAttribute('aria-hidden', 'true');
		}
		svg.setAttribute('width', String(width));
		svg.setAttribute('height', String(height));
	}

	return svg;
}

/**
 * Removes all children from an element
 */
export function clearElement(element: HTMLElement): void {
	while (element.firstChild) {
		element.removeChild(element.firstChild);
	}
}

/**
 * Replaces all children of an element with new children
 */
export function replaceChildren(
	element: HTMLElement,
	children: (HTMLElement | string | null | undefined)[]
): void {
	clearElement(element);
	for (const child of children) {
		if (child === null || child === undefined) {
			continue;
		}
		if (typeof child === 'string') {
			element.appendChild(document.createTextNode(child));
		} else {
			element.appendChild(child);
		}
	}
}

/**
 * Adds or removes a class based on a condition
 */
export function toggleClass(
	element: HTMLElement,
	className: string,
	condition: boolean
): void {
	if (condition) {
		element.classList.add(className);
	} else {
		element.classList.remove(className);
	}
}

/**
 * Sets multiple classes at once
 */
export function setClasses(
	element: HTMLElement,
	classes: Record<string, boolean>
): void {
	for (const [className, condition] of Object.entries(classes)) {
		toggleClass(element, className, condition);
	}
}

/**
 * Creates a portal - appends element to document.body
 */
export function createPortal(element: HTMLElement): () => void {
	document.body.appendChild(element);

	return () => {
		if (element.parentNode) {
			element.parentNode.removeChild(element);
		}
	};
}
