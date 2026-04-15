/**
 * Tests for the portal Svelte action.
 *
 * No direct React equivalent — this is Svelte-specific.
 */

import { describe, expect, test } from 'vitest';
import { portal } from '../../lib/actions/portal';

describe('portal action', () => {
	test('should move element to document.body by default', () => {
		const node = document.createElement('div');
		node.textContent = 'Portaled content';

		const result = portal(node);

		expect(document.body.contains(node)).toBe(true);
		result?.destroy();
	});

	test('should move element to a custom target element', () => {
		const target = document.createElement('div');
		target.id = 'portal-target';
		document.body.appendChild(target);

		const node = document.createElement('div');
		node.textContent = 'Portaled content';

		const result = portal(node, target);

		expect(target.contains(node)).toBe(true);

		result?.destroy();
		document.body.removeChild(target);
	});

	test('should move element to a target specified by selector string', () => {
		const target = document.createElement('div');
		target.id = 'portal-target-string';
		document.body.appendChild(target);

		const node = document.createElement('div');
		node.textContent = 'Portaled content';

		const result = portal(node, '#portal-target-string');

		expect(target.contains(node)).toBe(true);

		result?.destroy();
		document.body.removeChild(target);
	});

	test('should return action object even when target selector does not match', () => {
		const node = document.createElement('div');
		node.textContent = 'Content';

		const result = portal(node, '#nonexistent');

		// Portal now always returns {update, destroy} for proper lifecycle handling
		expect(result).toBeDefined();
		expect(result.destroy).toBeInstanceOf(Function);
		expect(result.update).toBeInstanceOf(Function);
		// Node should not have been moved
		expect(document.body.contains(node)).toBe(false);
	});

	test('should remove element on destroy', () => {
		const node = document.createElement('div');
		node.textContent = 'Portaled content';

		const result = portal(node);

		expect(document.body.contains(node)).toBe(true);
		result?.destroy();
		expect(document.body.contains(node)).toBe(false);
	});
});
