/**
 * The contract's rerender rule, as a regression test.
 *
 * The same probe tree the `rerenders_per_*` rows measure: four subscribed
 * components, one consent change that moves a single slice, and one event that
 * moves none of them. One render per component on the change is the ceiling;
 * zero is required on the unchanged event.
 */

import { describe, expect, it } from 'vitest';

import { measureRerenders } from '../measure/rerender';

const result = await measureRerenders();

describe('rerenders per consent change', () => {
	it('mounts more than one subscribed component, so the count means something', () => {
		expect(result.components).toBeGreaterThanOrEqual(4);
	});

	it('stays at one render per component', () => {
		expect(result.consentChange.maxRenders).toBeLessThanOrEqual(1);
	});

	it('leaves a component whose slice did not move alone', () => {
		expect(result.consentChange.perComponent.measurement).toBe(0);
		expect(result.consentChange.perComponent.marketing).toBe(1);
	});
});

describe('rerenders per unchanged snapshot event', () => {
	it('renders nobody when no selected slice moved', () => {
		expect(result.unchangedEvent.maxRenders).toBe(0);
	});
});

describe('snapshot objects across state changes', () => {
	// The run settles on three revisions. One object per revision is correct; an
	// object per read would be a much larger number, and that claim belongs to
	// the `snapshot_object_identities` row, which reads one state many times.
	it('builds one object per state the run passes through', () => {
		expect(result.distinctSnapshotsAcrossStates).toBe(3);
	});

	it('pulls from native once per state rather than once per read', () => {
		expect(result.nativeSnapshotCalls).toBeLessThanOrEqual(3);
	});
});
