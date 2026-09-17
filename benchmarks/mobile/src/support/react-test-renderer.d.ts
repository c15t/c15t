/**
 * react-test-renderer 19 ships no types. The harness uses two exports and needs
 * them typed, so the shape lives here rather than in a `@types` package that has
 * not caught up with React 19.
 */

// This file describes someone else's callback-shaped API.
/* eslint-disable promise/prefer-await-to-callbacks */

declare module 'react-test-renderer' {
	import type { ReactNode } from 'react';

	export interface ReactTestRenderer {
		toJSON: () => unknown;
		unmount: () => void;
		update: (node: ReactNode) => void;
	}

	export function create(
		node: ReactNode,
		options?: Record<string, unknown>
	): ReactTestRenderer;

	// React's `act` accepts a sync or an async callback and always hands back
	// something awaitable, so the return type stays a promise either way.
	export function act(callback: () => unknown): Promise<void>;
}
