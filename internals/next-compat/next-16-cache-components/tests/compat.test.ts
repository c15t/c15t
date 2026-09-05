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
			rendering: { kind: 'partial' },
		},
		{
			initPath: 'client',
			name: 'cached',
			path: '/cached',
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
			rendering: { kind: 'partial' },
		},
	],
	title: 'Next 16 / App Router / cacheComponents',
});
