import { htmlPage, PREFERENCES_LINK } from './javascript.ts';
import type { BoilerplateOptions, BoilerplateTemplate } from './types.ts';

const escapeAttribute = (value: string): string =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('"', '&quot;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;');

/**
 * The script tag that loads `c15t.js` from the backend.
 * @param backendURL Validated backend URL.
 * @returns The tag, one attribute per line.
 */
export const scriptTag = (backendURL: string): string => `<script
	src="${escapeAttribute(`${backendURL.replace(/\/+$/u, '')}/c15t.js`)}"
	defer
></script>`;

/**
 * Vendors with a script-tag example: the vendor's own snippet, saved as a
 * file on the site and held until its category is allowed.
 */
const VENDOR_TAGS: Record<string, { name: string; category: string }> = {
	posthog: { category: 'measurement', name: 'PostHog' },
};

const vendorTag = (script: string): string => {
	const vendor = VENDOR_TAGS[script];
	if (!vendor) {
		throw new Error(
			`The script tag has no ${script} integration. Gate its snippet by changing the tag's type to text/plain and adding data-c15t-category.`
		);
	}
	return `<!-- ${vendor.name}'s snippet, saved as a file on your site -->
<script
	type="text/plain"
	data-c15t-category="${vendor.category}"
	src="/${script}.js"
></script>`;
};

/**
 * Generate the script-tag quickstart: `c15t.js` in `<head>` and a privacy
 * settings link in `<body>`. Hosted mode only, because the backend serves
 * `c15t.js`.
 * @param options Backend URL.
 * @returns `index.html` for a project without one, and how to add the
 * snippets to an existing page.
 * @throws {Error} In offline mode, or for a vendor without a script-tag example.
 */
export const generateHtmlBoilerplate = (
	options: BoilerplateOptions
): BoilerplateTemplate => {
	if (options.mode !== 'hosted' || !options.backendURL) {
		throw new Error(
			'The script tag loads c15t.js from your backend. Generate it in hosted mode with --backend-url.'
		);
	}
	const tag = [
		scriptTag(options.backendURL),
		...options.scripts.map(vendorTag),
	].join('\n');
	const indented = tag
		.split('\n')
		.map((line) => `\t\t${line}`)
		.join('\n');
	return {
		dependencies: [],
		files: {
			'index.html': htmlPage('c15t with a script tag', `${indented}\n`, ''),
		},
		instructions: [
			'To hold another vendor script until consent, change its tag to type="text/plain" and add data-c15t-category, such as data-c15t-category="measurement".',
			...options.scripts.map(
				(script) =>
					`Save ${VENDOR_TAGS[script]?.name ?? script}'s snippet as /${script}.js on your site.`
			),
		],
		merge: {
			'index.html': {
				// Each snippet on its own: a page may already load c15t.js
				// without the preferences link, or the other way round.
				inserts: [
					{ before: '</head>', content: tag, marker: '/c15t.js' },
					{
						before: '</body>',
						content: PREFERENCES_LINK,
						marker: '#c15t-preferences',
					},
				],
				type: 'insert',
			},
		},
	};
};
