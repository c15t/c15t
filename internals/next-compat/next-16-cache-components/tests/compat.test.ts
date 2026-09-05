import { defineCompatSuite } from '@c15t/next-compat-shared/suite';

defineCompatSuite({
	scenarios: [
		{
			initPath: 'client',
			name: 'client',
			path: '/client',
			rendering: { kind: 'static' },
		},
		{
			initPath: 'prefetch',
			name: 'prefetch',
			path: '/prefetch',
			rendering: { kind: 'static' },
		},
		{
			initPath: 'ssr',
			name: 'ssr',
			path: '/ssr',
			rendering: { kind: 'partial' },
		},
		{
			initPath: 'prefetch',
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
