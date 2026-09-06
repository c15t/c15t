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
			country: null,
			initPath: 'static-manifest',
			name: 'static-manifest',
			path: '/static-manifest',
			rendering: { kind: 'static' },
		},
	],
	title: 'Next 16 / App Router / output: export',
});
