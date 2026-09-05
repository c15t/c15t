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
	variant: 'primary' | 'secondary' | 'danger' = 'secondary'
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
	description?: string
): HTMLElement {
	const section = createElement(document, 'section', 'c15t-dev-tools__section');
	section.append(createElement(document, 'h3', undefined, title));
	if (description) {
		section.append(
			createElement(document, 'p', 'c15t-dev-tools__muted', description)
		);
	}
	return section;
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
