import { configureConsentManager, createConsentManagerStore } from 'c15t';
import { bench, run } from 'mitata';

// Create store once for condition evaluation benchmarks
const manager = configureConsentManager({ mode: 'offline' });
const store = createConsentManagerStore(manager);
const state = store.getState();

// Simple single consent checks
bench('has() - single consent (measurement)', () => {
	state.has('measurement');
});

bench('has() - single consent (marketing)', () => {
	state.has('marketing');
});

bench('has() - single consent (necessary)', () => {
	state.has('necessary');
});

// AND conditions
bench('has() - AND condition (2 items)', () => {
	state.has({ and: ['measurement', 'marketing'] });
});

bench('has() - AND condition (3 items)', () => {
	state.has({ and: ['measurement', 'marketing', 'functionality'] });
});

bench('has() - AND condition (4 items)', () => {
	state.has({
		and: ['necessary', 'measurement', 'marketing', 'functionality'],
	});
});

bench('has() - AND condition (5 items - all)', () => {
	state.has({
		and: [
			'necessary',
			'measurement',
			'marketing',
			'functionality',
			'experience',
		],
	});
});

// OR conditions
bench('has() - OR condition (2 items)', () => {
	state.has({ or: ['measurement', 'marketing'] });
});

bench('has() - OR condition (3 items)', () => {
	state.has({ or: ['measurement', 'marketing', 'functionality'] });
});

bench('has() - OR condition (5 items - all)', () => {
	state.has({
		or: [
			'necessary',
			'measurement',
			'marketing',
			'functionality',
			'experience',
		],
	});
});

// NOT conditions
bench('has() - NOT condition (single)', () => {
	state.has({ not: 'marketing' });
});

bench('has() - NOT condition (nested)', () => {
	state.has({ not: { and: ['measurement', 'marketing'] } });
});

// Complex nested conditions
bench('has() - nested: AND with OR', () => {
	state.has({
		and: ['necessary', { or: ['measurement', 'marketing'] }],
	});
});

bench('has() - nested: AND with NOT', () => {
	state.has({
		and: ['necessary', { not: 'marketing' }],
	});
});

bench('has() - nested: complex (3 levels)', () => {
	state.has({
		and: [
			'necessary',
			{ or: ['measurement', 'marketing'] },
			{ not: 'functionality' },
		],
	});
});

bench('has() - deeply nested (4 levels)', () => {
	state.has({
		and: [
			'necessary',
			{
				or: [{ and: ['measurement', 'marketing'] }, { not: 'functionality' }],
			},
		],
	});
});

await run();
