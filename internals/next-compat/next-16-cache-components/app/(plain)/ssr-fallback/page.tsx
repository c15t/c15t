import { COMPAT_BACKEND_URL } from '@c15t/next-compat-shared/config';
import { ConsentShell } from '@c15t/next-compat-shared/consent-shell';
import { resolveConsent } from '@c15t/nextjs/server';
import { Suspense } from 'react';

const ResolvedConsent = async () => {
	const errors: unknown[] = [];
	const state = await resolveConsent({
		backendURL: COMPAT_BACKEND_URL,
		manifestURL: '/api/consent/unavailable-manifest',
		onError(error) {
			errors.push(error);
		},
		timeoutMs: false,
	});

	return (
		<ConsentShell
			state={state}
			scenario="ssr-fallback"
		>
			<p>{`Fallback consent: ${state.initialOverrides?.country}, manifest failed: ${errors.length === 1}`}</p>
		</ConsentShell>
	);
};

const SSRFallbackPage = () => (
	<Suspense fallback={null}>
		<ResolvedConsent />
	</Suspense>
);

export default SSRFallbackPage;
