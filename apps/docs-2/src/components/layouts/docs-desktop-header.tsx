/**
 * Desktop header component for documentation layout
 *
 * Provides desktop-specific navigation including:
 * - Search functionality
 * - Navigation links
 * - Theme toggle
 *
 * @returns The desktop header JSX element
 */
export function DocsDesktopHeader() {
	return (
		<header className="fixed top-0 right-0 left-72 z-50 hidden w-auto bg-base-100 lg:block dark:bg-base-700">
			<div className="flex items-center justify-between gap-4 border-base-200 border-t border-b bg-white px-4 py-2.5 lg:mt-1 lg:mr-1 lg:rounded-tr-xl lg:border-r dark:border-base-800 dark:bg-base-900">
				<div className="w-full max-w-48">
					<button
						type="button"
						className="flex h-9 w-full items-center justify-between rounded-md border border-transparent bg-white px-4 py-2 align-middle text-base-500 text-xs leading-tight placeholder-base-400 shadow-sm ring-1 ring-base-200 transition duration-300 ease-in-out focus:z-10 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-100 focus:ring-offset-white dark:bg-base-900 dark:ring-base-800 dark:focus:ring-offset-base-900"
					>
						<div className="flex items-center gap-2">
							<SearchIcon className="h-4 w-4" />
							<span>Search docs</span>
						</div>
					</button>
				</div>
				<div className="ml-auto flex flex-col gap-2 md:flex-row md:gap-4">
					<a
						href="/system/overview"
						className="text-2xl text-base-500 transition-colors hover:text-base-600 md:text-sm dark:text-base-400 dark:hover:text-base-200"
					>
						Overview
					</a>
					<a
						href="/blog/"
						className="text-2xl text-base-500 transition-colors hover:text-base-600 md:text-sm dark:text-base-400 dark:hover:text-base-200"
					>
						Blog
					</a>
				</div>
				<div className="inline-flex items-center gap-1 rounded-full bg-base-100 p-0.5 transition-colors duration-200 dark:bg-base-800">
					{/* Theme toggle placeholder - could be made interactive later */}
					<button
						type="button"
						className="flex size-6 items-center justify-center rounded-full bg-base-100 py-2 font-medium text-base-900 text-xs transition-all duration-300 hover:bg-base-100 focus:ring-2 focus:ring-base-100 focus:ring-none focus:ring-offset-1 focus:ring-offset-white dark:bg-base-800 dark:text-white dark:focus:ring-base-800 dark:focus:ring-offset-base-900 dark:hover:bg-base-700"
					>
						🌙
					</button>
				</div>
			</div>
		</header>
	);
}

/**
 * Search icon component
 */
function SearchIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth={2}
				d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
			/>
		</svg>
	);
} 