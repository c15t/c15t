import { Demo } from '@/components/demo';

const Page = () => (
	<Demo>
		The layout resolves the banner-shape flag on the server and passes the arm
		to resolveConsent. Add ?arm=wall for the wall arm, or ?arm=off to leave the
		experiment.
	</Demo>
);

export default Page;
