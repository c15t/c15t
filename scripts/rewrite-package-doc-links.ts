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

/** Website that serves pages missing from a package's filtered bundle. */
const SITE_ORIGIN = 'https://c15t.com';

const isRootRelative = (url: string): boolean =>
	url.startsWith('/') && !url.startsWith('//');

/** Resolve site documentation URLs to version-matched files when bundled. */
export const packageDocLink = (
	url: string,
	fromFile: string,
	bundledFiles: ReadonlySet<string>
): string => {
	const isRelative = url.startsWith('./') || url.startsWith('../');
	if (!isRelative && !/^\/docs(?:\/|[?#]|$)/u.test(url)) {
		// Other site paths, such as /llms-full.txt, do not exist inside the
		// package, so they point at the website.
		return isRootRelative(url) ? new URL(url, SITE_ORIGIN).href : url;
	}
	const parsed = new URL(url, `${SITE_ORIGIN}/docs/${fromFile}`);
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
 * Root-relative docs paths in prompt text. A path starts after whitespace,
 * an opening bracket or a quote, and stops before closing punctuation, so
 * "/docs/upgrade-v3.md." keeps its sentence's full stop.
 */
const promptDocPath =
	/(?<=^|[\s([<'"`])\/docs(?:[/?#][^\s)\]>'"`]*?)?(?=[.,;:!?]*(?:[\s)\]>'"`]|$))/gu;

/**
 * Rewrite root-relative docs paths inside a copyable prompt, such as
 * `/docs/frameworks/next/upgrade-v3.md`. The docs site resolves them against
 * its own origin. In a package bundle they become the bundled file, relative
 * to the page holding the prompt, because those docs match the installed
 * version. Pages outside the bundle point at the website.
 */
export const packagePromptLinks = (
	text: string,
	fromFile: string,
	bundledFiles: ReadonlySet<string>
): string =>
	text.replace(promptDocPath, (path) =>
		packageDocLink(path, fromFile, bundledFiles)
	);

/**
 * Rewrite root-relative links in a package's AGENTS.md, which sits beside
 * its `docs` directory. Bundled pages become `./docs/` paths; anything else
 * points at the website.
 */
export const packageIndexLinks = (
	markdown: string,
	bundledFiles: ReadonlySet<string>
): string =>
	markdown.replace(/(?<=\]\()\/(?!\/)[^)\s]*(?=\))/gu, (url) => {
		const link = packageDocLink(url, 'index.md', bundledFiles);
		return link.startsWith('./') ? `./docs/${link.slice(2)}` : link;
	});
