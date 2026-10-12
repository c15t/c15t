import { ConsentTheme } from 'c15t/next';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Consent } from '@/components/consent';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { VisitorPreview } from '@/components/visitor-preview';
import { brandTheme } from '@/lib/consent-theme';
import { getDictionary } from '@/lib/dictionaries';
import { isLocale, locales } from '@/lib/locales';

import '../globals.css';

export const generateStaticParams = () => locales.map((lang) => ({ lang }));

export const dynamicParams = false;

export const generateMetadata = async ({
	params,
}: LayoutProps<'/[lang]'>): Promise<Metadata> => {
	const { lang } = await params;
	if (!isLocale(lang)) {
		return {};
	}
	const { meta } = getDictionary(lang);
	return {
		alternates: {
			languages: Object.fromEntries(locales.map((code) => [code, `/${code}`])),
		},
		description: meta.description,
		title: meta.title,
	};
};

const RootLayout = async ({ children, params }: LayoutProps<'/[lang]'>) => {
	const { lang } = await params;
	if (!isLocale(lang)) {
		notFound();
	}
	const dictionary = getDictionary(lang);

	return (
		<html lang={lang}>
			<body>
				<ConsentTheme theme={brandTheme} />
				<Consent locale={lang}>
					<VisitorPreview copy={dictionary.preview} />
					<SiteHeader
						locale={lang}
						dictionary={dictionary}
					/>
					<main id="main">{children}</main>
					<SiteFooter copy={dictionary.footer} />
				</Consent>
			</body>
		</html>
	);
};

export default RootLayout;
