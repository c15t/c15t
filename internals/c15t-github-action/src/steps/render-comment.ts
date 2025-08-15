import {
	ASCII_SET,
	BRAILLE_SPACE,
	LEFT_PAD,
	type WeightedAsciiArt,
} from './ascii-art';
import { FIRST_TIME_CONTRIBUTOR_ASCII } from './first-commit';

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

export function renderCommentMarkdown(
	url: string,
	options?: {
		debug?: boolean;
		seed?: string;
		firstContribution?: boolean;
	}
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

	const messageTemplate = ({
		art,
		url,
		updated,
		firstContribution,
	}: {
		art: string;
		url?: string;
		updated?: string;
		firstContribution?: boolean;
	}) =>
		[
			'```',
			formatArt(firstContribution ? FIRST_TIME_CONTRIBUTOR_ASCII : art),
			'```',
			firstContribution && '> 🎉 **Your first c15t commit!**',
			firstContribution &&
				'> This is your first contribution to c15t, and I just wanted to say thank you. You’re helping us get closer to building the best developer-first consent infrastructure. Here’s to many more commits ahead! 🚀 ',
			firstContribution && '>',
			firstContribution &&
				'> Christopher, [@burnedchris](https://x.com/burnedchris)',
			url && updated && '| Preview | Status | Updated (UTC) |',
			url && updated && '| - | - | - |',
			url && updated && `| [Open Preview](${url}) | Ready | ${updated} |`,
			'```',
			'Baked with 💙 by [Consent](https://consent.io), powered by our completely unnecessary but very fun deployment comment system.',
		].join('\n');

	if (options?.debug) {
		return ASCII_SET.map((a) =>
			messageTemplate({ art: a.art, url, updated })
		).join('\n\n');
	}
	return messageTemplate({
		art: pickWeightedAscii(Array.from(ASCII_SET), options?.seed ?? url),
		url,
		updated,
		firstContribution: options?.firstContribution,
	});
}
