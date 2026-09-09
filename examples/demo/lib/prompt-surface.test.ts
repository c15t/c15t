import { describe, expect, it } from 'vitest';

import {
	applySurfaceParams,
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
		).toEqual({ blocking: true, position: 'top', variant: 'bar' });
		expect(parseSurfaceParams(new URLSearchParams(''))).toEqual(EMPTY_SURFACE);
	});

	it('drops unknown variants and positions the variant does not accept', () => {
		// An unknown variant is dropped; the position survives on its own
		// because some variant accepts it and the resolver validates the pair.
		expect(
			parseSurfaceParams(new URLSearchParams('variant=sheet&position=center'))
		).toEqual({ blocking: false, position: 'center', variant: '' });
		expect(
			parseSurfaceParams(new URLSearchParams('variant=bar&position=middle'))
		).toEqual({ blocking: false, position: '', variant: 'bar' });
		expect(
			parseSurfaceParams(new URLSearchParams('variant=widget&position=top'))
		).toEqual({ blocking: false, position: '', variant: 'widget' });
		expect(
			parseSurfaceParams(new URLSearchParams('position=bottom-center'))
		).toEqual({ blocking: false, position: 'bottom-center', variant: '' });
		expect(parseSurfaceParams(new URLSearchParams('blocking=true'))).toEqual(
			EMPTY_SURFACE
		);
	});

	it('round-trips through search params and clears stale keys', () => {
		const params = applySurfaceParams(
			new URLSearchParams('country=DE&variant=wall&position=center'),
			{ blocking: true, position: 'bottom', variant: 'bar' }
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
			withSurface(base, { blocking: true, position: 'top', variant: 'bar' })
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
