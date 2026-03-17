import Link from 'next/link';
import type { BenchmarkVariant } from './bench-client';

const variantLabels: Record<BenchmarkVariant, string> = {
	client: 'Client Fetch (no ssrData)',
	ssr: 'Server Fetch (fetchInitialData)',
	prefetch: 'Browser Prefetch (beforeInteractive + shared Promise)',
};

interface BenchmarkPageShellProps {
	variant: BenchmarkVariant;
	step: 'home' | 'next';
}

export function BenchmarkPageShell({ variant, step }: BenchmarkPageShellProps) {
	const nextPageHref =
		step === 'home' ? `/benchmark/${variant}/next` : `/benchmark/${variant}`;
	const nextPageLabel =
		step === 'home' ? 'Soft Nav: go to next page' : 'Soft Nav: go back';
	const modeSwitcherBase =
		step === 'home' ? `/benchmark/${variant}` : `/benchmark/${variant}/next`;

	return (
		<main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
			<div className="space-y-4">
				<p className="text-sm text-muted-foreground">
					c15t benchmark: {variantLabels[variant]}
				</p>
				<h1 className="text-2xl font-semibold">
					{step === 'home' ? 'Benchmark Landing Page' : 'Benchmark Next Page'}
				</h1>
				<p className="text-sm text-muted-foreground">
					Use this page with Playwright benchmarks to compare banner visibility
					speed and callback behavior.
				</p>
			</div>

			<div className="mt-8 flex gap-3">
				<Link
					id="soft-nav-link"
					href={nextPageHref}
					className="rounded-md border px-3 py-2 text-sm"
				>
					{nextPageLabel}
				</Link>
				<Link href="/benchmark" className="rounded-md border px-3 py-2 text-sm">
					Back to benchmark index
				</Link>
			</div>
			<div className="mt-3 flex flex-wrap gap-2">
				<Link
					href={`${modeSwitcherBase}?anim=default`}
					className="rounded-md border px-2 py-1 text-xs"
				>
					Animation: default
				</Link>
				<Link
					href={`${modeSwitcherBase}?anim=fast`}
					className="rounded-md border px-2 py-1 text-xs"
				>
					Animation: fast
				</Link>
				<Link
					href={`${modeSwitcherBase}?anim=off`}
					className="rounded-md border px-2 py-1 text-xs"
				>
					Animation: off
				</Link>
			</div>
		</main>
	);
}
