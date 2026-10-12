// #region docs:pages-ssr title="pages/index.tsx (partial)"
import { withConsentProps } from 'c15t/next/pages';

export const getServerSideProps = withConsentProps();
// #endregion docs:pages-ssr

const Page = () => (
	<main>
		<h1>c15t with the Next.js Pages Router</h1>
		<p>
			This page resolves consent in getServerSideProps, so the banner is part of
			the server HTML. PostHog loads once you allow measurement.
		</p>
	</main>
);

export default Page;
