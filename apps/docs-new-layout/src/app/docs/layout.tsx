import { baseOptions } from '@/app/layout.config';
import { DocsLayout } from '@/components/layouts/docs-layout';
import { source } from '@/lib/source';
import { type ReactNode, cache } from 'react';

const getStars = cache(async () => {
	try {
		const response = await fetch('https://ungh.cc/repos/c15t/c15t', {
			next: {
				revalidate: 1800, // Revalidate every 30 minutes
			},
		});
		const data = await response.json();
		return data.repo.stars as number;
	} catch {
		return 0;
	}
});

export default async function Layout({ children }: { children: ReactNode }) {
	const stars = await getStars();

	return (
		<DocsLayout tree={source.pageTree} githubStars={stars} {...baseOptions}>
			{children}
		</DocsLayout>
	);
}
