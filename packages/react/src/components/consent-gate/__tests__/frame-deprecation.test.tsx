import { afterEach, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';

import { policyFixture } from '~/__tests__/policy-fixture';
import { ConsentProvider } from '~/provider';
import { offline } from '~/transports/offline';

import { Frame } from '../frame';
import { ConsentGate } from '../index';

afterEach(() => {
	vi.restoreAllMocks();
});

test('Frame renders the ConsentGate and warns once that it is deprecated', async () => {
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	const options = {
		mode: offline(),
		persistence: false,
		prefetch: policyFixture(),
	};
	const screen = await render(
		<ConsentProvider options={options}>
			<Frame
				category="marketing"
				data-testid="old"
			>
				<p>embed</p>
			</Frame>
			<Frame
				category="measurement"
				data-testid="old-again"
			>
				<p>embed</p>
			</Frame>
			<ConsentGate
				category="marketing"
				data-testid="new"
			>
				<p>embed</p>
			</ConsentGate>
		</ConsentProvider>
	);

	await expect.element(screen.getByTestId('old')).toBeInTheDocument();
	await expect.element(screen.getByTestId('old-again')).toBeInTheDocument();
	const frameWarnings = warn.mock.calls.filter(([message]) =>
		String(message).includes('`Frame` is deprecated')
	);
	expect(frameWarnings).toHaveLength(1);
	expect(String(frameWarnings[0]?.[0])).toContain('Use `ConsentGate`');
});

test('the Frame parts are the ConsentGate parts under their old names', () => {
	expect(Frame.Root.displayName).toBe('FrameRoot');
	expect(Frame.Title.displayName).toBe('FrameTitle');
	expect(Frame.Button.displayName).toBe('FrameButton');
});
