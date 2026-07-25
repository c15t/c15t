import Link from 'next/link';

/**
 * Development index. These pages are for testing during development and are
 * intentionally not linked from the sales-facing demo at `/`.
 */
const devPages = [
	{
		href: '/self-host',
		title: 'Self-hosted backend',
		description:
			'The same demo, but hosted mode resolves policies through this app’s /api/self-host route (requires DATABASE_URL).',
	},
	{
		href: '/policy-actions',
		title: 'Policy actions',
		description:
			'Compare how banner action layouts (order, grouping, direction, profiles) resolve across policies.',
	},
	{
		href: '/terms',
		title: 'Terms acceptance',
		description:
			'Legal document consent flow: identify a user and record acceptance of a terms release (requires DATABASE_URL).',
	},
];

export default function DevIndexPage() {
	return (
		<main className="min-h-screen bg-background">
			<div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
				<header className="space-y-3 border-border/80 border-b pb-8">
					<p className="label-pixel text-muted-foreground">
						c15t demo / development
					</p>
					<h1 className="font-semibold text-3xl tracking-[-0.04em]">
						Development pages
					</h1>
					<p className="text-muted-foreground text-sm leading-6">
						Internal testing surfaces. None of these are linked from the main
						demo, so they stay out of the way during customer calls.
					</p>
				</header>

				<ul className="space-y-4">
					{devPages.map((page) => (
						<li key={page.href}>
							<Link
								href={page.href}
								className="block rounded-2xl border border-border/80 p-4 transition hover:border-foreground/40"
							>
								<span className="font-medium text-sm">{page.title}</span>
								<span className="mt-1 block text-muted-foreground text-sm leading-6">
									{page.description}
								</span>
							</Link>
						</li>
					))}
				</ul>

				<p className="text-muted-foreground text-xs">
					Back to the{' '}
					<Link href="/" className="underline">
						main demo
					</Link>
					.
				</p>
			</div>
		</main>
	);
}
