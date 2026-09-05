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
			initPath: 'prefetch',
			name: 'prefetch',
			path: '/prefetch',
			rendering: { kind: 'static' },
		},
		{
			initPath: 'ssr',
			name: 'ssr',
			path: '/ssr',
			rendering: { kind: 'dynamic' },
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
	],
	title: 'Next 15 / Pages Router',
});
