import {
	ASCII_SET,
	BRAILLE_SPACE,
	LEFT_PAD,
	type WeightedAsciiArt,
} from './ascii-art';

function pickWeightedAscii(choices: WeightedAsciiArt[], seed?: string): string {
	let total = 0;
	for (const c of choices) {
		const w = Math.max(0, c.weight);
		total += w;
	}
	if (total <= 0) {
		return choices[0]?.art || '';
	}
	// Deterministic fallback when a seed is provided (FNV-1a style hash)
	let r: number;
	if (seed) {
		let h = 2166136261 >>> 0;
		for (let i = 0; i < seed.length; i++) {
			h ^= seed.charCodeAt(i);
			// h *= 16777619 (using shifts to avoid bigint)
			h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
		}
		// Map uniformly to [0, total) using 32-bit range (avoids modulo bias)
		r = (h / 0x100000000) * total;
	} else {
		r = Math.random() * total;
	}
	let acc = 0;
	for (const c of choices) {
		const w = Math.max(0, c.weight);
		acc += w;
		if (r < acc) {
			return c.art;
		}
	}
	return choices.at(-1)?.art || '';
}

export function buildDefaultPreviewComment(
	url: string,
	options?: { debug?: boolean; seed?: string }
): string {
	const updated = new Date().toUTCString();

	const formatArt = (ascii: string) => {
		const asciiWithBrailleSpaces = ascii.replace(/ /g, BRAILLE_SPACE);
		const pad = LEFT_PAD;

		return asciiWithBrailleSpaces
			.split('\n')
			.map((l) => `${pad}${l}`)
			.join('\n');
	};

	if (options?.debug) {
		return [
			'```',
			ASCII_SET.map((a) => formatArt(a.art)).join('\n\n'),
			'```',
			'| Preview | Status | Updated (UTC) |',
			'| - | - | - |',
			`| [Open Preview](${url}) | Ready | ${updated} |`,
		].join('\n');
	}
	return [
		'```',
		formatArt(pickWeightedAscii(ASCII_SET, options?.seed ?? url)),
		'```',
		'| Preview | Status | Updated (UTC) |',
		'| - | - | - |',
		`| [Open Preview](${url}) | Ready | ${updated} |`,
	].join('\n');
}
