'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeSwitcher() {
	const [mounted, setMounted] = useState(false);
	const { theme, setTheme } = useTheme();

	// Avoid hydration mismatch by only rendering after mount
	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return null;
	}

	return (
		<button
			onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
			className="fixed top-4 right-4 z-[9999] flex h-10 w-[42px] items-center justify-center rounded-full border border-solid px-2 font-medium text-sm transition-all duration-150 ease-in-out sm:h-12 sm:w-[48px] sm:px-2 bg-white hover:bg-[hsl(0,0%,92.16%)] text-[hsl(0,0%,36%)] dark:bg-[hsl(220,15%,30%)] dark:text-white dark:hover:bg-[hsl(220,15%,25%)] shadow-[0px_1px_2px_0px_hsla(222,32%,8%,0.06),inset_0_0_0_1px_hsl(0,0%,92.16%)] dark:shadow-[0px_1px_2px_0px_hsla(0,0%,50%,0.06),inset_0_0_0_1px_hsl(220,15%,30%)]"
			aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
		>
			{theme === 'dark' ? (
				// Sun icon for dark mode
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					strokeWidth={1.5}
					stroke="currentColor"
					className="w-5 h-5 text-yellow-500"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
					/>
				</svg>
			) : (
				// Moon icon for light mode
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					strokeWidth={1.5}
					stroke="currentColor"
					className="w-5 h-5 text-gray-900 dark:text-gray-100"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
					/>
				</svg>
			)}
		</button>
	);
}
