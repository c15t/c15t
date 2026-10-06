import { Demo } from './demo';

/** Demo content for the Pages Router route. The consent setup lives in the page's getServerSideProps and pages/_app.tsx. */
const PagesRouterDemo = () => (
	<Demo>
		This page resolves consent in getServerSideProps, so the banner is part of
		the server HTML.
	</Demo>
);

export default PagesRouterDemo;
