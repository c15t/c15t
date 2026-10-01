import { Demo } from '@/components/demo';

const Page = () => (
	<Demo>
		The root layout awaits consent inside Suspense, so the banner is part of the
		server HTML and the page streams after it resolves.
	</Demo>
);

export default Page;
