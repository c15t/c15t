import { expect, test } from 'vitest';

import { serializeWithoutComments } from './serialize-without-comments';

test('removes nested and multiline comments without changing the live DOM', () => {
	const element = document.createElement('div');
	element.innerHTML = '<!--start\nend--><button><!--nested-->Accept</button>';
	const original = element.outerHTML;
	expect(serializeWithoutComments(element)).toBe(
		'<div><button>Accept</button></div>'
	);
	expect(element.outerHTML).toBe(original);
});

test('preserves comment-like attribute values and text', () => {
	const element = document.createElement('button');
	element.setAttribute('aria-label', '<!--Accept-->');
	element.textContent = '<!--Accept-->';
	expect(serializeWithoutComments(element)).toBe(element.outerHTML);
});
