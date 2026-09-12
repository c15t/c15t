/** Anything `h()` accepts as a child. */
export type Child = Node | string | number | null | undefined | false;

/** Attribute values `h()` accepts. `true` sets an empty attribute. */
export type AttrValue =
	| string
	| number
	| boolean
	| null
	| undefined
	| EventListener;

const SVG_NS = 'http://www.w3.org/2000/svg';

const applyAttrs = function applyAttrs(
	element: Element,
	attrs: Record<string, AttrValue>
): void {
	for (const [name, value] of Object.entries(attrs)) {
		if (value === null || value === undefined || value === false) {
			continue;
		}
		if (typeof value === 'function') {
			element.addEventListener(name.slice(2), value);
			continue;
		}
		if (value === true) {
			element.setAttribute(name, '');
			continue;
		}
		element.setAttribute(name, String(value));
	}
};

const appendChildren = function appendChildren(
	element: Element,
	children: Child[]
): void {
	for (const child of children) {
		if (child === null || child === undefined || child === false) {
			continue;
		}
		element.append(
			typeof child === 'string' || typeof child === 'number'
				? document.createTextNode(String(child))
				: child
		);
	}
};

/**
 * Create an element with attributes and children.
 *
 * Attributes starting with `on` and holding a function become event
 * listeners; `class` is a plain attribute so an empty string stays off
 * the element when `noStyle` blanks every class.
 *
 * @param tag - Element tag.
 * @param attrs - Attributes.
 * @param children - Text or nodes to append.
 * @returns The element.
 */
export const h = function h<TagName extends keyof HTMLElementTagNameMap>(
	tag: TagName,
	attrs: Record<string, AttrValue> = {},
	...children: Child[]
): HTMLElementTagNameMap[TagName] {
	const element = document.createElement(tag);
	const { class: className, ...rest } = attrs;
	if (typeof className === 'string' && className.trim() !== '') {
		element.setAttribute('class', className.trim());
	}
	applyAttrs(element, rest);
	appendChildren(element, children);
	return element;
};

/**
 * Create an inline SVG icon.
 *
 * @param viewBox - The `viewBox`.
 * @param paths - Path `d` strings, filled with `currentColor`.
 * @param attrs - Extra attributes on the `<svg>`.
 * @returns The element.
 */
export const svg = function svg(
	viewBox: string,
	paths: string[],
	attrs: Record<string, AttrValue> = {}
): SVGSVGElement {
	const element = document.createElementNS(SVG_NS, 'svg');
	element.setAttribute('viewBox', viewBox);
	element.setAttribute('aria-hidden', 'true');
	element.setAttribute('focusable', 'false');
	applyAttrs(element, attrs);
	for (const d of paths) {
		const path = document.createElementNS(SVG_NS, 'path');
		path.setAttribute('fill', 'currentColor');
		path.setAttribute('d', d);
		element.append(path);
	}
	return element;
};

/**
 * Join class names, dropping blanks.
 *
 * @param names - Class names, possibly empty or undefined.
 * @returns The joined string.
 */
export const cx = function cx(
	...names: (string | undefined | false | null)[]
): string {
	return names.filter(Boolean).join(' ');
};

/**
 * Read a CSS duration custom property from an element, in milliseconds.
 *
 * @param element - The element carrying the variable.
 * @param name - The custom property name.
 * @param fallback - Used when the property is unset or unparsable.
 * @returns Milliseconds.
 */
export const readDurationMs = function readDurationMs(
	element: Element,
	name: string,
	fallback: number
): number {
	const value = getComputedStyle(element).getPropertyValue(name).trim();
	if (!value) {
		return fallback;
	}
	const parsed = Number.parseFloat(value);
	if (Number.isNaN(parsed)) {
		return fallback;
	}
	return value.endsWith('ms') ? parsed : parsed * 1000;
};

/**
 * Whether the visitor asked for reduced motion.
 *
 * @returns `true` when the media query matches.
 */
export const prefersReducedMotion = function prefersReducedMotion(): boolean {
	return (
		typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);
};
