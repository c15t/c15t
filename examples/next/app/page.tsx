'use client';

import { Frame, useConsentManager } from '@c15t/nextjs';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const BUTTON_STYLE =
	'border border-neutral rounded-md px-4 py-2 hover:border-none hover:bg-neutral/10';

export default function Home() {
	const [mounted, setMounted] = useState(false);
	const { theme } = useTheme();
	const { setShowPopup, setIsPrivacyDialogOpen, consents, locationInfo } =
		useConsentManager();

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) return null;

	return (
		<div className="mx-4 mt-2 grid min-h-screen grid-cols-1 gap-8 md:mx-0 md:mt-16 md:grid-cols-7">
			<main className="flex flex-col gap-4 md:col-start-2 md:col-end-5">
				{theme === 'light' ? (
					<Image
						src="/c15t-banner-light.svg"
						alt="c15t banner"
						className="w-full"
						width={568}
						height={120}
						priority
					/>
				) : (
					<Image
						src="/c15t-banner-dark.svg"
						alt="c15t banner"
						className="w-full"
						width={568}
						height={120}
						priority
					/>
				)}

				<div className="flex flex-col items-center gap-4 sm:flex-row">
					<button
						type="button"
						className={BUTTON_STYLE}
						onClick={() => setShowPopup(true, true)}
					>
						Open Cookie Banner
					</button>
					<button
						type="button"
						className={BUTTON_STYLE}
						onClick={() => setIsPrivacyDialogOpen(true)}
					>
						Open Consent Dialog
					</button>
				</div>
				<Frame category="marketing" className="aspect-video w-full">
					<iframe
						title="Cool Duck Video"
						src="https://www.youtube.com/embed/mQJ6q1ZCzsg"
						width="100%"
						height="100%"
					/>
				</Frame>
			</main>

			{mounted && (
				<aside className="h-full w-full flex-flex-col items-start justify-start overflow-hidden md:col-span-2">
					<div className="space-y-2 rounded-[1.25rem] border border-neutral p-4">
						<h2 className="font-medium text-base">Current Consent: </h2>
						<pre className="font-light text-sm">
							{JSON.stringify(consents, null, 2)
								.split('\n')
								.map((line, i) => (
									<div
										key={i}
										style={{
											color: line.includes('true')
												? '#22c55e'
												: line.includes('false')
													? '#ef4444'
													: 'inherit',
										}}
									>
										{line}
									</div>
								))}
						</pre>
					</div>
				</aside>
			)}

			<footer className="flex flex-wrap items-center justify-center gap-[24px] md:col-span-7">
				<a
					className="flex items-center gap-2 hover:underline hover:underline-offset-4"
					href="https://c15t.com/docs/frameworks/next/quickstart"
					target="_blank"
					rel="noopener noreferrer"
				>
					<Image
						aria-hidden
						src="/file.svg"
						alt="File icon"
						width={16}
						height={16}
					/>
					Docs
				</a>
				<a
					className="flex items-center gap-2 hover:underline hover:underline-offset-4"
					href="https://github.com/c15t/c15t/tree/main/examples"
					target="_blank"
					rel="noopener noreferrer"
				>
					<Image
						aria-hidden
						src="/window.svg"
						alt="Window icon"
						width={16}
						height={16}
					/>
					Examples
				</a>
				<a
					className="flex items-center gap-2 hover:underline hover:underline-offset-4"
					href="https://consent.io"
					target="_blank"
					rel="noopener noreferrer"
				>
					<Image
						aria-hidden
						src="/globe.svg"
						alt="Globe icon"
						width={16}
						height={16}
					/>
					Hosted c15t →
				</a>
			</footer>
		</div>
	);
}
