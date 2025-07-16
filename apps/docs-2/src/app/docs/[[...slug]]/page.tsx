import {
	DocsBody,
	DocsBreadcrumb,
	DocsDescription,
	DocsPage,
	DocsTitle,
} from '@/components/layouts/page';
import { source } from '@/lib/source';
import { getMDXComponents } from '@/mdx-components';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { notFound } from 'next/navigation';

export default async function Page(props: {
	params: Promise<{ slug?: string[] }>;
}) {
	const params = await props.params;
	const page = source.getPage(params.slug);
	if (!page) {
		notFound();
	}

	const MDXContent = page.data.body;

	return (
		<DocsPage toc={page.data.toc} full={page.data.full}>
			<div className=" relative flex h-full flex-col space-y-8 bg-white py-4 lg:mt-14 lg:space-y-32 dark:bg-base-900">
				<DocsBreadcrumb />
				<div>
					<DocsTitle>{page.data.title}</DocsTitle>
					<DocsDescription>{page.data.description}</DocsDescription>
				</div>
			</div>
			<DocsBody>
				<MDXContent
					components={getMDXComponents({
						// this allows you to link to other pages with relative file paths
						a: createRelativeLink(source, page),
					})}
				/>
			</DocsBody>
		</DocsPage>
	);
}

export async function generateStaticParams() {
	return source.generateParams();
}

export async function generateMetadata(props: {
	params: Promise<{ slug?: string[] }>;
}) {
	const params = await props.params;
	const page = source.getPage(params.slug);
	if (!page) {
		notFound();
	}

	return {
		title: page.data.title,
		description: page.data.description,
	};
}
