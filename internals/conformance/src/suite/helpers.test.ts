import { afterEach, expect, test } from 'bun:test';

import { queryByTestId } from './helpers';

const hosts: HTMLElement[] = [];
const mount = () => {
	const host = document.createElement('div');
	const root = host.attachShadow({ mode: 'open' });
	const button = document.createElement('button');
	button.setAttribute('data-testid', 'consent-control');
	root.append(button);
	document.body.append(host);
	hosts.push(host);
	return { button, host };
};

afterEach(() => {
	for (const host of hosts.splice(0)) {
		host.remove();
	}
});

test('queries the requested shadow host before another mounted adapter', () => {
	mount();
	const second = mount();
	expect(queryByTestId(second.host, 'consent-control')).toBe(second.button);
});

test('finds nested open shadow roots through the document', () => {
	const outer = mount();
	const inner = mount();
	outer.button.remove();
	outer.host.shadowRoot?.append(inner.host);
	expect(queryByTestId(document.body, 'consent-control')).toBe(inner.button);
});
