/**
 * The provider contract: one handshake for the whole tree, and a hard stop
 * when the embedded binary cannot speak the protocol.
 *
 * Rendered with `react-dom` in a DOM; the TurboModule behind it is the fake
 * module, reached through the faithful `react-native` stub the package's
 * Vitest config aliases in.
 */

import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, test } from 'vitest';

import {
	captureErrorMessage,
	createFakeNativeModule,
	FAKE_BOOTSTRAP,
	renderTree,
} from '../../__tests__/helpers/fake-native';
import {
	emitterState,
	resetNativeStub,
} from '../../__tests__/helpers/react-native-stub';
import { useC15tBootstrap } from '../../hooks/use-c15t-bootstrap';
import { useConsent } from '../../hooks/use-consent';
import { resetConsentClient } from '../../native/client';
import { C15tProvider } from '../c15t-provider';

/** Render the revision, so a test can see which consumers updated. */
const RevisionProbe = (): ReactNode => {
	const snapshot = useConsent();

	return <span>{`r${String(snapshot.revision)}`}</span>;
};

/** Render the handshake payload the provider read once. */
const BootstrapProbe = (): ReactNode => {
	const bootstrap = useC15tBootstrap();

	return (
		<span>{`${bootstrap.nativeSdkVersion}/${String(bootstrap.protocolVersion)}`}</span>
	);
};

/** Five children under one provider. */
const FiveConsumers = (): ReactNode => (
	<>
		{Array.from({ length: 5 }, (_unused, index) => (
			<RevisionProbe key={index} />
		))}
	</>
);

afterEach(() => {
	resetConsentClient();
	resetNativeStub();
});

describe('handshake', () => {
	test('calls getBootstrap once for five mounted consumers', () => {
		const fake = createFakeNativeModule();

		const tree = renderTree(
			<C15tProvider>
				<FiveConsumers />
			</C15tProvider>
		);

		expect(fake.bootstrapCalls).toBe(1);
		expect(tree.text()).toBe('r0r0r0r0r0');

		tree.unmount();
	});

	test('calls getBootstrap once for five separate providers', () => {
		const fake = createFakeNativeModule();

		const tree = renderTree(
			<>
				{Array.from({ length: 5 }, (_unused, index) => (
					<C15tProvider key={index}>
						<RevisionProbe />
					</C15tProvider>
				))}
			</>
		);

		expect(fake.bootstrapCalls).toBe(1);
		expect(tree.text()).toBe('r0r0r0r0r0');

		tree.unmount();
	});

	test('a nested provider reuses the ancestor client and one emitter', () => {
		const fake = createFakeNativeModule();

		const tree = renderTree(
			<C15tProvider>
				<C15tProvider>
					<RevisionProbe />
				</C15tProvider>
			</C15tProvider>
		);

		expect(fake.bootstrapCalls).toBe(1);
		expect(emitterState.instances).toBe(1);

		tree.unmount();
	});

	test('publishes the handshake payload to the tree', () => {
		createFakeNativeModule();

		const tree = renderTree(
			<C15tProvider>
				<BootstrapProbe />
			</C15tProvider>
		);

		expect(tree.text()).toBe(
			`rn->9.9.9/${String(FAKE_BOOTSTRAP.protocolVersion)}`
		);

		tree.unmount();
	});
});

describe('protocol version guard', () => {
	test('stops the tree on a native build ahead of this bundle', () => {
		createFakeNativeModule({
			bootstrap: { ...FAKE_BOOTSTRAP, protocolVersion: 99 },
		});

		const message = captureErrorMessage(() =>
			renderToStaticMarkup(
				<C15tProvider>
					<RevisionProbe />
				</C15tProvider>
			)
		);

		expect(message).toContain('protocol 99');
		expect(message).toContain('Rebuild the app');
	});

	test('stops the tree on a native build behind this bundle', () => {
		createFakeNativeModule({
			bootstrap: { ...FAKE_BOOTSTRAP, protocolVersion: 0 },
		});

		expect(
			captureErrorMessage(() =>
				renderToStaticMarkup(
					<C15tProvider>
						<RevisionProbe />
					</C15tProvider>
				)
			)
		).toContain('protocol 0');
	});

	test('stops the tree when the native build reports no protocol', () => {
		createFakeNativeModule({ bootstrap: { nativeSdkVersion: 'rn->1.0.0' } });

		expect(
			captureErrorMessage(() =>
				renderToStaticMarkup(
					<C15tProvider>
						<RevisionProbe />
					</C15tProvider>
				)
			)
		).toContain('no protocolVersion');
	});

	test('stops the tree when the native module is missing', () => {
		// Expo Go, a missing pod, or a web bundle: nothing is registered.
		expect(
			captureErrorMessage(() =>
				renderToStaticMarkup(
					<C15tProvider>
						<RevisionProbe />
					</C15tProvider>
				)
			)
		).toContain('cannot reach its native consent module');
	});
});

describe('wiring', () => {
	test('a hook outside a provider says what is missing', () => {
		expect(
			captureErrorMessage(() => renderToStaticMarkup(<RevisionProbe />))
		).toContain('<C15tProvider>');
	});
});
