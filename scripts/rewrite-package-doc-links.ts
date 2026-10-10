import { posix } from 'node:path';

import { convertMdxToMarkdown } from 'leadtype/convert';
import { defaultRemarkPlugins, remarkInclude } from 'leadtype/remark';

/** Restore includes omitted by leadtype 0.2.1's filtered source mirror. */
export const restorePackageDocIncludes = async (
	markdown: string,
	sourcePath: string
): Promise<string> => {
	const content = markdown.includes('[Error: Could not include file')
		? (
				await convertMdxToMarkdown(sourcePath, [
					remarkInclude,
					...defaultRemarkPlugins,
				])
			).markdown
		: markdown;
	if (content.includes('[Error:')) {
		throw new Error(`Incomplete documentation conversion: ${sourcePath}`);
	}
	return content;
};

const isRootRelative = (url: string): boolean =>
	url.startsWith('/') && !url.startsWith('//');

/**
 * Resolve site documentation URLs to version-matched files when bundled.
 * Pages missing from the package's filtered bundle point at `siteOrigin`,
 * the docs site for the package's release, because c15t.com documents the
 * previous major during a new major's prereleases.
 */
export const packageDocLink = (
	url: string,
	fromFile: string,
	bundledFiles: ReadonlySet<string>,
	siteOrigin: string
): string => {
	const isRelative = url.startsWith('./') || url.startsWith('../');
	if (!isRelative && !/^\/docs(?:\/|[?#]|$)/u.test(url)) {
		// Other site paths, such as /llms-full.txt, do not exist inside the
		// package, so they point at the website.
		return isRootRelative(url) ? new URL(url, siteOrigin).href : url;
	}
	const parsed = new URL(url, `${siteOrigin}/docs/${fromFile}`);
	const route = parsed.pathname.replace(/^\/docs\/?/u, '').replace(/\/$/u, '');
	const target = [
		route.replace(/\.mdx$/u, '.md'),
		route ? `${route}.md` : 'index.md',
		`${route}/index.md`,
	].find((candidate) => bundledFiles.has(candidate));
	if (!target) {
		return isRelative && posix.extname(parsed.pathname) ? url : parsed.href;
	}
	const relative = posix.relative(posix.dirname(fromFile), target);
	return `${relative.startsWith('.') ? relative : `./${relative}`}${parsed.search}${parsed.hash}`;
};

/**
 * Docs site the copyable prompts name. The prompt component copies its text
 * verbatim, so prompts carry absolute URLs that still work once pasted into
 * an agent outside the site.
 */
export const PROMPT_DOCS_ORIGIN = 'https://v3.c15t.com';

const escapeRegExp = (text: string): string =>
	text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

/**
 * Docs paths in prompt text, either root-relative or on
 * {@link PROMPT_DOCS_ORIGIN}. A path starts after whitespace, an opening
 * bracket or a quote, and stops before closing punctuation, so
 * "/docs/upgrade-v3.md." keeps its sentence's full stop. The Markdown
 * converter wraps absolute URLs in angle brackets; the optional groups
 * capture them so a bundled path loses them.
 */
const promptDocPath = new RegExp(
	`(?<=^|[\\s([<'"\`])(<?)((?:${escapeRegExp(PROMPT_DOCS_ORIGIN)})?\\/docs(?:[/?#][^\\s)\\]>'"\`]*?)?)(?=[.,;:!?]*(?:[\\s)\\]>'"\`]|$))(>?)`,
	'gu'
);

/**
 * Rewrite docs paths inside a copyable prompt, such as
 * `https://v3.c15t.com/docs/frameworks/next/upgrade-v3.md`. In a package
 * bundle they become the bundled file, relative to the page holding the
 * prompt, because those docs match the installed version. Absolute URLs to
 * pages outside the bundle stay as written; root-relative paths point at
 * `siteOrigin`.
 */
export const packagePromptLinks = (
	text: string,
	fromFile: string,
	bundledFiles: ReadonlySet<string>,
	siteOrigin: string
): string =>
	text.replace(
		promptDocPath,
		(match, open: string, url: string, close: string) => {
			const absolute = url.startsWith(PROMPT_DOCS_ORIGIN);
			const path = absolute ? url.slice(PROMPT_DOCS_ORIGIN.length) : url;
			const link = packageDocLink(path, fromFile, bundledFiles, siteOrigin);
			if (absolute && !link.startsWith('.')) {
				return match;
			}
			return open && close ? link : `${open}${link}${close}`;
		}
	);

/**
 * Rewrite root-relative links in a package's AGENTS.md, which sits beside
 * its `docs` directory. Bundled pages become `./docs/` paths; anything else
 * points at `siteOrigin`.
 */
export const packageIndexLinks = (
	markdown: string,
	bundledFiles: ReadonlySet<string>,
	siteOrigin: string
): string =>
	markdown.replace(/(?<=\]\()\/(?!\/)[^)\s]*(?=\))/gu, (url) => {
		const link = packageDocLink(url, 'index.md', bundledFiles, siteOrigin);
		return link.startsWith('./') ? `./docs/${link.slice(2)}` : link;
	});
