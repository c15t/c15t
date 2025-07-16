'use client';
import { Link, usePathname } from 'fumadocs-core/framework';
import type {
	PageTree,
	TOCItemType,
	TableOfContents,
} from 'fumadocs-core/server';
import { AnchorProvider, useActiveAnchors } from 'fumadocs-core/toc';
import { useTreeContext } from 'fumadocs-ui/contexts/tree';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import type { DocumentPaginationProps } from '../pagination';

interface DocsPageProps {
	toc?: TableOfContents;
	full?: boolean;
	children: ReactNode;
	pagination?: DocumentPaginationProps;
}

/**
 * Breadcrumb navigation component for documentation pages
 */
export function DocsBreadcrumb() {
	const pathname = usePathname();

	const breadcrumbs = useMemo(() => {
		const segments: Array<{ name: string; url: string; isActive: boolean }> = [
			{ name: 'Home', url: '/', isActive: false },
		];

		// Parse the pathname to build breadcrumbs
		const pathSegments = pathname.split('/').filter(Boolean);

		if (pathSegments.length > 0) {
			// Add intermediate segments
			for (let i = 0; i < pathSegments.length - 1; i++) {
				const segment = pathSegments[i];
				const url = `/${pathSegments.slice(0, i + 1).join('/')}`;
				segments.push({
					name: segment.charAt(0).toUpperCase() + segment.slice(1),
					url,
					isActive: false,
				});
			}

			// Add current page
			const currentSegment = pathSegments[pathSegments.length - 1];
			segments.push({
				name: currentSegment.charAt(0).toUpperCase() + currentSegment.slice(1),
				url: pathname,
				isActive: true,
			});
		}

		return segments;
	}, [pathname]);

	return (
		<div className="order-first">
			<nav aria-label="Breadcrumb">
				<ol className="flex items-center gap-1 text-base-500 text-xs dark:text-base-300">
					{breadcrumbs.map((crumb, index) => (
						<li key={crumb.url} className="flex items-center gap-1">
							{index > 0 && (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="icon icon-tabler icons-tabler-outline icon-tabler-chevron-right size-3"
									aria-hidden="true"
								>
									<path stroke="none" d="M0 0h24v24H0z" fill="none" />
									<path d="M9 6l6 6l-6 6" />
								</svg>
							)}
							{crumb.isActive ? (
								<span className="text-accent-500 capitalize dark:text-accent-400">
									{crumb.name}
								</span>
							) : (
								<a
									href={crumb.url}
									className="capitalize hover:text-accent-600"
								>
									{crumb.name}
								</a>
							)}
						</li>
					))}
				</ol>
			</nav>
			<p className="mt-1 flex items-center gap-2 font-medium font-mono text-base-400 text-xs">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="icon size-4"
					aria-hidden="true"
				>
					<path stroke="none" d="M0 0h24v24H0z" fill="none" />
					<path d="M6 6v6a3 3 0 0 0 3 3h10l-4 -4m0 8l4 -4" />
				</svg>
				Last updated:{' '}
				{new Date().toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric',
				})}
			</p>
		</div>
	);
}

export function DocsPage({ toc = [], pagination, ...props }: DocsPageProps) {
	return (
		<div className="mx-auto 2xl:max-w-6xl">
			<article>
				<AnchorProvider toc={toc}>
					<div className="flex flex-col lg:flex-row lg:divide-x lg:divide-base-200 dark:divide-base-800">
						<div className="flex-1">
							<div className="relative">
								<div className="relative flex h-full flex-col gap-24 bg-white p-8 lg:gap-32 dark:bg-base-900">
									{props.children}
								</div>
							</div>
							<div id="markdown-content">
								<div className="prose prose-base prose-pre:scrollbar-hide prose-pre:scrollbar-hide prose-pre:relative prose-pre:my-0 max-w-none prose-headings:scroll-mt-24 prose-pre:overflow-y-hidden prose-pre:rounded-xl prose-img:border prose-hr:border-base-300 prose-img:border-base-200 prose-pre:border-none px-8 py-4 prose-blockquote:font-normal prose-headings:font-medium prose-strong:font-medium prose-a:text-accent-500 prose-blockquote:text-base-500 prose-headings:text-base-900 text-base-500 prose-blockquote:tracking-normal prose-pre:outline-base-200 prose-a:duration-200 prose-pre:selection:bg-accent-600/10 prose-pre:selection:text-base-900 hover:prose-a:text-accent-500 dark:prose-blockquote:border-base-500 dark:prose-hr:border-base-700 dark:prose-img:border-base-700 dark:prose-thead:border-base-700 dark:prose-tr:border-base-700 dark:prose-blockquote:text-base-600 dark:prose-code:text-white dark:prose-headings:text-white dark:prose-strong:text-white dark:text-base-400 dark:prose-pre:outline-base-800 dark:prose-pre:selection:text-white">
									{/* Content will be rendered here */}
								</div>
							</div>
							<div className="border-base-200 border-t p-8 dark:border-base-800">
								<div className="gap-2 space-y-4">
									<button
										id="copy-markdown"
										type="button"
										className="flex w-full items-center gap-2 text-left text-base-900 text-xs hover:text-accent-600 dark:text-white"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
											strokeLinejoin="round"
											className="icon size-4 text-base-900 dark:text-white"
											aria-hidden="true"
										>
											<path stroke="none" d="M0 0h24v24H0z" fill="none" />
											<path d="M3 5m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" />
											<path d="M7 15v-6l2 2l2 -2v6" />
											<path d="M14 13l2 2l2 -2m-2 2v-6" />
										</svg>
										Copy page Markdown for LLMs
									</button>
									<button
										id="ask-chatgpt"
										type="button"
										className="flex w-full items-center gap-2 text-left text-base-900 text-xs hover:text-accent-600 dark:text-white"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="1"
											strokeLinecap="round"
											strokeLinejoin="round"
											className="icon size-4 text-base-900 dark:text-white"
											aria-hidden="true"
										>
											<path stroke="none" d="M0 0h24v24H0z" fill="none" />
											<path d="M11.217 19.384a3.501 3.501 0 0 0 6.783 -1.217v-5.167l-6 -3.35" />
											<path d="M5.214 15.014a3.501 3.501 0 0 0 4.446 5.266l4.34 -2.534v-6.946" />
											<path d="M6 7.63c-1.391 -.236 -2.787 .395 -3.534 1.689a3.474 3.474 0 0 0 1.271 4.745l4.263 2.514l6 -3.348" />
											<path d="M12.783 4.616a3.501 3.501 0 0 0 -6.783 1.217v5.067l6 3.45" />
											<path d="M18.786 8.986a3.501 3.501 0 0 0 -4.446 -5.266l-4.34 2.534v6.946" />
											<path d="M18 16.302c1.391 .236 2.787 -.395 3.534 -1.689a3.474 3.474 0 0 0 -1.271 -4.745l-4.308 -2.514l-5.955 3.42" />
										</svg>
										Ask ChatGPT
									</button>
									<button
										id="ask-claude"
										type="button"
										className="flex w-full items-center gap-2 text-left text-base-900 text-xs hover:text-accent-600 dark:text-white"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="0"
											strokeLinecap="round"
											strokeLinejoin="round"
											className="icon size-4 text-base-900 dark:text-white"
											aria-hidden="true"
										>
											<path
												fill="currentColor"
												d="m5.92 15.3l3.94-2.2l.06-.2l-.06-.1h-.2L9 12.76l-2.24-.06l-1.96-.1l-1.9-.1l-.48-.1l-.42-.6l.04-.3l.4-.26l.58.04l1.26.1l1.9.12l1.38.08l2.04.24h.32l.04-.14l-.1-.08l-.08-.08L7.8 10.2L5.68 8.8l-1.12-.82l-.6-.4l-.3-.4l-.12-.84l.54-.6l.74.06l.18.04l.74.58l1.6 1.22L9.4 9.2l.3.24l.12-.08l.02-.06l-.14-.22L8.6 7L7.4 4.92l-.54-.86l-.14-.52c-.06-.2-.08-.4-.08-.6l.6-.84l.36-.1l.84.12l.32.28l.52 1.2l.82 1.86l1.3 2.52l.4.76l.2.68l.06.2h.14v-.1l.1-1.44l.2-1.74l.2-2.24l.06-.64l.32-.76l.6-.4l.52.22l.4.58l-.06.36L14.32 5l-.52 2.42l-.3 1.64h.18l.2-.22l.82-1.08l1.38-1.72l.6-.7l.72-.74l.46-.36h.86l.62.94l-.28.98l-.88 1.12l-.74.94l-1.06 1.42l-.64 1.14l.06.08h.14l2.4-.52l1.28-.22l1.52-.26l.7.32l.08.32l-.28.68l-1.64.4l-1.92.4l-2.86.66l-.04.02l.04.06l1.28.12l.56.04h1.36l2.52.2l.66.4l.38.54l-.06.4l-1.02.52l-1.36-.32l-3.2-.76l-1.08-.26h-.16v.08l.92.9l1.66 1.5l2.12 1.94l.1.48l-.26.4l-.28-.04l-1.84-1.4l-.72-.6l-1.6-1.36h-.1v.14l.36.54l1.96 2.94l.1.9l-.14.28l-.52.2l-.54-.12l-1.16-1.6l-1.2-1.8l-.94-1.64l-.1.08l-.58 6.04l-.26.3l-.6.24l-.5-.4l-.28-.6l.28-1.24l.32-1.6l.26-1.28l.24-1.58l.14-.52v-.04h-.14l-1.2 1.66l-1.8 2.46l-1.44 1.52l-.34.14l-.6-.3l.06-.56l.32-.46l2-2.56l1.2-1.58l.8-.92l-.02-.1h-.06l-5.28 3.44l-.94.12l-.4-.4l.04-.6l.2-.2l1.6-1.1z"
											/>
										</svg>
										Ask Claude
									</button>
									<a
										href="#_"
										className="flex w-full items-center gap-2 text-left text-base-900 text-xs hover:text-accent-600 dark:text-white"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeLinecap="round"
											strokeLinejoin="round"
											className="icon size-4 text-base-900 dark:text-white"
											aria-hidden="true"
										>
											<path
												fill="currentColor"
												d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2"
											/>
										</svg>
										Edit on GitHub
									</a>
									<div
										id="feedback-buttons"
										className="flex items-center gap-2"
									>
										<span className="text-base-500 text-xs dark:text-base-400">
											Was this helpful?
										</span>
										<button
											type="button"
											className="flex h-7.5 items-center justify-center rounded-full bg-base-100 px-3 py-2 font-medium text-base-900 text-xs transition-all duration-300 hover:bg-base-100 focus:ring-2 focus:ring-base-100 focus:ring-none focus:ring-offset-1 focus:ring-offset-white dark:bg-base-800 dark:text-white dark:focus:ring-base-800 dark:focus:ring-offset-base-900 dark:hover:bg-base-700"
											id="yes-btn"
										>
											Yes
										</button>
										<button
											type="button"
											className="flex h-7.5 items-center justify-center rounded-full bg-base-100 px-3 py-2 font-medium text-base-900 text-xs transition-all duration-300 hover:bg-base-100 focus:ring-2 focus:ring-base-100 focus:ring-none focus:ring-offset-1 focus:ring-offset-white dark:bg-base-800 dark:text-white dark:focus:ring-base-800 dark:focus:ring-offset-base-900 dark:hover:bg-base-700"
											id="no-btn"
										>
											No
										</button>
									</div>
									<span id="thank-you" className="hidden">
										<div className="flex justify-center duration-300 md:justify-start">
											<div className="flex w-full items-center gap-2 text-left text-base-600 text-xs dark:text-base-300">
												<svg
													xmlns="http://www.w3.org/2000/svg"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
													className="icon size-4"
													aria-hidden="true"
												>
													<path stroke="none" d="M0 0h24v24H0z" fill="none" />
													<path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
													<path d="M9 12l2 2l4 -4" />
												</svg>
												Thanks for your feedback!
											</div>
										</div>
										<form action="" className="mt-4 max-w-sm space-y-2">
											<div>
												<div className="sr-only mb-1 flex items-baseline justify-between">
													<label
														htmlFor="message"
														className="font-medium text-base-500 text-xs dark:text-base-300"
													>
														Your Message
													</label>
												</div>
												<div className="relative z-0 focus-within:z-10">
													<textarea
														id="message"
														name="message"
														rows={4}
														autoFocus
														placeholder="What's on your mind?"
														className="block w-full resize rounded-md border border-transparent bg-white px-4 py-2 align-middle text-base-500 text-xs leading-tight placeholder-base-400 shadow-sm ring-1 ring-base-200 transition duration-300 ease-in-out focus:z-10 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100 dark:bg-base-900 dark:placeholder-base-500 dark:ring-base-800 dark:ring-offset-base-900 dark:focus:ring-accent-100/10"
													/>
												</div>
												<p className="mt-1 text-base-500 text-xs dark:text-base-400">
													Did you mean to reach out to{' '}
													<a
														className="w-full text-left text-base-900 text-xs underline hover:text-accent-600 dark:text-white"
														href="/forms/contact"
													>
														Support
													</a>
												</p>
											</div>
											<button
												type="submit"
												className="flex h-7.5 w-fit items-center justify-center rounded-full bg-accent-600 px-3 py-2 font-medium text-white text-xs transition-all duration-300 hover:bg-accent-500 focus:ring-2 focus:ring-accent-500 focus:ring-none focus:ring-offset-1 focus:ring-offset-white dark:focus:ring-offset-base-900"
											>
												Send Message
											</button>
										</form>
									</span>
								</div>
							</div>
						</div>
						{toc.length > 0 && (
							<aside className="hidden w-64 p-4 pl-0 lg:sticky lg:top-14 lg:block lg:self-start">
								<div>
									<h4 className="ml-4 text-base-900 text-sm dark:text-white">
										On this page
									</h4>
									<div className="mt-4 flex h-full flex-col">
										{toc.map((item) => (
											<TocItem key={item.url} item={item} />
										))}
									</div>
								</div>
							</aside>
						)}
					</div>
					<Footer />
				</AnchorProvider>
			</article>
		</div>
	);
}

export function DocsBody({
	children,
	className,
	...props
}: {
	children: ReactNode;
	className?: string;
} & HTMLAttributes<HTMLDivElement>) {
	return (
		<div {...props} className={cn('prose', className)}>
			{children}
		</div>
	);
}

export function DocsDescription({
	children,
	className,
	...props
}: {
	children?: ReactNode;
	className?: string;
} & HTMLAttributes<HTMLParagraphElement>) {
	// don't render if no description provided
	if (children === undefined) return null;

	return (
		<p
			{...props}
			className={cn(
				'mt-2 max-w-xl text-base text-base-500 dark:text-base-300',
				className
			)}
		>
			{children}
		</p>
	);
}

export function DocsTitle({
	children,
	className,
	...props
}: {
	children: ReactNode;
	className?: string;
} & HTMLAttributes<HTMLHeadingElement>) {
	return (
		<h1 {...props} className={cn('font-semibold text-3xl', className)}>
			{children}
		</h1>
	);
}

function TocItem({ item }: { item: TOCItemType }) {
	const isActive = useActiveAnchors().includes(item.url.slice(1));

	return (
		<a
			href={item.url}
			className={cn(
				'toc-link block select-none border-transparent border-l-2 py-1 text-base-500 text-xs transition-all duration-200 hover:text-accent-600 dark:text-base-400 dark:hover:text-accent-400',
				isActive && 'text-accent-600 dark:text-accent-400'
			)}
			style={{
				paddingLeft: Math.max(0, item.depth - 2) * 16 + 16, // Base padding of 1rem (16px) plus depth
			}}
			data-heading-id={item.url.slice(1)}
			data-heading-depth={item.depth}
		>
			{item.title}
		</a>
	);
}

function Footer() {
	const { root } = useTreeContext();
	const pathname = usePathname();
	const flatten = useMemo(() => {
		const result: PageTree.Item[] = [];

		function scan(items: PageTree.Node[]) {
			for (const item of items) {
				if (item.type === 'page') {
					result.push(item);
				} else if (item.type === 'folder') {
					if (item.index) {
						result.push(item.index);
					}
					scan(item.children);
				}
			}
		}

		scan(root.children);
		return result;
	}, [root]);

	const { previous, next } = useMemo(() => {
		const idx = flatten.findIndex((item) => item.url === pathname);

		if (idx === -1) {
			return {};
		}
		return {
			previous: flatten[idx - 1],
			next: flatten[idx + 1],
		};
	}, [flatten, pathname]);

	// Don't render if no navigation items
	if (!previous && !next) {
		return null;
	}

	return (
		<nav
			aria-label="Documentation pagination"
			className="grid w-full grid-cols-1 divide-y divide-base-200 border-base-200 border-t md:grid-cols-2 lg:divide-x lg:divide-y-0 dark:divide-base-800 dark:border-base-800"
		>
			<div className="w-full">
				{previous ? (
					<Link
						href={previous.url}
						className="group flex w-full flex-col gap-12 p-8 duration-200 hover:bg-base-50 dark:hover:bg-white/1"
					>
						<span className="font-medium font-mono text-base-500 text-xs uppercase tracking-wide dark:text-base-400">
							Previous
						</span>
						<div>
							<div className="truncate font-medium text-base-900 text-sm transition-colors group-hover:text-accent-600 dark:text-white dark:group-hover:text-accent-400">
								{previous.name}
							</div>
						</div>
					</Link>
				) : (
					<div className="w-full p-8" />
				)}
			</div>
			<div className="w-full">
				{next ? (
					<Link
						href={next.url}
						className="group flex w-full flex-col justify-end gap-12 p-8 duration-200 hover:bg-base-50 dark:hover:bg-white/1"
					>
						<span className="font-medium font-mono text-base-500 text-xs uppercase tracking-wide dark:text-base-400">
							Next
						</span>
						<div className="truncate font-medium text-base-900 text-sm transition-colors group-hover:text-accent-600 dark:text-white dark:group-hover:text-accent-400">
							{next.name}
						</div>
					</Link>
				) : (
					<div className="w-full p-8" />
				)}
			</div>
		</nav>
	);
}
