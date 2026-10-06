/**
 * Delivery: `c15t-demo://` links in, verbs out.
 *
 * Both platforms arrive through React Native's own `Linking` module, so one handler
 * serves both. The scheme is registered in `ios/C15tBare/Info.plist` for iOS and by
 * an intent filter in `AndroidManifest.xml` for Android, and everything after that
 * is this file.
 *
 * This is a demo affordance, not a test back door: the same link a reviewer types in
 * a shell is the link a person could follow out of an email or a notes app, and it
 * is the only way to drive the app on a machine with no way to tap the screen.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';

import type { DemoLink } from './parse';
import { linkRequestsReport, parseDemoLink } from './parse';
import type { DemoVerbContext } from './verbs';
import { DEMO_VERB_LINES, DEMO_VERBS, HELP_USAGE } from './verbs';

/** How many receipts to keep on screen. */
const LOG_LIMIT = 8;

/** One link this app answered, and what it said back. */
export interface DemoLinkReceipt {
	/** Milliseconds at the moment the link was answered. */
	readonly at: number;
	/** The verb's answer, which is one line by contract. */
	readonly receipt: string;
	/** The URL as it arrived. */
	readonly url: string;
}

/** What {@link useDemoDeepLinks} reports. */
export interface DemoLinks extends DemoLinkReceipt {
	/** Every receipt, newest first. */
	readonly receipts: readonly DemoLinkReceipt[];
}

/** Find the row a link names. */
const verbFor = (link: DemoLink) =>
	DEMO_VERBS.find((entry) => entry.verb === link.verb);

/**
 * Answer demo links for as long as the app is mounted.
 *
 * @param context - What a verb may touch, read through a ref so the listener never
 *   has to resubscribe as the shell rerenders.
 * @returns The most recent receipt and the ones before it.
 */
export const useDemoDeepLinks = (context: DemoVerbContext): DemoLinks => {
	// The listener is registered once, so it reads the context through a ref that an
	// effect keeps current. A context captured at mount would call the actions and
	// open the sheets of a tree that no longer exists.
	const latest = useRef(context);

	useEffect(() => {
		latest.current = context;
	}, [context]);

	const [receipts, setReceipts] = useState<readonly DemoLinkReceipt[]>([]);
	const handled = useRef<string | null>(null);

	const answer = useCallback(async (url: string): Promise<void> => {
		const link = parseDemoLink(url);

		if (link === null) {
			return;
		}

		// Android hands the launch link to JavaScript twice over a cold start, once
		// from `getInitialURL` and once as an `url` event. A link that grants consent
		// must not run twice because the platform mentioned it twice.
		if (handled.current === link.raw) {
			return;
		}

		handled.current = link.raw;

		const verb = verbFor(link);
		let receipt: string;

		if (link.verb === HELP_USAGE) {
			// The list answers itself. It calls nothing in the SDK, so it is not a row
			// in the table the verbs share.
			receipt = DEMO_VERB_LINES.join('\n');
		} else if (verb === undefined) {
			receipt = `no verb "${link.verb}" - try c15t-demo://help`;
		} else {
			try {
				receipt = await verb.run(latest.current, link);
			} catch (error: unknown) {
				receipt = `${verb.verb} threw: ${error instanceof Error ? error.message : String(error)}`;
			}
		}

		setReceipts((previous) =>
			[{ at: Date.now(), receipt, url: link.raw }, ...previous].slice(
				0,
				LOG_LIMIT
			)
		);

		// `?report=1` puts the tab the receipt is printed on in the same launch as
		// the verb that wrote it, which is the only way an iOS run can show one.
		if (linkRequestsReport(link)) {
			latest.current.showDiagnostics();
		}
	}, []);

	useEffect(() => {
		const subscription = Linking.addEventListener('url', ({ url }) => {
			void answer(url);
		});

		// The link that launched a cold start never arrives as an event.
		const readLaunchLink = async (): Promise<void> => {
			const url = await Linking.getInitialURL();

			if (typeof url === 'string') {
				await answer(url);
			}
		};

		void readLaunchLink();

		return () => {
			subscription.remove();
		};
	}, [answer]);

	const [first] = receipts;

	return {
		at: first?.at ?? 0,
		receipt: first?.receipt ?? 'no link received',
		receipts,
		url: first?.url ?? 'none',
	};
};
