import { createConsentKernel, has } from '@c15t/core';

import { bench, runMicroBenchmarkSuite } from './wrapper';

const kernel = createConsentKernel();
const consents = { ...kernel.getSnapshot().effectivePermissions };

// Simple single consent checks
bench('has() - single consent (measurement)', () => {
	has('measurement', consents);
});

bench('has() - single consent (marketing)', () => {
	has('marketing', consents);
});

bench('has() - single consent (necessary)', () => {
	has('necessary', consents);
});

// AND conditions
bench('has() - AND condition (2 items)', () => {
	has({ and: ['measurement', 'marketing'] }, consents);
});

bench('has() - AND condition (3 items)', () => {
	has({ and: ['measurement', 'marketing', 'functionality'] }, consents);
});

bench('has() - AND condition (4 items)', () => {
	has(
		{
			and: ['necessary', 'measurement', 'marketing', 'functionality'],
		},
		consents
	);
});

bench('has() - AND condition (5 items - all)', () => {
	has(
		{
			and: [
				'necessary',
				'measurement',
				'marketing',
				'functionality',
				'experience',
			],
		},
		consents
	);
});

// OR conditions
bench('has() - OR condition (2 items)', () => {
	has({ or: ['measurement', 'marketing'] }, consents);
});

bench('has() - OR condition (3 items)', () => {
	has({ or: ['measurement', 'marketing', 'functionality'] }, consents);
});

bench('has() - OR condition (5 items - all)', () => {
	has(
		{
			or: [
				'necessary',
				'measurement',
				'marketing',
				'functionality',
				'experience',
			],
		},
		consents
	);
});

// NOT conditions
bench('has() - NOT condition (single)', () => {
	has({ not: 'marketing' }, consents);
});

bench('has() - NOT condition (nested)', () => {
	has({ not: { and: ['measurement', 'marketing'] } }, consents);
});

// Complex nested conditions
bench('has() - nested: AND with OR', () => {
	has(
		{
			and: ['necessary', { or: ['measurement', 'marketing'] }],
		},
		consents
	);
});

bench('has() - nested: AND with NOT', () => {
	has(
		{
			and: ['necessary', { not: 'marketing' }],
		},
		consents
	);
});

bench('has() - nested: complex (3 levels)', () => {
	has(
		{
			and: [
				'necessary',
				{ or: ['measurement', 'marketing'] },
				{ not: 'functionality' },
			],
		},
		consents
	);
});

bench('has() - deeply nested (4 levels)', () => {
	has(
		{
			and: [
				'necessary',
				{
					or: [{ and: ['measurement', 'marketing'] }, { not: 'functionality' }],
				},
			],
		},
		consents
	);
});

await runMicroBenchmarkSuite('has-condition');

kernel.dispose();
