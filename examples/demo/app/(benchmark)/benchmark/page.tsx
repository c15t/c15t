import Link from 'next/link';

export default function BenchmarkIndexPage() {
	return (
		<main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-12">
			<div className="space-y-4">
				<h1 className="text-3xl font-semibold">c15t Benchmark Pages</h1>
				<p className="text-sm text-muted-foreground">
					Use the links below for automated banner visibility benchmarking.
				</p>
			</div>

			<div className="mt-8 grid gap-3">
				<Link href="/benchmark/client" className="rounded-md border px-3 py-2">
					/benchmark/client
				</Link>
				<Link href="/benchmark/ssr" className="rounded-md border px-3 py-2">
					/benchmark/ssr
				</Link>
				<Link
					href="/benchmark/prefetch"
					className="rounded-md border px-3 py-2"
				>
					/benchmark/prefetch
				</Link>
			</div>
		</main>
	);
}
