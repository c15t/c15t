import { createConsentRuntime } from '@c15t/core/runtime';
import type { ConsentRuntime } from '@c15t/core/runtime';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

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

const layouts = {
	// A preference UI with its own shared draft.
	ConsentDraftProvider: (children: ReactNode) => (
		<ConsentDraftProvider>{children}</ConsentDraftProvider>
	),
	// A hook used without a draft provider keeps a local store.
	'the useConsentDraft fallback': (children: ReactNode) => children,
} as const;

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
			const tree = (runtime: ConsentRuntime) => (
				<ConsentProvider runtime={runtime}>
					{layouts[layout](<DraftProbe onDraft={onDraft} />)}
				</ConsentProvider>
			);
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
});
