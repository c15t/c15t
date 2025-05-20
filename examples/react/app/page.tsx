import Image from 'next/image';

export default function Home() {
	return (
		<div className="grid min-h-screen grid-rows-[20px_1fr_20px] items-center justify-items-center gap-16 p-8 pb-20 font-[family-name:var(--font-geist-sans)] sm:p-20">
			<main className="row-start-2 flex flex-col items-center gap-[32px] sm:items-start">
				<div className="flex flex-row items-center gap-6">
					<Image
						src="/c15t.svg"
						alt="c15t logo"
						width={60}
						height={38}
						priority
					/>

					<span className="text-5xl"> + </span>
					<Image
						className="dark:invert"
						src="/next.svg"
						alt="Next.js logo"
						width={180}
						height={38}
						priority
					/>
				</div>
				<ol className="list-inside list-decimal text-center font-[family-name:var(--font-geist-mono)] text-sm/6 sm:text-left">
					<li className="tracking-[-.01em]">
						Create a c15t instance, either with Consent.io or self-hosted.
					</li>
					<li className="mb-2 tracking-[-.01em]">
						Update
						<code className="rounded bg-black/[.05] px-1 py-0.5 font-[family-name:var(--font-geist-mono)] font-semibold dark:bg-white/[.06]">
							ConsentManagerProvider
						</code>
						component to use your c15t instance.
					</li>
				</ol>

				<div className="flex flex-col items-center gap-4 sm:flex-row">
					<a
						className="flex h-10 items-center justify-center gap-2 rounded-full border border-transparent border-solid bg-foreground px-4 font-medium text-background text-sm transition-colors hover:bg-[#383838] sm:h-12 sm:w-auto sm:px-5 sm:text-base dark:hover:bg-[#ccc]"
						href="https://consent.io/dashboard/register"
						target="_blank"
						rel="noopener noreferrer"
					>
						Create an instance with Consent.io
					</a>
					<a
						className="flex h-10 w-full items-center justify-center rounded-full border border-black/[.08] border-solid px-4 font-medium text-sm transition-colors hover:border-transparent hover:bg-[#f2f2f2] sm:h-12 sm:w-auto sm:px-5 sm:text-base md:w-[158px] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
						href="https://c15t.com/docs/nextjs/quickstart"
						target="_blank"
						rel="noopener noreferrer"
					>
						Read our docs
					</a>
				</div>
			</main>
			<footer className="row-start-3 flex flex-wrap items-center justify-center gap-[24px]">
				<a
					className="flex items-center gap-2 hover:underline hover:underline-offset-4"
					href="https://c15t.com/examples"
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
			</footer>
		</div>
	);
}
