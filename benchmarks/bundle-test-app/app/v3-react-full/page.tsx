'use client';

// Load the v2 prebuilt component CSS (shared with v3 — both surfaces
// use `@c15t/ui/styles/components/*.module.css` under the hood).
import '@c15t/react/styles.css';

/**
 * /v3-react-full — interactive test harness for the v3 stack.
 *
 * What to do here:
 * - Open DevTools → Network tab.
 * - Click "Accept marketing" — Meta Pixel + FB SDK requests appear.
 * - Click "Revoke marketing" — the <script> tags are removed (filter by
 *   "facebook" or "google-analytics" in the DOM tree).
 * - Toggle measurement — GTM, Hotjar, GA load/unload on their own.
 *
 * Every mutation flows through the v3 kernel → the script-loader
 * module reconciles DOM in <10 µs. Check the "Loaded scripts" panel
 * below for live confirmation.
 */

import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentDraftProvider,
	ConsentProvider,
	ConsentWidget,
	createConsentKernel,
	createOfflineTransport,
	useConsent,
	useConsentDraft,
	useConsents,
	useHasConsented,
	useIframeBlocker,
	useNetworkBlocker,
	usePersistence,
	useSaveConsents,
	useScriptLoader,
} from '@c15t/react/v3';
import type { AllConsentNames } from 'c15t';
import type { Script } from 'c15t/v3/modules/script-loader';
import { useEffect, useState } from 'react';

/**
 * Realistic tracking stack. Each script is gated by a consent category.
 * Meta Pixel + FB SDK need `marketing`. GTM/Hotjar/GA need `measurement`.
 * Intercom needs `functionality`. Change consent and watch them load.
 */
const DEMO_SCRIPTS: Script[] = [
	{
		id: 'gtm',
		src: 'https://www.googletagmanager.com/gtm.js?id=GTM-DEMO',
		category: 'measurement',
		async: true,
	},
	{
		id: 'ga',
		src: 'https://www.google-analytics.com/analytics.js',
		category: 'measurement',
		async: true,
	},
	{
		id: 'hotjar',
		src: 'https://static.hotjar.com/c/hotjar.js',
		category: 'measurement',
		async: true,
	},
	{
		id: 'fb-pixel',
		src: 'https://connect.facebook.net/en_US/fbevents.js',
		category: 'marketing',
		async: true,
	},
	{
		id: 'fb-sdk',
		src: 'https://connect.facebook.net/en_US/sdk.js',
		category: 'marketing',
		async: true,
	},
	{
		id: 'linkedin-insight',
		src: 'https://snap.licdn.com/li.lms-analytics/insight.min.js',
		category: 'marketing',
		async: true,
	},
	{
		id: 'intercom',
		src: 'https://widget.intercom.io/widget.js',
		category: 'functionality',
		async: true,
	},
];

export default function V3ReactFullPage() {
	// Force showConsentBanner=true so the demo always renders the banner,
	// even in a jurisdiction the offline transport would otherwise mark
	// as NONE.
	const [kernel] = useState(() =>
		createConsentKernel({
			transport: createOfflineTransport(),
			initialShowConsentBanner: true,
		})
	);

	return (
		<ConsentProvider kernel={kernel}>
			<ConsentDraftProvider>
				<main
					style={{
						padding: '2rem',
						fontFamily: 'system-ui, -apple-system, sans-serif',
						maxWidth: 960,
						margin: '0 auto',
					}}
				>
					<h1 style={{ marginTop: 0 }}>c15t v3 — live test harness</h1>
					<p style={{ color: '#555', lineHeight: 1.5 }}>
						Check/uncheck a category to stage your choice. Click{' '}
						<strong>Save</strong> to commit to the kernel — only then do scripts
						actually load/unload. <strong>Reset</strong> discards the draft.
						This is the "preference center" UX pattern; the banner buttons
						(Accept All / Reject All) commit immediately.
					</p>

					<ModuleMount />

					<ConsentControls />
					<ConsentDebug />
					<LoadedScripts />
					<SnapshotDebug />
					<div style={{ marginTop: '2rem', color: '#64748b', fontSize: 13 }}>
						<ConsentDialogLink>
							Change your privacy preferences
						</ConsentDialogLink>
					</div>
				</main>
				{/* v3 UI components — styled stock surfaces. */}
				<ConsentBanner
					title="We value your privacy (v3 ConsentBanner)"
					description="Click a button below to commit immediately, or Customize to open the preference dialog."
				/>
				<ConsentDialog />
				<ConsentWidget />
			</ConsentDraftProvider>
		</ConsentProvider>
	);
}

/**
 * Drives the four boot modules. Isolated child so adjacent component
 * re-renders don't re-run the hooks.
 */
function ModuleMount() {
	useScriptLoader(DEMO_SCRIPTS);
	useNetworkBlocker({
		rules: [
			{ domain: 'google-analytics.com', category: 'measurement' },
			{ domain: 'facebook.net', category: 'marketing' },
			{ domain: 'hotjar.com', category: 'measurement' },
		],
		logBlockedRequests: false,
	});
	useIframeBlocker();
	usePersistence();
	return null;
}

const CATEGORIES: AllConsentNames[] = [
	'necessary',
	'functionality',
	'marketing',
	'measurement',
	'experience',
];

function ConsentControls() {
	const draft = useConsentDraft();
	const saveConsents = useSaveConsents();
	const hasConsented = useHasConsented();

	return (
		<section
			style={{
				marginTop: '2rem',
				padding: '1.5rem',
				border: '1px solid #e2e8f0',
				borderRadius: 8,
				background: '#fff',
			}}
		>
			<h2 style={{ marginTop: 0 }}>Consent controls (preference center)</h2>
			<p style={{ color: '#555', margin: '0 0 1rem 0' }}>
				Has consented: <strong>{String(hasConsented)}</strong>
				{' · '}Draft is{' '}
				<strong style={{ color: draft.isDirty ? '#d97706' : '#16a34a' }}>
					{draft.isDirty ? 'dirty (unsaved)' : 'clean'}
				</strong>
			</p>

			<div
				style={{
					display: 'grid',
					gap: 8,
					gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
				}}
			>
				{CATEGORIES.map((category) => (
					<label
						key={category}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 8,
							padding: 10,
							background: '#f8fafc',
							borderRadius: 6,
							cursor: category === 'necessary' ? 'not-allowed' : 'pointer',
							opacity: category === 'necessary' ? 0.6 : 1,
						}}
					>
						<input
							type="checkbox"
							checked={draft.values[category]}
							disabled={category === 'necessary'}
							onChange={(e) => draft.set(category, e.target.checked)}
						/>
						<span style={{ fontWeight: 500 }}>{category}</span>
					</label>
				))}
			</div>

			<div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
				<button
					type="button"
					onClick={() => void draft.save()}
					disabled={!draft.isDirty}
					style={btnStyle(draft.isDirty ? '#16a34a' : '#94a3b8')}
				>
					Save ({draft.isDirty ? 'pending' : 'clean'})
				</button>
				<button
					type="button"
					onClick={() => draft.reset()}
					disabled={!draft.isDirty}
					style={btnStyle(draft.isDirty ? '#64748b' : '#cbd5e1')}
				>
					Reset Draft
				</button>
				<span style={{ flex: 1 }} />
				<button
					type="button"
					onClick={() => void saveConsents('all')}
					style={btnStyle('#2563eb')}
				>
					Accept All (commit)
				</button>
				<button
					type="button"
					onClick={() => void saveConsents('none')}
					style={btnStyle('#dc2626')}
				>
					Reject All (commit)
				</button>
			</div>
		</section>
	);
}

function ConsentDebug() {
	const consents = useConsents();
	const draft = useConsentDraft();
	return (
		<section style={sectionStyle}>
			<h2 style={{ marginTop: 0 }}>Consent state</h2>
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: '1fr 1fr',
					gap: 16,
				}}
			>
				<div>
					<h3 style={{ margin: '0 0 6px 0', fontSize: 14 }}>
						Committed (kernel — gates scripts)
					</h3>
					<pre style={preStyle}>{JSON.stringify(consents, null, 2)}</pre>
				</div>
				<div>
					<h3 style={{ margin: '0 0 6px 0', fontSize: 14 }}>
						Draft (UI — not yet saved)
					</h3>
					<pre style={preStyle}>{JSON.stringify(draft.values, null, 2)}</pre>
				</div>
			</div>
		</section>
	);
}

/**
 * Polls the DOM for <script> tags added by the script-loader module
 * and renders a live list so you can see which scripts are currently
 * loaded without switching to DevTools.
 */
function LoadedScripts() {
	const [loaded, setLoaded] = useState<string[]>([]);
	// Re-read on any consent change so the list updates when scripts
	// mount/unmount.
	const consents = useConsents();

	useEffect(() => {
		// Give the script-loader a tick to reconcile.
		const handle = setTimeout(() => {
			const scripts = Array.from(
				document.head.querySelectorAll('script[id^="c15t"]')
			);
			setLoaded(
				scripts.map((s) => {
					const src = s.getAttribute('src') ?? '';
					const id = s.id;
					return `${id} → ${src}`;
				})
			);
		}, 20);
		return () => clearTimeout(handle);
	}, [consents]);

	// Map scripts to their category for a richer view.
	const expected = DEMO_SCRIPTS.map((s) => {
		const active = consents[s.category as AllConsentNames] ?? false;
		return { id: s.id, src: s.src, category: s.category, active };
	});

	return (
		<section style={sectionStyle}>
			<h2 style={{ marginTop: 0 }}>Loaded scripts</h2>
			<p style={{ color: '#555', margin: '0 0 0.75rem 0' }}>
				Live view of <code>document.head</code>. Green = eligible per current
				consent and mounted.
			</p>
			<table
				style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}
			>
				<thead>
					<tr style={{ background: '#f1f5f9' }}>
						<th style={cellHead}>Script</th>
						<th style={cellHead}>Category</th>
						<th style={cellHead}>Consent</th>
						<th style={cellHead}>In DOM</th>
					</tr>
				</thead>
				<tbody>
					{expected.map((row) => {
						const inDom = loaded.some((entry) =>
							entry.includes(`→ ${row.src}`)
						);
						return (
							<tr key={row.id} style={{ borderTop: '1px solid #e2e8f0' }}>
								<td style={cellBody}>
									<code>{row.id}</code>
								</td>
								<td style={cellBody}>{String(row.category)}</td>
								<td style={cellBody}>
									<span
										style={{
											color: row.active ? '#16a34a' : '#94a3b8',
										}}
									>
										{row.active ? '✓' : '✗'}
									</span>
								</td>
								<td style={cellBody}>
									<span style={{ color: inDom ? '#16a34a' : '#dc2626' }}>
										{inDom ? 'loaded' : '—'}
									</span>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
			{loaded.length === 0 ? (
				<p style={{ color: '#94a3b8', fontSize: 13, marginTop: 12 }}>
					No c15t-managed scripts in the DOM yet. Click "Accept All" or toggle a
					category.
				</p>
			) : null}
		</section>
	);
}

function SnapshotDebug() {
	const marketing = useConsent('marketing');
	const measurement = useConsent('measurement');
	const functionality = useConsent('functionality');
	return (
		<section style={sectionStyle}>
			<h2 style={{ marginTop: 0 }}>Per-category selector hooks</h2>
			<p style={{ color: '#555', margin: '0 0 0.75rem 0' }}>
				Each selector subscribes to its own slice. Flip
				<code> marketing </code>
				and confirm <code>measurement</code> and
				<code> functionality </code>
				don't re-render (React Profiler shows zero unrelated re-renders).
			</p>
			<ul style={{ margin: 0, paddingLeft: 20 }}>
				<li>
					<code>useConsent('marketing')</code>: {String(marketing)}
				</li>
				<li>
					<code>useConsent('measurement')</code>: {String(measurement)}
				</li>
				<li>
					<code>useConsent('functionality')</code>: {String(functionality)}
				</li>
			</ul>
		</section>
	);
}

const sectionStyle: React.CSSProperties = {
	marginTop: '2rem',
	padding: '1.5rem',
	border: '1px solid #e2e8f0',
	borderRadius: 8,
	background: '#fff',
};

const preStyle: React.CSSProperties = {
	background: '#f8fafc',
	padding: 12,
	borderRadius: 6,
	margin: 0,
	fontSize: 13,
	overflow: 'auto',
};

const cellHead: React.CSSProperties = {
	textAlign: 'left',
	padding: 8,
	fontWeight: 600,
	fontSize: 13,
};
const cellBody: React.CSSProperties = {
	padding: 8,
	fontSize: 13,
};

function btnStyle(bg: string): React.CSSProperties {
	return {
		padding: '10px 14px',
		borderRadius: 6,
		border: 'none',
		color: 'white',
		background: bg,
		fontSize: 14,
		fontWeight: 500,
		cursor: 'pointer',
	};
}
