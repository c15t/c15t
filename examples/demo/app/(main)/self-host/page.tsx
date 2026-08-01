import { Suspense } from 'react';
import { ConsentDemo } from '../../../components/demo/consent-demo';

/**
 * Development-only page: same demo, but hosted mode talks to this app's own
 * /api/self-host backend route instead of the consent.io demo instance.
 * Intentionally not linked from the main page — see /dev for the index.
 */
export default function SelfHostPage() {
	return (
		<Suspense>
			<ConsentDemo backend="self-host" />
		</Suspense>
	);
}
