// oxlint-disable no-use-before-define -- TanStack Router's file-route shape: the component reads its own route's loader data.
// #region docs:shopify-tanstack-start-root title="src/routes/__root.tsx"
import { createShopifyCustomerPrivacy } from '@c15t/integrations/shopify';
import { ShopifyScripts } from '@shopify/hydrogen/react';
import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
	useRouter,
} from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import type { AllConsentNames } from 'c15t/tanstack-start';
import {
	ConsentBanner,
	ConsentDialog,
	ConsentDialogLink,
	ConsentRoot,
	useSnapshot,
} from 'c15t/tanstack-start';
import {
	consentLoaderOptions,
	createConsentStateHandler,
} from 'c15t/tanstack-start/server';
import { useEffect } from 'react';

import { i18n, shop } from '../lib/shop';

const getConsentState = createServerFn({ method: 'GET' }).handler(
	createConsentStateHandler()
);

// One bridge per page. Its `setup` holds Hydrogen's analytics until Shopify
// has the visitor's choice.
const shopifyPrivacy = createShopifyCustomerPrivacy();

// Shopify's scripts load outside c15t, so declare the categories the bridge
// maps. Without them the dialog offers only Necessary.
const consentCategories: AllConsentNames[] = [
	'measurement',
	'marketing',
	'functionality',
];

const options = { consentCategories };

/** Sends each c15t snapshot to Shopify. Render it inside `ConsentRoot`. */
const ShopifyConsentSync = () => {
	const snapshot = useSnapshot();
	useEffect(() => shopifyPrivacy.update(snapshot), [snapshot]);
	return null;
};

const RootComponent = () => {
	const { consent } = Route.useLoaderData();
	const router = useRouter();
	return (
		<html lang="en">
			<head>
				<HeadContent />
				<ShopifyScripts
					consent={{ mode: 'custom-banner', setup: shopifyPrivacy.setup }}
					i18n={i18n}
					navigate={(url) => router.navigate({ href: url })}
					shop={shop}
				/>
			</head>
			<body>
				<ConsentRoot
					state={consent}
					options={options}
				>
					<ShopifyConsentSync />
					<Outlet />
					<ConsentBanner />
					<ConsentDialog />
					<footer>
						<ConsentDialogLink>Privacy settings</ConsentDialogLink>
					</footer>
				</ConsentRoot>
				<Scripts />
			</body>
		</html>
	);
};

export const Route = createRootRoute({
	...consentLoaderOptions,
	component: RootComponent,
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{ content: 'width=device-width, initial-scale=1', name: 'viewport' },
		],
	}),
	loader: async () => ({ consent: await getConsentState() }),
});
// #endregion docs:shopify-tanstack-start-root
