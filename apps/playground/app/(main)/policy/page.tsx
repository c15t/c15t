import { Suspense } from 'react';

import { PolicyPlayground } from '../../../components/policy/policy-playground';

export const metadata = {
	description:
		'Load a shipped c15t policy preset, edit any field, and watch validation, fingerprints, geo resolution and the live consent runtime update.',
	title: 'Policy playground · c15t Demo',
};

const PolicyPage = () => (
	<Suspense>
		<PolicyPlayground />
	</Suspense>
);

export default PolicyPage;
