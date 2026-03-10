import { Suspense } from 'react';
import { PolicyDemo } from '../../../components/policy/policy-demo';

export default function PolicyPage() {
	return (
		<Suspense>
			<PolicyDemo />
		</Suspense>
	);
}
