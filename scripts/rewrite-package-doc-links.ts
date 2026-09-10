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

/** Resolve site documentation URLs to version-matched files when bundled. */
export const packageDocLink = (
	url: string,
	fromFile: string,
	bundledFiles: ReadonlySet<string>
): string => {
	const isRelative = url.startsWith('./') || url.startsWith('../');
	if (!isRelative && !/^\/docs(?:\/|[?#]|$)/u.test(url)) {
		return url;
	}
	const parsed = new URL(url, `https://c15t.com/docs/${fromFile}`);
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
