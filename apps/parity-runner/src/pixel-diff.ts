/**
 * Cross-framework pixel comparison.
 *
 * The geometry check catches boxes that lay out differently. This catches
 * everything else a box cannot describe: a wrong colour, a missing border,
 * a font that resolved differently, an icon that did not render.
 *
 * It is deliberately loose — a per-channel tolerance and a mismatch budget
 * — because text antialiasing is never identical between two renderers.
 * Different image sizes are not a tolerance question and fail outright.
 */

import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

/** The outcome of one comparison. */
export interface PixelComparison {
	/** Whether the two images are within budget. */
	ok: boolean;
	/** Human-readable failure reason, when `ok` is false. */
	reason?: string;
	/** Pixels that differed beyond the channel tolerance. */
	mismatched: number;
	/** `mismatched` as a share of the image. */
	ratio: number;
	/** A PNG marking the differing pixels, when sizes matched. */
	diff?: Buffer;
}

/** Comparison budget. */
export interface PixelBudget {
	/** Per-channel tolerance, 0-255. */
	threshold: number;
	/** Largest allowed share of differing pixels, 0-1. */
	maxRatio: number;
}

/**
 * Compare two PNG buffers.
 *
 * @param baseline - The React screenshot.
 * @param candidate - The other framework's screenshot.
 * @param budget - Channel tolerance and mismatch budget.
 * @returns The comparison, including a diff image when sizes matched.
 */
export const comparePng = function comparePng(
	baseline: Buffer,
	candidate: Buffer,
	budget: PixelBudget
): PixelComparison {
	const a = PNG.sync.read(baseline);
	const b = PNG.sync.read(candidate);

	if (a.width !== b.width || a.height !== b.height) {
		return {
			mismatched: Number.NaN,
			ok: false,
			ratio: Number.NaN,
			reason: `size ${a.width}x${a.height} ≠ ${b.width}x${b.height}`,
		};
	}

	const diff = new PNG({ height: a.height, width: a.width });
	const mismatched = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
		// pixelmatch's threshold is a 0-1 share of the maximum YIQ distance,
		// not a channel value; the budget is expressed in 0-255 channel terms
		// because that is how a reviewer thinks about "close enough".
		threshold: budget.threshold / 255,
	});
	const ratio = mismatched / (a.width * a.height);

	return {
		diff: PNG.sync.write(diff),
		mismatched,
		ok: ratio <= budget.maxRatio,
		ratio,
		reason:
			ratio <= budget.maxRatio
				? undefined
				: `${mismatched} px differ (${(ratio * 100).toFixed(2)}% > ${(
						budget.maxRatio * 100
					).toFixed(2)}%)`,
	};
};
