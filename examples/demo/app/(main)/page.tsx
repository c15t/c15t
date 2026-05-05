import { Suspense } from 'react';
import { PolicyDemo } from '../../components/policy/policy-demo';

export default function Home() {
	return (
		<Suspense>
			<PolicyDemo />
		</Suspense>
	);
}
