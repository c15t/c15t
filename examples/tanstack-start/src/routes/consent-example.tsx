import { createFileRoute } from '@tanstack/react-router';

import { ConsentExample } from '../demo/consent-example';

import demoCss from '../demo/consent-example.css?url';

export const Route = createFileRoute('/consent-example')({
	component: ConsentExample,
	head: () => ({ links: [{ href: demoCss, rel: 'stylesheet' }] }),
});
