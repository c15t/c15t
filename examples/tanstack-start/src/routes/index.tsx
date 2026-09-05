import { createFileRoute } from '@tanstack/react-router';
import {
	useActiveUI,
	useConsent,
	useConsents,
	useLocation,
	useModel,
	usePolicy,
	usePolicyDecision,
	useSetActiveUI,
} from 'c15t/tanstack-start';

const HomePage = () => {
	const activeUI = useActiveUI();
	const consents = useConsents();
	const location = useLocation();
	const marketingAllowed = useConsent('marketing');
	const model = useModel();
	const policy = usePolicy();
	const policyDecision = usePolicyDecision();
	const setActiveUI = useSetActiveUI();

	const granted = Object.entries(consents)
		.filter(([, allowed]) => allowed)
		.map(([category]) => category);

	return (
		<main className="page">
			<h1>c15t × TanStack Start</h1>
			<p>
				Consent management with the banner server-rendered into the first HTML
				(zero CLS) and consent resolved from a CDN-cacheable manifest, with no
				consent-backend round trip on the request path.
			</p>

			<section className="card">
				<h2>Live consent state</h2>
				<dl>
					<dt>Active surface</dt>
					<dd>
						<code data-testid="active-ui">{activeUI ?? 'none'}</code>
					</dd>
					<dt>Granted categories</dt>
					<dd>
						<code data-testid="granted">{granted.join(', ') || '—'}</code>
					</dd>
					<dt>Marketing allowed</dt>
					<dd>
						<code data-testid="marketing">{String(marketingAllowed)}</code>
					</dd>
					<dt>Resolved location</dt>
					<dd>
						<code data-testid="location">
							{location?.countryCode ?? 'unknown'}
							{location?.regionCode ? ` / ${location.regionCode}` : ''}
						</code>
					</dd>
					<dt>Policy pack</dt>
					<dd>
						<code data-testid="policy-id">
							{policyDecision?.policyId ?? '—'}
						</code>
					</dd>
					<dt>Policy model</dt>
					<dd>
						<code data-testid="model">{model ?? '—'}</code>
					</dd>
					<dt>Consent surface</dt>
					<dd>
						<code data-testid="ui-mode">{policy?.ui?.mode ?? '—'}</code>
					</dd>
				</dl>
			</section>

			<section className="card">
				<h2>Region preview</h2>
				<p className="hint">
					Override the resolved location with a query parameter. The policy pack
					above is re-resolved from the manifest on the server, so two of these
					legitimately render no banner at all.
				</p>
				<ul className="regions">
					<li>
						<a href="/">Auto-detect</a> — your real location
					</li>
					<li>
						<a href="/?country=DE">?country=DE</a> — GDPR, IAB TCF banner
					</li>
					<li>
						<a href="/?country=US&region=CA">?country=US&amp;region=CA</a> —
						CCPA, opt-out, no banner
					</li>
					<li>
						<a href="/?country=JP">?country=JP</a> — world fallback, no banner
					</li>
				</ul>
			</section>

			<section className="card">
				<h2>Controls</h2>
				<button
					type="button"
					onClick={() => setActiveUI('banner')}
				>
					Reopen banner
				</button>
				<button
					type="button"
					data-testid="open-dialog"
					onClick={() => setActiveUI('dialog')}
				>
					Open preferences
				</button>
			</section>
		</main>
	);
};

export const Route = createFileRoute('/')({
	component: HomePage,
});
