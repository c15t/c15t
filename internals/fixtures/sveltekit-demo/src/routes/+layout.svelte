<script lang="ts">
	import '../app.css';

	// Each area owns its consent provider: the showcase in `(showcase)`, and
	// the documented recipes in `consent-example`, `manifest-example` and
	// `headless-example`. Benchmarks render without one.
	let { children } = $props();
</script>

{@render children()}
