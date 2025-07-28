'use client';

import type { TableOfContents } from 'fumadocs-core/server';
import { AnchorProvider } from 'fumadocs-core/toc';
import type { HTMLAttributes, ReactNode } from 'react';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import { DocsBreadcrumb } from '../navigation/breadcrumb';
import { TableOfContents as TOC } from '../navigation/table-of-contents';
import { DocsMobileHeader } from './docs-mobile-header';
import { DocsSidebar } from './docs-sidebar';
import { PageActions } from './page-actions';
import { PageFooter } from './page-footer';

/**
 * Documentation page layout properties
 *
 * @interface DocsPageProps
 */
interface DocsPageProps {
	slug?: string[];
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
export function DocsPage({ slug, toc = [], ...props }: DocsPageProps) {
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
								<PageActions slug={slug} />
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
	if (children === undefined) {
		return null;
	}

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
