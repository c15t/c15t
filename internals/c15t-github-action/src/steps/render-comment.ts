import {
	ASCII_SET,
	BRAILLE_SPACE,
	LEFT_PAD,
	type WeightedAsciiArt,
} from './ascii-art';
import { FIRST_TIME_CONTRIBUTOR_ASCII } from './first-commit';

export type RenderCommentOptions = {
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
 * Render a deterministic, branded Markdown block for docs-preview comments.
 *
 * - When `firstContribution` is true, a special ASCII art banner is shown.
 * - When `debug` is true, renders all available ASCII variants.
 * - `seed` ensures deterministic ASCII selection for the same input.
 *
 * @param url - The preview URL to include in the comment.
 * @param options - Rendering options.
 * @returns The complete Markdown string.
 * @internal
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
		'> This is your first contribution to c15t, and I just wanted to say ' +
			'thank you. You’re helping us build the best developer-first consent ' +
			'infrastructure. Here’s to many more commits ahead! 🚀 ',
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
		// Share section (inspired by CodeRabbit share block)
		lines.push('<details>');
		lines.push('<summary>💙 Share your contribution on social media</summary>');
		lines.push('');
		const shareBase =
			'I just contributed to c15t.com, the fastest open-source cookie ' +
			'banner on the web. Fully developer-first, beating every major CMP ' +
			'in benchmarks and free for everyone to use or self-host. Check it ' +
			'out: github.com/c15t/c15t';
		const shareTextEncoded = encodeURIComponent(
			url ? `${shareBase} ${url}` : shareBase
		);
		const shareUrlParam = encodeURIComponent(url ?? 'https://c15t.com');
		lines.push(
			`- [X](https://twitter.com/intent/tweet?text=${shareTextEncoded})`
		);
		lines.push(
			`- [Mastodon](https://mastodon.social/share?text=${shareTextEncoded})`
		);
		lines.push(
			`- [Reddit](https://www.reddit.com/submit?title=Fastest%20open-source%20cookie%20banner%20-%20c15t&text=${shareTextEncoded})`
		);
		lines.push(
			`- [LinkedIn](https://www.linkedin.com/sharing/share-offsite/?url=${shareUrlParam}&mini=true&title=Fastest%20open%20source%20cookie%20banner%20-%20c15t&summary=${shareTextEncoded})`
		);
		lines.push('');
		lines.push('</details>');
		lines.push('');
		lines.push('<details>');
		lines.push('<summary>🪧 Documentation and Community</summary>');
		lines.push('');
		lines.push(
			'- Visit our [Documentation](https://c15t.com/docs) for detailed information on how to use c15t.'
		);
		lines.push(
			'- Join our [Discord Community](https://c15t.link/discord) to get help, request features, and share feedback.'
		);
		lines.push(
			'- Follow us on [X](https://twitter.com/consentdotio) for updates and announcements.'
		);
		lines.push('');
		lines.push('</details>');
		lines.push('');
		lines.push('---');
		lines.push(
			'***Baked with 💙 by [Consent](https://consent.io?ref=c15t-github-comment), powered by COOKIE***'
		);
		lines.push('(Consent Oversees Our Key Integration Events)');
		lines.push('because every CI needs a snack.');
		lines.push('');
		return lines.join('\n');
	};

	if (options?.debug) {
		return ASCII_SET.map((a) =>
			messageTemplate({ art: a.art, url, updated })
		).join('\n\n');
	}

	const inner = messageTemplate({
		art: pickWeightedAscii(ASCII_SET, options?.seed ?? url),
		url,
		updated,
		firstContribution: options?.firstContribution,
	});
	return inner;
}
