import { serializeDiagnostic } from './serialization';

// oxlint-disable-next-line func-style -- Hoisted DOM helpers keep render functions readable.
export function createElement<K extends keyof HTMLElementTagNameMap>(
	document: Document,
	tag: K,
	className?: string,
	text?: string
): HTMLElementTagNameMap[K] {
	const element = document.createElement(tag);
	if (className) {
		element.className = className;
	}
	if (text !== undefined) {
		element.textContent = text;
	}
	return element;
}

// oxlint-disable-next-line func-style -- Hoisted DOM helpers keep render functions readable.
export function createButton(
	document: Document,
	label: string,
	onClick: () => void,
	variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'secondary'
): HTMLButtonElement {
	const button = createElement(
		document,
		'button',
		`c15t-dev-tools__button c15t-dev-tools__button--${variant}`,
		label
	);
	button.type = 'button';
	button.dataset.focusKey = `button:${label}`;
	button.addEventListener('click', onClick);
	return button;
}

// oxlint-disable-next-line func-style -- Hoisted DOM helpers keep render functions readable.
export function createSection(
	document: Document,
	title: string,
	description?: string,
	action?: HTMLElement
): HTMLElement {
	const section = createElement(document, 'section', 'c15t-dev-tools__section');
	// Title and description sit closer to each other than to the content.
	const heading = createElement(
		document,
		'div',
		'c15t-dev-tools__section-heading'
	);
	heading.append(createElement(document, 'h3', undefined, title));
	if (description) {
		heading.append(
			createElement(document, 'p', 'c15t-dev-tools__muted', description)
		);
	}
	if (action) {
		const header = createElement(
			document,
			'div',
			'c15t-dev-tools__section-header'
		);
		header.append(heading, action);
		section.append(header);
	} else {
		section.append(heading);
	}
	return section;
}

/**
 * Status pill with a visually hidden prefix, so a row reads
 * "Effective: Allowed" to screen readers but shows "Allowed".
 */
// oxlint-disable-next-line func-style -- Hoisted DOM helpers keep render functions readable.
export function createState(
	document: Document,
	prefix: string,
	value: string,
	state: string
): HTMLElement {
	const pill = createElement(document, 'span', 'c15t-dev-tools__state');
	pill.dataset.state = state;
	pill.append(
		createElement(document, 'span', 'c15t-dev-tools__sr-only', `${prefix}: `),
		createElement(document, 'span', undefined, value)
	);
	return pill;
}

// oxlint-disable-next-line func-style -- Hoisted DOM helpers keep render functions readable.
export function createCodeBlock(
	document: Document,
	value: unknown
): HTMLElement {
	const output = createElement(document, 'pre', 'c15t-dev-tools__code');
	output.textContent = serializeDiagnostic(value);
	return output;
}

// oxlint-disable-next-line func-style -- Hoisted DOM helpers keep render functions readable.
export function createStat(
	document: Document,
	label: string,
	value: string
): HTMLElement {
	const row = createElement(document, 'div', 'c15t-dev-tools__stat');
	row.append(
		createElement(document, 'dt', undefined, label),
		createElement(document, 'dd', undefined, value)
	);
	return row;
}

// oxlint-disable-next-line func-style -- Hoisted DOM helpers keep render functions readable.
export function createTextField(
	document: Document,
	labelText: string,
	value: string
): { field: HTMLElement; input: HTMLInputElement } {
	const field = createElement(document, 'label', 'c15t-dev-tools__field');
	field.append(createElement(document, 'span', undefined, labelText));
	const input = createElement(document, 'input');
	input.type = 'text';
	input.value = value;
	input.autocomplete = 'off';
	input.spellcheck = false;
	input.dataset.focusKey = `field:${labelText}`;
	field.append(input);
	return { field, input };
}
