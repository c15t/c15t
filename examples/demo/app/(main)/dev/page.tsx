import Link from 'next/link';

/**
 * Development index. These pages are for testing during development and are
 * intentionally not linked from the sales-facing demo at `/`.
 */
const devPages = [
	{
		description:
			'Deterministically inspect loading, error, retry, and ready behavior for consent-aware integrations.',
		href: '/dev/integrations',
		title: 'Integration states',
	},
	{
		description:
			'The same demo, but hosted mode resolves policies through this app’s /api/self-host route (requires DATABASE_URL).',
		href: '/self-host',
		title: 'Self-hosted backend',
	},
	{
		description:
			'Compare how banner action layouts (order, grouping, direction, profiles) resolve across policies.',
		href: '/policy-actions',
		title: 'Policy actions',
	},
	{
		description:
			'Legal document consent flow: identify a user and record acceptance of a terms release (requires DATABASE_URL).',
		href: '/terms',
		title: 'Terms acceptance',
	},
];

const DevIndexPage = () => {
	return (
		<main className="bg-background min-h-screen">
			<div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
				<header className="border-border/80 space-y-3 border-b pb-8">
					<p className="label-pixel text-muted-foreground">
						c15t demo / development
					</p>
					<h1 className="text-3xl font-semibold tracking-[-0.04em]">
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
								className="border-border/80 hover:border-foreground/40 block rounded-2xl border p-4 transition"
							>
								<span className="text-sm font-medium">{page.title}</span>
								<span className="text-muted-foreground mt-1 block text-sm leading-6">
									{page.description}
								</span>
							</Link>
						</li>
					))}
				</ul>

				<p className="text-muted-foreground text-xs">
					Back to the{' '}
					<Link
						href="/"
						className="underline"
					>
						main demo
					</Link>
					.
				</p>
			</div>
		</main>
	);
};

export default DevIndexPage;
