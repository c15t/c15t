import Link from 'next/link';
import Script from 'next/script';

export default function EmbedScriptTagsShowcasePage() {
	return (
		<main className="min-h-screen bg-slate-50 text-slate-900">
			<section className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-16">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-semibold">
						c15t/embed Script-Tags-Only Demo
					</h1>
					<Link
						href="/"
						className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
					>
						Back Home
					</Link>
				</div>

				<p className="text-sm text-slate-600">
					This route requests <code>/api/self-host/embed.js</code>. The backend
					then chooses and lazy-loads the best runtime variant (base or full
					IAB) from geolocation + config. No React import or client bundle is
					required in this page.
				</p>

				<div className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-600">
					<div>
						Base runtime (non-IAB): <code>/c15t-embed.runtime.iife.js</code>
					</div>
					<div>
						Full runtime (IAB regions):{' '}
						<code>/c15t-embed.runtime-full.iife.js</code>
					</div>
					<div>
						IAB addon (fallback for manually loaded base runtime):{' '}
						<code>/c15t-embed.runtime-iab.iife.js</code>
					</div>
					<div>
						DevTools script: <code>/c15t-embed.devtools.iife.js</code>
					</div>
					<div>
						Payload script: <code>/api/self-host/embed.js?country=GB</code>
					</div>
					<div>
						Mount target: <code>#c15t-embed-root</code>
					</div>
				</div>

				<div
					id="c15t-embed-root"
					suppressHydrationWarning
					className="relative min-h-[180px] rounded-lg border border-dashed border-slate-300 bg-white"
				/>
			</section>

			<Script
				src="/c15t-embed.devtools.iife.js"
				strategy="afterInteractive"
				data-c15t-namespace="c15tStore"
			/>
			<Script
				src="/api/self-host/embed.js?country=GB"
				strategy="afterInteractive"
			/>
		</main>
	);
}
