import { Suspense } from 'react';
import { ConsentDemo } from '../../components/demo/consent-demo';

export default function Home() {
	return (
		<Suspense>
			<ConsentDemo />
		</Suspense>
	);
}
