import { describe, expect, it } from 'vitest';

import {
	applySurfaceParams,
	demoExperiment,
	EMPTY_SURFACE,
	parseSurfaceParams,
	setSurfaceVariant,
	surfacePositionOptions,
	withSurface,
} from './prompt-surface';

describe('prompt surface params', () => {
	it('reads a valid variant, position and blocking flag', () => {
		expect(
			parseSurfaceParams(
				new URLSearchParams('variant=bar&position=top&blocking=1')
			)
		).toEqual({
			...EMPTY_SURFACE,
			blocking: true,
			position: 'top',
			variant: 'bar',
		});
		expect(parseSurfaceParams(new URLSearchParams(''))).toEqual(EMPTY_SURFACE);
	});

	it('reads the experiment flag and a forced arm', () => {
		expect(parseSurfaceParams(new URLSearchParams('experiment=1'))).toEqual({
			...EMPTY_SURFACE,
			experiment: true,
		});
		expect(
			parseSurfaceParams(new URLSearchParams('experiment=1&arm=bar'))
		).toEqual({ ...EMPTY_SURFACE, arm: 'bar', experiment: true });
		// An unknown arm is dropped; an arm without the experiment is ignored.
		expect(
			parseSurfaceParams(new URLSearchParams('experiment=1&arm=wall'))
		).toEqual({ ...EMPTY_SURFACE, experiment: true });
		expect(parseSurfaceParams(new URLSearchParams('arm=bar'))).toEqual(
			EMPTY_SURFACE
		);
		expect(
			applySurfaceParams(new URLSearchParams('arm=bar'), {
				...EMPTY_SURFACE,
				arm: 'bar',
				experiment: true,
			}).toString()
		).toBe('experiment=1&arm=bar');
		expect(
			applySurfaceParams(new URLSearchParams('experiment=1&arm=bar'), {
				...EMPTY_SURFACE,
				arm: 'bar',
			}).toString()
		).toBe('');
	});

	it('builds the demo experiment only when asked', () => {
		expect(demoExperiment(EMPTY_SURFACE)).toBeUndefined();
		const picked = demoExperiment({ ...EMPTY_SURFACE, experiment: true });
		expect(picked?.id).toBe('banner-shape');
		// c15t picks the arm when the URL names none.
		expect(picked).not.toHaveProperty('arm');
		// `control` is the base presentation, so it is never listed in `arms`.
		expect(Object.keys(picked?.arms ?? {})).toEqual(['bar']);
		expect(
			demoExperiment({ ...EMPTY_SURFACE, arm: 'bar', experiment: true })?.arm
		).toBe('bar');
		expect(
			demoExperiment({ ...EMPTY_SURFACE, arm: 'control', experiment: true })
				?.arm
		).toBe('control');
	});

	it('keeps the bar arm valid for an opt-out notice prompt', () => {
		const forced = demoExperiment({
			...EMPTY_SURFACE,
			arm: 'bar',
			experiment: true,
		});
		// A notice is never blocking and cannot use `wall`, so the arm under
		// test is a bottom bar, which both `choice` and `notice` accept.
		expect(forced?.arms.bar).toEqual({
			prompt: { position: 'bottom', variant: 'bar' },
		});
		expect(forced?.arms.bar?.prompt?.blocking).toBeUndefined();
	});

	it('drops unknown variants and positions the variant does not accept', () => {
		// An unknown variant is dropped; the position survives on its own
		// because some variant accepts it and the resolver validates the pair.
		expect(
			parseSurfaceParams(new URLSearchParams('variant=sheet&position=center'))
		).toEqual({ ...EMPTY_SURFACE, position: 'center' });
		expect(
			parseSurfaceParams(new URLSearchParams('variant=bar&position=middle'))
		).toEqual({ ...EMPTY_SURFACE, variant: 'bar' });
		expect(
			parseSurfaceParams(new URLSearchParams('variant=widget&position=top'))
		).toEqual({ ...EMPTY_SURFACE, variant: 'widget' });
		expect(
			parseSurfaceParams(new URLSearchParams('position=bottom-center'))
		).toEqual({ ...EMPTY_SURFACE, position: 'bottom-center' });
		expect(parseSurfaceParams(new URLSearchParams('blocking=true'))).toEqual(
			EMPTY_SURFACE
		);
	});

	it('round-trips through search params and clears stale keys', () => {
		const params = applySurfaceParams(
			new URLSearchParams('country=DE&variant=wall&position=center'),
			{ ...EMPTY_SURFACE, blocking: true, position: 'bottom', variant: 'bar' }
		);
		expect(params.toString()).toBe(
			'country=DE&variant=bar&position=bottom&blocking=1'
		);
		expect(
			applySurfaceParams(
				new URLSearchParams('variant=bar'),
				EMPTY_SURFACE
			).toString()
		).toBe('');
	});

	it('narrows positions when the variant changes', () => {
		const floating = setSurfaceVariant(
			{ ...EMPTY_SURFACE, position: 'bottom-right' },
			'floating'
		);
		expect(floating.position).toBe('bottom-right');
		expect(setSurfaceVariant(floating, 'bar').position).toBe('');
		expect(setSurfaceVariant(floating, 'widget').position).toBe('bottom-right');
		expect(surfacePositionOptions('wall')).toEqual(['center']);
		expect(surfacePositionOptions('')).toEqual([]);
	});

	it('layers the surface over a scenario presentation', () => {
		const base = { prompt: { layout: ['accept', 'reject'] } } as const;
		expect(withSurface(base, EMPTY_SURFACE)).toBe(base);
		expect(withSurface(undefined, EMPTY_SURFACE)).toBeUndefined();
		expect(
			withSurface(base, {
				...EMPTY_SURFACE,
				blocking: true,
				position: 'top',
				variant: 'bar',
			})
		).toEqual({
			prompt: {
				blocking: true,
				layout: ['accept', 'reject'],
				position: 'top',
				variant: 'bar',
			},
		});
	});
});
