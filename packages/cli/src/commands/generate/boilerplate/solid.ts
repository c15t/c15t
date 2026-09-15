import { DEFAULT_OFFLINE_RULES } from '../templates/shared/options';
import {
	generateScriptsArrayValue,
	generateScriptsImport,
} from '../templates/shared/scripts';
import type { BoilerplateOptions, BoilerplateTemplate } from './types';

/** Generate a Solid owner-scoped runtime and native headless consent controls. */
export const generateSolidBoilerplate = (
	options: BoilerplateOptions
): BoilerplateTemplate => {
	const hosted = options.mode === 'hosted';
	if (hosted && !options.backendURL) {
		throw new Error('Hosted Solid boilerplate requires a backend URL.');
	}
	return {
		dependencies: [
			'@c15t/core',
			...(options.scripts.length ? ['@c15t/scripts'] : []),
		],
		files: {
			'Consent.tsx': `import { createContext, createSignal, For, onCleanup, onMount, Show, useContext } from 'solid-js';
import type { Accessor, JSX } from 'solid-js';
import type { ConsentSnapshot, ConsentState } from '@c15t/core';
import { createSiteConsent } from './consent-runtime';
import './consent.css';

type SiteRuntime = ReturnType<typeof createSiteConsent>;
const ConsentContext = createContext<{ runtime: Accessor<SiteRuntime | undefined>; snapshot: Accessor<ConsentSnapshot | undefined> }>();

export function useSiteConsent() {
	const context = useContext(ConsentContext);
	if (!context) throw new Error('useSiteConsent must be used within Consent.');
	return context;
}

export function Consent(props: { children: JSX.Element }) {
	const [runtime, setRuntime] = createSignal<SiteRuntime>();
	const [snapshot, setSnapshot] = createSignal<ConsentSnapshot>();
	onMount(() => {
		const owner = createSiteConsent();
		setRuntime(owner);
		setSnapshot(owner.kernel.getSnapshot());
		const unsubscribe = owner.kernel.subscribe(setSnapshot);
		onCleanup(() => { unsubscribe(); owner.dispose(); });
		owner.start();
	});
	return (
		<ConsentContext.Provider value={{ runtime, snapshot }}>
			{props.children}
			<ConsentControls />
		</ConsentContext.Provider>
	);
}

function ConsentControls() {
	const { runtime, snapshot } = useSiteConsent();
	const [preferences, setPreferences] = createSignal(false);
	const [draft, setDraft] = createSignal<Partial<ConsentState>>({});
	const [busy, setBusy] = createSignal(false);
	const [message, setMessage] = createSignal('');
	const categories = () => snapshot()?.policyRule.scope ?? [];
	const available = () => snapshot() && !snapshot()?.policyPending && snapshot()?.model !== 'none' && snapshot()?.model !== 'iab';
	const can = (action: 'accept' | 'reject' | 'customize' | 'dismiss') => preferences() || snapshot()?.policyRule.actions.allowed.includes(action);
	const openPreferences = () => { setDraft({}); setMessage(''); runtime()?.kernel.set.activeUI('dialog'); setPreferences(true); };
	const save = async (choice: 'all' | 'none' | 'custom' | 'dismiss') => {
		const owner = runtime();
		if (!owner || busy()) return;
		setBusy(true);
		setMessage('');
		try {
			const values: Partial<ConsentState> = {};
			for (const category of categories()) values[category] = draft()[category] ?? owner.kernel.getSnapshot().effectivePermissions[category];
			const result = choice === 'dismiss'
				? await owner.kernel.commands.dismissNotice()
				: await owner.kernel.commands.save(choice === 'custom' ? values : choice);
			if (!result.ok) setMessage('Your choice could not be confirmed. Please try again.');
			else { setPreferences(false); setMessage('Privacy preferences saved.'); }
		} catch { setMessage('Your choice could not be confirmed. Please try again.'); }
		finally { setBusy(false); }
	};
	return (
		<div class="site-consent">
			<Show when={available()}>
				<button type="button" onClick={openPreferences}>Privacy settings</button>
				<Show when={snapshot()?.activeUI === 'banner' || preferences()}>
					<section aria-label="Privacy preferences" aria-busy={busy()}>
						<h2>Privacy preferences</h2>
						<p>Choose which optional services this site may use. Necessary services remain enabled.</p>
						<Show when={preferences()}>
							<fieldset disabled={busy()}>
								<legend>Optional services</legend>
								<For each={categories()}>{(category) => (
									<label><input type="checkbox" checked={draft()[category] ?? snapshot()?.effectivePermissions[category] ?? false}
										onChange={(event) => setDraft({ ...draft(), [category]: event.currentTarget.checked })} />{category}</label>
								)}</For>
							</fieldset>
						</Show>
						<div class="site-consent-actions">
							<Show when={can('reject')}><button disabled={busy()} type="button" onClick={() => void save('none')}>Reject optional</button></Show>
							<Show when={can('accept')}><button disabled={busy()} type="button" onClick={() => void save('all')}>Accept optional</button></Show>
							<Show when={!preferences() && can('customize')}><button disabled={busy()} type="button" onClick={openPreferences}>Customize</button></Show>
							<Show when={!preferences() && can('dismiss')}><button disabled={busy()} type="button" onClick={() => void save('dismiss')}>Understood</button></Show>
							<Show when={preferences()}><button disabled={busy()} type="button" onClick={() => void save('custom')}>Save preferences</button></Show>
						</div>
					</section>
				</Show>
			</Show>
			<Show when={snapshot()?.model === 'iab'}><p role="alert">This consent policy requires an IAB consent interface. Configure a supported IAB adapter before using it.</p></Show>
			<p role="status">{message()}</p>
		</div>
	);
}
`,
			'consent-runtime.ts': `import { ${hosted ? 'hosted' : 'createOfflineTransport, custom'} } from '@c15t/core';
import { createConsentRuntime } from '@c15t/core/runtime';
${generateScriptsImport(options.scripts)}

// Construction is pure; the Solid component starts this only after mounting.
export function createSiteConsent() {
	return createConsentRuntime({
		mode: ${hosted ? `hosted({ url: ${JSON.stringify(options.backendURL)} })` : `custom(createOfflineTransport({ policyRules: ${DEFAULT_OFFLINE_RULES} }))`},
		scripts: ${generateScriptsArrayValue(options.scripts)},
	});
}
`,
			'consent.css': `.site-consent { font: inherit; }
.site-consent section { padding: 1rem; border: 1px solid currentColor; margin-block: 1rem; }
.site-consent label { display: flex; gap: .5rem; align-items: center; min-height: 44px; }
.site-consent input { width: 1.25rem; height: 1.25rem; }
.site-consent button { min-height: 44px; padding: .5rem 1rem; font: inherit; cursor: pointer; }
.site-consent button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.site-consent-actions { display: flex; flex-wrap: wrap; gap: .5rem; }
`,
		},
		instructions: [
			'Import { Consent } from "{{output}}/Consent" in the Solid application root and wrap its existing children with <Consent>. Keep it mounted above route changes. The runtime is created onMount and disposed with its Solid owner; server rendering does not initialize browser state.',
			'Use useSiteConsent() inside the wrapper to read snapshot()?.effectivePermissions for consent gates. The snapshot is unavailable until browser mount, so treat missing optional permissions as denied.',
			'This is a headless Solid integration with native inline controls. The local @c15t/solid package currently exports styling primitives only. Review the copy, privacy links, category descriptions, and policy presentation for your site. The generated UI does not implement IAB TCF or modal policy presentation.',
			...(options.scripts.length
				? [
						'Replace vendor placeholders in {{output}}/consent-runtime.ts. The shared runtime owns consent-gated loading, persistence, and cleanup.',
					]
				: []),
		],
	};
};
