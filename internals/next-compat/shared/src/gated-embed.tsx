import { ConsentGate } from '@c15t/nextjs';

/** Path of the stub's counted embed document. */
export const GATED_EMBED_PATH = '/api/c15t/__compat/embed';

/**
 * A marketing-gated iframe rendered straight from a page, with no `Suspense`
 * boundary of its own, so it lands in the route's prerendered shell.
 */
export const GatedEmbed = () => (
	<ConsentGate category="marketing">
		<iframe
			data-testid="compat-gated-embed"
			sandbox=""
			src={GATED_EMBED_PATH}
			title="Gated embed"
		/>
	</ConsentGate>
);
