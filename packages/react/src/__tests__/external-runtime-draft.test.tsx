import { createConsentRuntime } from '@c15t/core/runtime';
import type { ConsentRuntime } from '@c15t/core/runtime';
import { useContext, useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { KernelContext } from '../context';
import type { ConsentDraftHandle } from '../index';
import {
	ConsentDraftProvider,
	ConsentProvider,
	offline,
	useConsentDraft,
} from '../index';
import { policyFixture } from './policy-fixture';

const createRuntime = function createRuntime(): ConsentRuntime {
	return createConsentRuntime({
		consentCategories: [
			'functionality',
			'experience',
			'measurement',
			'marketing',
		],
		mode: offline(),
		persistence: false,
		pkg: '@c15t/react-external-draft-test',
		prefetch: policyFixture({ experience: false, measurement: false }),
	});
};

const DraftProbe = ({
	onDraft,
}: {
	onDraft: (draft: ConsentDraftHandle) => void;
}) => {
	const draft = useConsentDraft();
	onDraft(draft);
	return <output data-testid="draft">{JSON.stringify(draft.values)}</output>;
};

/** Calls `onSwitch` from a layout effect whenever the kernel in context changes. */
const SwitchCaller = ({ onSwitch }: { onSwitch: () => void }) => {
	const kernel = useContext(KernelContext);
	const previous = useRef(kernel);
	useLayoutEffect(() => {
		if (previous.current !== kernel) {
			previous.current = kernel;
			onSwitch();
		}
	});
	return null;
};

type Layout = (input: {
	/** The runtime the switching provider renders. */
	runtime: ConsentRuntime;
	/** The runtime the test starts on, which an outer provider keeps. */
	first: ConsentRuntime;
	probe: ReactNode;
}) => ReactNode;

const layouts: Record<string, Layout> = {
	// A preference UI with its own shared draft.
	ConsentDraftProvider: ({ runtime, probe }) => (
		<ConsentProvider runtime={runtime}>
			<ConsentDraftProvider>{probe}</ConsentDraftProvider>
		</ConsentProvider>
	),
	// An outer draft stays bound to the outer provider's runtime, so a
	// nested provider that switches must not inherit it.
	'a nested ConsentDraftProvider under an outer draft': ({
		first,
		runtime,
		probe,
	}) => (
		<ConsentProvider runtime={first}>
			<ConsentDraftProvider>
				<ConsentProvider runtime={runtime}>
					<ConsentDraftProvider>{probe}</ConsentDraftProvider>
				</ConsentProvider>
			</ConsentDraftProvider>
		</ConsentProvider>
	),
	// A hook used without a draft provider keeps a local store.
	'the useConsentDraft fallback': ({ runtime, probe }) => (
		<ConsentProvider runtime={runtime}>{probe}</ConsentProvider>
	),
	'the useConsentDraft fallback under an outer draft': ({
		first,
		runtime,
		probe,
	}) => (
		<ConsentProvider runtime={first}>
			<ConsentDraftProvider>
				<ConsentProvider runtime={runtime}>{probe}</ConsentProvider>
			</ConsentDraftProvider>
		</ConsentProvider>
	),
};

describe('drafts under a provider whose runtime is replaced', () => {
	test.each(Object.keys(layouts) as (keyof typeof layouts)[])(
		'%s drops the previous runtime draft and saves into the new runtime only',
		async (layout) => {
			const first = createRuntime();
			const second = createRuntime();
			const firstSave = vi.spyOn(first.kernel.commands, 'save');
			const firstChoice = first.kernel.getSnapshot().explicitChoice;
			let draft: ConsentDraftHandle | undefined;
			const onDraft = (value: ConsentDraftHandle) => {
				draft = value;
			};
			const tree = (runtime: ConsentRuntime) =>
				layouts[layout]?.({
					first,
					probe: <DraftProbe onDraft={onDraft} />,
					runtime,
				});
			const screen = await render(tree(first));
			try {
				// Staged on the first runtime and never saved there.
				draft?.set('measurement', true);
				await vi.waitFor(() => expect(draft?.values.measurement).toBe(true));

				await screen.rerender(tree(second));
				await vi.waitFor(() => expect(draft?.values.measurement).toBe(false));
				expect(draft?.isDirty).toBe(false);

				draft?.set('experience', true);
				await vi.waitFor(() => expect(draft?.values.experience).toBe(true));
				const result = await draft?.save();

				expect(result?.ok).toBe(true);
				const categories =
					second.kernel.getSnapshot().explicitChoice?.categories;
				expect(categories?.experience?.value).toBe(true);
				expect(categories?.measurement?.value).toBe(false);
				expect(firstSave).not.toHaveBeenCalled();
				expect(first.kernel.getSnapshot().explicitChoice).toBe(firstChoice);
			} finally {
				screen.unmount();
				first.dispose();
				second.dispose();
			}
		}
	);

	// Covers every layout. Under an outer draft the pre-switch handle is the
	// outer store, which stays live for the outer provider, so the handle
	// itself must notice that the nested provider moved to another runtime.
	test.each(Object.keys(layouts))(
		'a handle kept from before the switch refuses to save (%s)',
		async (layout) => {
			const first = createRuntime();
			const second = createRuntime();
			const firstSave = vi.spyOn(first.kernel.commands, 'save');
			const secondSave = vi.spyOn(second.kernel.commands, 'save');
			let draft: ConsentDraftHandle | undefined;
			let retained: ConsentDraftHandle | undefined;
			let duringCommit: Promise<unknown> | undefined;
			const onDraft = (value: ConsentDraftHandle) => {
				draft = value;
			};
			const tree = (runtime: ConsentRuntime) =>
				layouts[layout]?.({
					first,
					probe: (
						<>
							<DraftProbe onDraft={onDraft} />
							<SwitchCaller
								onSwitch={() => {
									// A descendant layout effect in the switch commit,
									// before any passive effect of that commit runs.
									duringCommit = retained?.save();
								}}
							/>
						</>
					),
					runtime,
				});
			const screen = await render(tree(first));
			try {
				draft?.set('measurement', true);
				await vi.waitFor(() => expect(draft?.values.measurement).toBe(true));
				// An async submit that started on the first runtime keeps this.
				retained = draft;

				await screen.rerender(tree(second));
				await vi.waitFor(() => expect(draft).not.toBe(retained));

				await expect(retained?.save()).resolves.toEqual({ ok: false });
				await expect(duringCommit).resolves.toEqual({ ok: false });
				expect(firstSave).not.toHaveBeenCalled();
				expect(secondSave).not.toHaveBeenCalled();
			} finally {
				screen.unmount();
				first.dispose();
				second.dispose();
			}
		}
	);

	test('a handle kept after the preference UI unmounts still saves to its runtime', async () => {
		const runtime = createRuntime();
		let draft: ConsentDraftHandle | undefined;
		const screen = await render(
			layouts.ConsentDraftProvider?.({
				first: runtime,
				probe: (
					<DraftProbe
						onDraft={(value) => {
							draft = value;
						}}
					/>
				),
				runtime,
			})
		);
		try {
			draft?.set('measurement', true);
			await vi.waitFor(() => expect(draft?.values.measurement).toBe(true));
			const retained = draft;
			screen.unmount();

			// Same runtime: closing the dialog before an async submit finishes
			// must not lose the visitor's choice.
			await expect(retained?.save()).resolves.toMatchObject({ ok: true });
			expect(
				runtime.kernel.getSnapshot().explicitChoice?.categories.measurement
					?.value
			).toBe(true);
		} finally {
			runtime.dispose();
		}
	});
});
