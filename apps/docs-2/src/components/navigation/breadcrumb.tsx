'use client';
import { usePathname } from 'fumadocs-core/framework';
import { useMemo } from 'react';

/**
 * Breadcrumb navigation component for documentation pages
 *
 * Generates breadcrumb navigation based on the current pathname:
 * - Parses URL segments to create navigation trail
 * - Highlights current page
 * - Displays last updated information
 * - Provides proper aria labeling for accessibility
 *
 * @returns The breadcrumb navigation JSX element
 *
 * @example
 * ```tsx
 * <DocsBreadcrumb />
 * ```
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