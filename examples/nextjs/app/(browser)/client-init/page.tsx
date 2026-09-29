import { Demo } from '@/components/demo';

const Page = () => (
	<Demo>
		The root layout passes an empty state, so the browser loads the manifest and
		resolves consent after hydration.
	</Demo>
);

export default Page;
