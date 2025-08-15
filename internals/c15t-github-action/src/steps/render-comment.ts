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
		status?: string;
		header?: string;
	}
): string {
	const updated = new Date().toUTCString();
	const status = options?.status || 'Ready';
	const headerKey = (options?.header || 'c15t-docs-preview').trim() || 'c15t-docs-preview';
	const startAuto = `<!-- c15t:${headerKey}:START -->`;
	const endAuto = `<!-- c15t:${headerKey}:END -->`;

	const formatArt = (ascii: string) => {
		const asciiWithBrailleSpaces = ascii.replace(/ /g, BRAILLE_SPACE);
		const pad = LEFT_PAD;

		return asciiWithBrailleSpaces
			.split('\n')
			.map((l) => `${pad}${l}`)
			.join('\n');
	};

	const firstTimeContributorMessage = [
		'<br/>',
		'> 🎉 **Your first c15t commit!**',
		'> ',
		'> This is your first contribution to c15t, and I just wanted to say thank you. You’re helping us build the best developer-first consent infrastructure. Here’s to many more commits ahead! 🚀 ',
		'> ',
		'> Christopher, Author of c15t, [@burnedchris](https://x.com/burnedchris)',
		'',
	];

	const previewMessage = [
		'### Docs Preview',
		'| Preview | Status | Updated (UTC) |',
		'| - | - | - |',
		`| [Open Preview](${url}) | ${status} | ${updated} |`,
	];
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
			'',
			...(firstContribution ? [firstTimeContributorMessage.join('\n')] : []),
			...(url && updated ? [previewMessage.join('\n')] : []),
			'',
			'---',
			'Baked with 💙 by [Consent](https://consent.io), powered by our completely necessary but very fun deployment comment system.',
		]
			.filter(Boolean)
			.join('\n');

	if (options?.debug) {
		return ASCII_SET.map((a) =>
			messageTemplate({ art: a.art, url, updated })
		).join('\n\n');
	}
	const inner = messageTemplate({
		art: pickWeightedAscii(Array.from(ASCII_SET), options?.seed ?? url),
		url,
		updated,
		firstContribution: options?.firstContribution,
	});
	return [startAuto, inner, endAuto].join('\n');
}
