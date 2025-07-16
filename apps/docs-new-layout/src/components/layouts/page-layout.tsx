'use client';

import type { TableOfContents } from 'fumadocs-core/server';
import { AnchorProvider } from 'fumadocs-core/toc';
import type { HTMLAttributes, ReactNode } from 'react';
import { useState } from 'react';
import { cn } from '../../lib/cn';
import { DocsBreadcrumb } from '../navigation/breadcrumb';
import { TableOfContents as TOC } from '../navigation/table-of-contents';
import { DocsMobileHeader } from './docs-mobile-header';
import { DocsSidebar } from './docs-sidebar';
import { PageFooter } from './page-footer';

/**
 * Documentation page layout properties
 *
 * @interface DocsPageProps
 */
interface DocsPageProps {
	/** Table of contents data */
	toc?: TableOfContents;
	/** Whether to use full width layout */
	full?: boolean;
	/** Main page content */
	children: ReactNode;
}

/**
 * Documentation page layout component
 *
 * Provides the main page structure with:
 * - Mobile header and sidebar integration
 * - Breadcrumb navigation
 * - Two-column layout (content + TOC)
 * - Anchor provider for scroll highlighting
 * - Page footer with navigation
 * - Mobile menu state management
 *
 * @param props - The page layout properties
 * @returns The page layout JSX element
 *
 * @example
 * ```tsx
 * <DocsPage toc={page.data.toc}>
 *   <DocsTitle>{page.data.title}</DocsTitle>
 *   <DocsDescription>{page.data.description}</DocsDescription>
 *   <DocsBody>
 *     <MDXContent />
 *   </DocsBody>
 * </DocsPage>
 * ```
 */
export function DocsPage({ toc = [], ...props }: DocsPageProps) {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	const handleMobileMenuToggle = () => {
		setIsMobileMenuOpen(!isMobileMenuOpen);
	};

	const handleMobileMenuClose = () => {
		setIsMobileMenuOpen(false);
	};

	return (
		<>
			{/* Mobile header */}
			<DocsMobileHeader
				onMenuToggle={handleMobileMenuToggle}
				isMenuOpen={isMobileMenuOpen}
			/>

			{/* Mobile sidebar */}
			<DocsSidebar isOpen={isMobileMenuOpen} onClose={handleMobileMenuClose} />

			{/* Main content */}
			<div className="mx-auto 2xl:max-w-6xl">
				<article>
					<AnchorProvider toc={toc}>
						<div className="flex flex-col lg:flex-row lg:divide-x lg:divide-base-200 dark:divide-base-800">
							<div className="flex-1">
								<div className="relative">
									<div className="relative flex h-full flex-col space-y-16 bg-white p-8 lg:space-y-24 dark:bg-base-900">
										{props.children}
									</div>
								</div>
								<div id="markdown-content">
									<div className="prose prose-base prose-pre:scrollbar-hide prose-pre:scrollbar-hide prose-pre:relative prose-pre:my-0 max-w-none prose-headings:scroll-mt-24 prose-pre:overflow-y-hidden prose-pre:rounded-xl prose-img:border prose-hr:border-base-300 prose-img:border-base-200 prose-pre:border-none px-8 py-4 prose-blockquote:font-normal prose-headings:font-medium prose-strong:font-medium prose-a:text-accent-500 prose-blockquote:text-base-500 prose-headings:text-base-900 text-base-500 prose-blockquote:tracking-normal prose-pre:outline-base-200 prose-a:duration-200 prose-pre:selection:bg-accent-600/10 prose-pre:selection:text-base-900 hover:prose-a:text-accent-500 dark:prose-blockquote:border-base-500 dark:prose-hr:border-base-700 dark:prose-img:border-base-700 dark:prose-thead:border-base-700 dark:prose-tr:border-base-700 dark:prose-blockquote:text-base-600 dark:prose-code:text-white dark:prose-headings:text-white dark:prose-strong:text-white dark:text-base-400 dark:prose-pre:outline-base-800 dark:prose-pre:selection:text-white">
										{/* Content will be rendered here */}
									</div>
								</div>
								<PageActions />
							</div>
							<TOC toc={toc} />
						</div>
						<PageFooter />
					</AnchorProvider>
				</article>
			</div>
		</>
	);
}

/**
 * Page body wrapper component for markdown content
 *
 * @param props - The body properties
 * @returns The body wrapper JSX element
 */
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

/**
 * Page description component
 *
 * @param props - The description properties
 * @returns The description JSX element or null if no content
 */
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

/**
 * Page title component
 *
 * @param props - The title properties
 * @returns The title JSX element
 */
export function DocsTitle({
	children,
	className,
	...props
}: {
	children: ReactNode;
	className?: string;
} & HTMLAttributes<HTMLHeadingElement>) {
	return (
		<div className="relative flex h-full flex-col space-y-8 bg-white py-4 lg:mt-14 lg:space-y-32 dark:bg-base-900">
			<DocsBreadcrumb />
			<div>
				<h1 {...props} className={cn('font-semibold text-3xl', className)}>
					{children}
				</h1>
			</div>
		</div>
	);
}

/**
 * Page actions component with feedback and utility buttons
 */
function PageActions() {
	return (
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
				<div id="feedback-buttons" className="flex items-center gap-2">
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
			</div>
		</div>
	);
}
