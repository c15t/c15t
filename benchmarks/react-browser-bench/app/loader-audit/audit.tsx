'use client';

import { createConsentRuntime } from '@c15t/core/runtime';
import type { ConsentRuntime, ConsentRuntimeOptions } from '@c15t/core/runtime';
import { createIAB } from '@c15t/iab';
import {
	ConsentProvider,
	ConsentBanner,
	ConsentDialog,
	ConsentWidget,
	hosted,
	offline,
	useActiveUI,
	useSetActiveUI,
} from '@c15t/react';
import { useEffect, useRef, useState } from 'react';

// Exercise the actual Astro island with the same React renderer as the other
// cases. Shared test fixtures keep policy and GVL data deterministic.
import AstroDialog from '../../../../packages/astro/src/components/islands/panel-surface';
import { policyFixture } from '../../../../packages/react/src/__tests__/policy-fixture';
import { mockGVL } from '../../../../packages/react/src/components/iab/__tests__/fixtures/mock-consent-state';

const options = { mode: hosted({ url: '/api/bench-consent' }) };
const Probe = () => {
	useEffect(() => {
		window.dispatchEvent(new CustomEvent('loader-probe-mounted'));
	}, []);
	return (
		<div data-testid="loader-probe">
			<input
				aria-label="Draft"
				defaultValue="initial"
			/>
		</div>
	);
};
const createRuntime = (iab: boolean) => {
	const runtimeOptions: ConsentRuntimeOptions = {
		mode: offline(),
		persistence: false,
		pkg: 'loader-audit',
		prefetch: policyFixture(),
	};
	if (iab) {
		runtimeOptions.prefetch = {
			...policyFixture({}, { model: 'iab' }),
			initialIab: { cmpId: 42, enabled: true, gvl: mockGVL },
		};
		runtimeOptions.createIAB = createIAB;
		runtimeOptions.iab = { cmpId: 42, gvl: mockGVL };
	}
	return createConsentRuntime(runtimeOptions);
};
const LoadedSurface = ({
	variant,
	runtime,
}: {
	variant: string;
	runtime: ConsentRuntime | null;
}) => {
	if (variant === 'widget') {
		return <ConsentWidget />;
	}
	if (variant === 'external' && runtime) {
		return (
			<ConsentProvider runtime={runtime}>
				<Probe />
			</ConsentProvider>
		);
	}
	if (variant === 'astro-iab' && runtime) {
		return (
			<AstroDialog
				runtime={runtime}
				options={{}}
				kind="iab"
			/>
		);
	}
	return (
		<ConsentDialog.Root>
			<ConsentDialog.Card>
				<ConsentDialog.Header>
					<ConsentDialog.HeaderTitle />
				</ConsentDialog.Header>
				<ConsentDialog.Content>Ready</ConsentDialog.Content>
			</ConsentDialog.Card>
		</ConsentDialog.Root>
	);
};
const Surface = ({ variant }: { variant: string }) => {
	const active = useActiveUI();
	const setActive = useSetActiveUI();
	const button = useRef<HTMLButtonElement>(null);
	const [runtime, setRuntime] = useState<ConsentRuntime | null>(null);
	useEffect(() => {
		button.current?.setAttribute('data-hydrated', 'true');
		if (variant !== 'external' && variant !== 'astro-iab') {
			return;
		}
		const instance = createRuntime(variant === 'astro-iab');
		instance.start();
		instance.kernel.set.activeUI('dialog');
		// oxlint-disable-next-line react/set-state-in-effect -- Publish the external runtime owned by this effect; StrictMode cleanup must dispose each instance.
		setRuntime(instance);
		return () => instance.dispose();
	}, [variant]);
	return (
		<>
			<button
				ref={button}
				type="button"
				id="reopen-dialog"
				data-active-ui={active}
				onClick={() => setActive('dialog')}
			>
				Reopen
			</button>
			{active === 'dialog' && (
				<LoadedSurface
					variant={variant}
					runtime={runtime}
				/>
			)}
		</>
	);
};
export const LoaderAudit = ({ variant }: { variant: string }) => (
	<ConsentProvider options={options}>
		<ConsentBanner />
		<Surface variant={variant} />
	</ConsentProvider>
);
