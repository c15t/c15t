import { Suspense } from 'react';
import { PolicyActionsDemo } from '../../../components/policy/policy-actions-demo';

export default function PolicyActionsPage() {
	return (
		<Suspense>
			<PolicyActionsDemo />
		</Suspense>
	);
}
