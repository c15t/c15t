import { Suspense } from 'react';

import { PolicyActionsDemo } from '../../../components/policy/policy-actions-demo';

const PolicyActionsPage = () => {
	return (
		<Suspense>
			<PolicyActionsDemo />
		</Suspense>
	);
};

export default PolicyActionsPage;
