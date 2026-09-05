import { COMPAT_BACKEND_URL } from '@c15t/next-compat-shared/config';
import { buildPrefetchScript } from '@c15t/nextjs';
import Document, { Head, Html, Main, NextScript } from 'next/document';
import type { DocumentContext, DocumentInitialProps } from 'next/document';
import Script from 'next/script';

interface CompatDocumentProps extends DocumentInitialProps {
	prefetch: boolean;
}

/**
 * `beforeInteractive` scripts in the Pages Router only work from
 * `_document`, so the prefetch script lives here and is switched on per
 * route through `getInitialProps`.
 *
 * @remarks
 * `next/document` only registers `beforeInteractive` scripts that are
 * *direct* children of `<Head>` or `<body>` whose element type is
 * `next/script` itself. Wrapping the script in a component (for example
 * `C15tPrefetch`) hides it from that scan and it is silently dropped, so
 * the inline script is built here with `buildPrefetchScript`.
 */
const CompatDocument = ({ prefetch }: CompatDocumentProps) => (
	<Html lang="en">
		<Head>
			{prefetch ? (
				<Script
					id="c15t-initial-data-prefetch"
					strategy="beforeInteractive"
				>
					{buildPrefetchScript({ backendURL: COMPAT_BACKEND_URL })}
				</Script>
			) : null}
		</Head>
		<body>
			<Main />
			<NextScript />
		</body>
	</Html>
);

CompatDocument.getInitialProps = async (
	ctx: DocumentContext
): Promise<CompatDocumentProps> => {
	const initialProps = await Document.getInitialProps(ctx);
	return { ...initialProps, prefetch: ctx.pathname === '/prefetch' };
};

export default CompatDocument;
