'use client';

import type { AllConsentNames } from '@c15t/core';
import type { Script } from '@c15t/core/modules/script-loader';
import {
	ConsentDialogLink,
	useConsent,
	useConsentDraft,
	useEffectivePermissions,
	useExplicitChoice,
	useIframeBlocker,
	useSaveConsents,
} from '@c15t/react';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';

const CATEGORIES: AllConsentNames[] = [
	'necessary',
	'functionality',
	'marketing',
	'measurement',
	'experience',
];

interface HarnessDiagnosticsProps {
	scripts: Script[];
}

const ModuleMount = () => {
	useIframeBlocker();
	return null;
};
const sectionStyle: CSSProperties = {
	background: '#fff',
	border: '1px solid #e2e8f0',
	borderRadius: 8,
	marginTop: '2rem',
	padding: '1.5rem',
};
const btnStyle = function btnStyle(bg: string): CSSProperties {
	return {
		background: bg,
		border: 'none',
		borderRadius: 6,
		color: 'white',
		cursor: 'pointer',
		fontSize: 14,
		fontWeight: 500,
		padding: '10px 14px',
	};
};
const ConsentControls = () => {
	const draft = useConsentDraft();
	const saveConsents = useSaveConsents();
	const hasStoredChoice = Boolean(useExplicitChoice());

	return (
		<section style={sectionStyle}>
			<h2 style={{ marginTop: 0 }}>Consent controls (preference center)</h2>
			<p style={{ color: '#555', margin: '0 0 1rem 0' }}>
				Has stored choice: <strong>{String(hasStoredChoice)}</strong>
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
							alignItems: 'center',
							background: '#f8fafc',
							borderRadius: 6,
							cursor: category === 'necessary' ? 'not-allowed' : 'pointer',
							display: 'flex',
							gap: 8,
							opacity: category === 'necessary' ? 0.6 : 1,
							padding: 10,
						}}
					>
						<input
							type="checkbox"
							checked={draft.values[category]}
							disabled={category === 'necessary'}
							onChange={(event) => draft.set(category, event.target.checked)}
						/>
						<span style={{ fontWeight: 500 }}>{category}</span>
					</label>
				))}
			</div>

			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
				<button
					type="button"
					onClick={async () => {
						await draft.save();
					}}
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
					onClick={async () => {
						await saveConsents('all');
					}}
					style={btnStyle('#2563eb')}
				>
					Accept All (commit)
				</button>
				<button
					type="button"
					onClick={async () => {
						await saveConsents('none');
					}}
					style={btnStyle('#dc2626')}
				>
					Reject All (commit)
				</button>
			</div>
		</section>
	);
};
const preStyle: CSSProperties = {
	background: '#f8fafc',
	borderRadius: 6,
	fontSize: 13,
	margin: 0,
	overflow: 'auto',
	padding: 12,
};
const ConsentDebug = () => {
	const consents = useEffectivePermissions();
	const draft = useConsentDraft();

	return (
		<section style={sectionStyle}>
			<h2 style={{ marginTop: 0 }}>Consent state</h2>
			<div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
				<div>
					<h3 style={{ fontSize: 14, margin: '0 0 6px 0' }}>
						Committed (kernel - gates scripts)
					</h3>
					<pre style={preStyle}>{JSON.stringify(consents, null, 2)}</pre>
				</div>
				<div>
					<h3 style={{ fontSize: 14, margin: '0 0 6px 0' }}>
						Draft (UI - not yet saved)
					</h3>
					<pre style={preStyle}>{JSON.stringify(draft.values, null, 2)}</pre>
				</div>
			</div>
		</section>
	);
};
const cellHead: CSSProperties = {
	fontSize: 13,
	fontWeight: 600,
	padding: 8,
	textAlign: 'left',
};
const cellBody: CSSProperties = {
	fontSize: 13,
	padding: 8,
};
const LoadedScripts = ({ scripts }: HarnessDiagnosticsProps) => {
	const [loaded, setLoaded] = useState<string[]>([]);
	const consents = useEffectivePermissions();

	useEffect(() => {
		const updateLoaded = () => {
			const scriptNodes = Array.from(
				document.head.querySelectorAll('script[id^="c15t"]')
			);
			setLoaded(
				scriptNodes.map((script) => {
					const src = script.getAttribute('src') ?? '';
					return `${script.id} -> ${src}`;
				})
			);
		};

		const handle = setTimeout(updateLoaded, 20);
		const observer = new MutationObserver(updateLoaded);
		observer.observe(document.head, {
			attributeFilter: ['id', 'src'],
			attributes: true,
			childList: true,
			subtree: true,
		});

		return () => {
			clearTimeout(handle);
			observer.disconnect();
		};
	}, []);

	const expected = scripts.map((script) => {
		const active = consents[script.category as AllConsentNames] ?? false;
		return {
			active,
			category: script.category,
			id: script.id,
			src: script.src,
		};
	});

	return (
		<section style={sectionStyle}>
			<h2 style={{ marginTop: 0 }}>Loaded scripts</h2>
			<p style={{ color: '#555', margin: '0 0 0.75rem 0' }}>
				Live view of <code>document.head</code>. Green = eligible per current
				consent and mounted.
			</p>
			<table
				style={{ borderCollapse: 'collapse', fontSize: 14, width: '100%' }}
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
							entry.includes(`-> ${row.src}`)
						);
						return (
							<tr
								key={row.id}
								style={{ borderTop: '1px solid #e2e8f0' }}
							>
								<td style={cellBody}>
									<code>{row.id}</code>
								</td>
								<td style={cellBody}>{String(row.category)}</td>
								<td style={cellBody}>
									<span style={{ color: row.active ? '#16a34a' : '#94a3b8' }}>
										{row.active ? 'yes' : 'no'}
									</span>
								</td>
								<td style={cellBody}>
									<span style={{ color: inDom ? '#16a34a' : '#dc2626' }}>
										{inDom ? 'loaded' : '-'}
									</span>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
			{loaded.length === 0 ? (
				<p style={{ color: '#94a3b8', fontSize: 13, marginTop: 12 }}>
					No c15t-managed scripts in the DOM yet. Click &quot;Accept All&quot;
					or toggle a category.
				</p>
			) : null}
		</section>
	);
};
const SnapshotDebug = () => {
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
				do not re-render.
			</p>
			<ul style={{ margin: 0, paddingLeft: 20 }}>
				<li>
					<code>useConsent(&apos;marketing&apos;)</code>: {String(marketing)}
				</li>
				<li>
					<code>useConsent(&apos;measurement&apos;)</code>:{' '}
					{String(measurement)}
				</li>
				<li>
					<code>useConsent(&apos;functionality&apos;)</code>:{' '}
					{String(functionality)}
				</li>
			</ul>
		</section>
	);
};
const Diagnostics = ({ scripts }: HarnessDiagnosticsProps) => (
	<>
		<ModuleMount />
		<ConsentControls />
		<ConsentDebug />
		<LoadedScripts scripts={scripts} />
		<SnapshotDebug />
		<div style={{ color: '#64748b', fontSize: 13, marginTop: '2rem' }}>
			<ConsentDialogLink>Change your privacy preferences</ConsentDialogLink>
		</div>
	</>
);

export default Diagnostics;
