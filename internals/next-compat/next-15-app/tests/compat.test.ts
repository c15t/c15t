import { defineCompatSuite } from '../../shared/src/suite';

defineCompatSuite({
	scenarios: [
		{
			initPath: 'client',
			name: 'client',
			path: '/client',
			rendering: { kind: 'static' },
		},
		{
			initPath: 'ssr',
			name: 'ssr',
			path: '/ssr',
			rendering: { kind: 'dynamic' },
		},
		{
			initPath: 'client',
			name: 'isr',
			path: '/isr',
			rendering: { kind: 'isr', revalidate: 60 },
		},
		{
			country: null,
			initPath: 'manifest',
			name: 'manifest',
			path: '/manifest',
			rendering: { kind: 'static' },
		},
		{
			initPath: 'manifest-ssr',
			name: 'manifest-ssr',
			path: '/manifest-ssr',
			rendering: { kind: 'dynamic' },
		},
		{
			initPath: 'manifest-geo',
			name: 'manifest-geo',
			path: '/manifest-geo',
			rendering: { kind: 'static' },
		},
		{
			initPath: 'ssr-stream',
			name: 'ssr-stream',
			path: '/ssr-stream',
			rendering: { kind: 'dynamic' },
		},
	],
	title: 'Next 15 / App Router / default caching',
});
