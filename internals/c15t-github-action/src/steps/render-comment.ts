import {
	ASCII_SET,
	BRAILLE_SPACE,
	LEFT_PAD,
	type WeightedAsciiArt,
} from './ascii-art';
import { FIRST_TIME_CONTRIBUTOR_ASCII } from './first-commit';

type RenderCommentOptions = {
	debug?: boolean;
	seed?: string;
	firstContribution?: boolean;
	status?: string;
};

function pickWeightedAscii(
	choices: readonly WeightedAsciiArt[],
	seed?: string
): string {
	let total = 0;
	for (const c of choices) {
		const w = Math.max(0, c.weight);
		total += w;
	}
	if (total <= 0) {
		if (choices[0]?.art) {
			return choices[0].art;
		}
		return '';
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
	const lastChoice = choices.at(-1);
	if (lastChoice?.art) {
		return lastChoice.art;
	}
	return '';
}

/**
 * Renders the Markdown body for the sticky docs deployment comment.
 *
 * Includes optional first-time contributor content, a docs preview table with
 * status and an updated timestamp, and a footer attribution.
 *
 * @param url - The preview URL to link in the Docs Preview table.
 * @param options - Rendering options (debug, seed, firstContribution, status).
 * @returns The rendered Markdown string.
 * @internal
 * @example
 * const md = renderCommentMarkdown('https://vercel.app/preview', {
 *   status: 'Ready',
 *   firstContribution: false,
 * });
 */
/**
 * Render a deterministic, branded Markdown block for docs-preview comments.
 *
 * The output is wrapped with auto-generated markers using `header`:
 * `<!-- c15t:{header}:START --> ... <!-- c15t:{header}:END -->`
 *
 * - When `firstContribution` is true, a special ASCII art banner is shown.
 * - When `debug` is true, renders all available ASCII variants.
 * - `seed` ensures deterministic ASCII selection for the same input.
 *
 * @param url - The preview URL to include in the comment.
 * @param options - Rendering options.
 * @returns The complete Markdown string with start/end markers.
 * @example
 * renderCommentMarkdown('https://example.vercel.app', { seed: 'abc123' });
 */
export function renderCommentMarkdown(
	url: string,
	options?: RenderCommentOptions
): string {
	const updated = new Date().toUTCString();
	let status = 'Ready';
	if (options?.status) {
		status = options.status;
	}

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
		"> This is your first contribution to c15t, and I just wanted to say thank you. You're helping us build the best developer-first consent infrastructure. Here's to many more commits ahead! 🚀 ",
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
	}) => {
		const lines: string[] = [];
		lines.push('```');
		let artBlock = art;
		if (firstContribution) {
			artBlock = FIRST_TIME_CONTRIBUTOR_ASCII;
		}
		lines.push(formatArt(artBlock));
		lines.push('```');
		lines.push('');
		if (firstContribution) {
			lines.push(firstTimeContributorMessage.join('\n'));
		}
		if (url && updated) {
			lines.push(previewMessage.join('\n'));
		}
		lines.push('');
		lines.push('---');
		lines.push(
			'Baked with 💙 by [Consent](https://consent.io), powered by our ' +
				'completely necessary but very fun deployment comment system.'
		);
		return lines.join('\n');
	};

	if (options?.debug) {
		return ASCII_SET.map((a) =>
			messageTemplate({ art: a.art, url, updated })
		).join('\n\n');
	}
	let seed = url;
	if (options?.seed) {
		seed = options.seed;
	}
	const inner = messageTemplate({
		art: pickWeightedAscii(ASCII_SET, seed),
		url,
		updated,
		firstContribution: options?.firstContribution,
	});
	return inner;
}
