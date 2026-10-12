import { EARLY_CONSENT_TAP_SCRIPT } from '@c15t/core/surface-actions';
import { createStaticVNode, defineComponent, onMounted, ref } from 'vue';

const escapeAttribute = (value: string): string =>
	value.replaceAll('&', '&amp;').replaceAll('"', '&quot;');

/**
 * The inline script that keeps a banner tap made before hydration.
 *
 * A server-rendered banner shows long before Vue attaches its handlers.
 * This script records an accept, reject, dismiss or customize tap in that
 * gap and hides the banner; the banner records the choice once it mounts.
 * See `@c15t/core/surface-actions`.
 *
 * Static markup: the server writes it as is, hydration adopts the element
 * without comparing it, and a banner Vue renders in the browser parses it
 * through a template, so the script never runs there. Once mounted the
 * banner's own handlers work, so it renders nothing.
 *
 * @internal
 */
export default defineComponent({
	name: 'ConsentEarlyTapScript',
	props: {
		nonce: { default: undefined, type: String },
	},
	setup(props) {
		const mounted = ref(false);
		onMounted(() => {
			mounted.value = true;
		});
		return function render() {
			if (mounted.value) {
				return null;
			}
			const nonce = props.nonce
				? ` nonce="${escapeAttribute(props.nonce)}"`
				: '';
			return createStaticVNode(
				`<script${nonce}>${EARLY_CONSENT_TAP_SCRIPT}</script>`,
				1
			);
		};
	},
});
