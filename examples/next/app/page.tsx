'use client';

import { Frame, useConsentManager } from '@c15t/nextjs';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const BUTTON_STYLE =
	'border border-[#ebebeb] dark:border-[#333333] rounded-md px-4 py-2 hover:border-none hover:bg-[#ebebeb]/10 dark:hover:bg-[#333333]/90';

export default function Home() {
	const [mounted, setMounted] = useState(false);
	const { theme } = useTheme();
	const { setShowPopup, setIsPrivacyDialogOpen, consents, locationInfo } =
		useConsentManager();

	useEffect(() => {
		setMounted(true);
	}, []);

	return (
		<div className="min-h-screen grid grid-cols-7 items-center justify-center gap-8 pt-16">
			<main className="col-start-2 col-end-5 flex flex-col items-center gap-8 sm:items-start">
				{!mounted ? null : theme === 'light' ? (
					<Image
						src="/c15t-banner-light.svg"
						alt="c15t banner"
						width={568}
						height={120}
						priority
					/>
				) : (
					<Image
						src="/c15t-banner-dark.svg"
						alt="c15t banner"
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
				<Frame category="marketing" className="h-[300px] w-[500px]">
					<iframe
						title="Cool Duck Video"
						src="https://www.youtube.com/embed/mQJ6q1ZCzsg"
						width="100%"
						height="100%"
					/>
				</Frame>
			</main>

			{mounted && (
				<aside className="col-span-2 justify-start items-start flex-flex-col h-full w-full ">
					<div className="border border-[#ebebeb] dark:border-[#333333] rounded-[1.25rem] p-4">
						<h2 className="text-base font-medium">Current Consent: </h2>
						<pre>
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

			<footer className="col-span-7 flex flex-wrap items-center justify-center gap-[24px]">
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
