import { beforeEach, expect, test } from 'bun:test';
import { domSnapshot, domSnapshotFor } from './dom-snapshot';

function makeEl(html: string): Element {
	const div = document.createElement('div');
	div.innerHTML = html.trim();
	const el = div.firstElementChild;
	if (!el) throw new Error('makeEl: no element parsed from html');
	return el;
}

beforeEach(() => {
	document.body.innerHTML = '';
});

test('sorts attributes alphabetically', () => {
	const el = makeEl('<div data-z="1" aria-label="x" class="a"></div>');
	const snap = domSnapshot(el);
	expect(snap).toBe('<div aria-label="x" class="a" data-z="1"></div>');
});

test('strips svelte scoped class hashes', () => {
	const el = makeEl('<div class="btn svelte-a1b2c3 primary"></div>');
	expect(domSnapshot(el)).toBe('<div class="btn primary"></div>');
});

test('strips s-hash scoped classes', () => {
	const el = makeEl('<div class="btn s-abc123def primary"></div>');
	expect(domSnapshot(el)).toBe('<div class="btn primary"></div>');
});

test('removes empty class attribute after stripping', () => {
	const el = makeEl('<div class="svelte-xyz123"></div>');
	expect(domSnapshot(el)).toBe('<div></div>');
});

test('strips framework-internal attributes', () => {
	const el = makeEl(
		'<div data-reactroot="" data-svelte-h="abc" data-testid="root"></div>'
	);
	expect(domSnapshot(el)).toBe('<div data-testid="root"></div>');
});

test('normalizes radix auto-ids', () => {
	const el = makeEl(
		'<div aria-labelledby="radix-abc-123" id="radix-xyz-456"></div>'
	);
	expect(domSnapshot(el)).toBe(
		'<div aria-labelledby="__AUTO__" id="__AUTO__"></div>'
	);
});

test('normalizes react :r…: auto-ids', () => {
	const el = makeEl('<div id=":r1a:" aria-describedby=":r2b:"></div>');
	expect(domSnapshot(el)).toBe(
		'<div aria-describedby="__AUTO__" id="__AUTO__"></div>'
	);
});

test('preserves stable ids that do not match auto patterns', () => {
	const el = makeEl('<div id="consent-banner-root"></div>');
	expect(domSnapshot(el)).toBe('<div id="consent-banner-root"></div>');
});

test('recursively canonicalizes children', () => {
	const el = makeEl(
		'<div class="outer"><span class="inner svelte-xx">hi</span></div>'
	);
	expect(domSnapshot(el)).toBe(
		'<div class="outer"><span class="inner">hi</span></div>'
	);
});

test('collapses whitespace in text nodes', () => {
	const el = makeEl('<p>  Hello   world  </p>');
	expect(domSnapshot(el)).toBe('<p>Hello world</p>');
});

test('drops whitespace-only text between tags', () => {
	const el = makeEl('<div>\n  <span>x</span>\n  <span>y</span>\n</div>');
	expect(domSnapshot(el)).toBe('<div><span>x</span><span>y</span></div>');
});

test('sorts class names alphabetically', () => {
	const el = makeEl('<div class="zeta alpha beta"></div>');
	expect(domSnapshot(el)).toBe('<div class="alpha beta zeta"></div>');
});

test('domSnapshotFor picks elements by test-id', () => {
	document.body.innerHTML =
		'<div data-testid="a">one</div>' +
		'<div data-testid="b">two</div>' +
		'<div data-testid="c">three</div>';
	const snap = domSnapshotFor(document.body, ['a', 'c']);
	expect(Object.keys(snap)).toEqual(['a', 'c']);
	expect(snap.a).toContain('one');
	expect(snap.c).toContain('three');
});

test('domSnapshotFor skips missing test-ids silently', () => {
	document.body.innerHTML = '<div data-testid="a">x</div>';
	const snap = domSnapshotFor(document.body, ['a', 'missing']);
	expect(Object.keys(snap)).toEqual(['a']);
});

test('two frameworks with different scoped hashes produce identical snapshots', () => {
	const react = makeEl(
		'<button class="btn primary" data-testid="accept">Accept</button>'
	);
	const svelte = makeEl(
		'<button class="btn svelte-abc123 primary" data-testid="accept" data-svelte-h="xyz">Accept</button>'
	);
	expect(domSnapshot(react)).toBe(domSnapshot(svelte));
});
