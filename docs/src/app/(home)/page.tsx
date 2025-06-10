import { FeaturesSection } from './_components/features';
import { Hero } from './_components/hero';

import type { Metadata } from 'next/types';
import { CTA } from './_components/cta';
import { Footer } from './_components/footer';
import { siteConfig } from './config';

const metadataTitle = 'React Privacy Components for the Modern Web';
const metadataDescription = siteConfig.hero.description;

export const metadata: Metadata = {
	title: metadataTitle,
	description: metadataDescription,
	openGraph: {
		title: metadataTitle,
		description: metadataDescription,
		images: '/opengraph-image.png',
	},
	twitter: {
		card: 'summary_large_image',
		title: metadataTitle,
		description: metadataDescription,
		images: '/opengraph-image.png',
	},
};

export default function HomePage() {
	return (
		<>
			<Hero />
			{/* <ComponentsSection /> */}
			<FeaturesSection />
			{/* <Examples /> */}
			<CTA />
			<Footer />
		</>
	);
}

export const dynamic = 'force-static';
export const revalidate = 3600;
