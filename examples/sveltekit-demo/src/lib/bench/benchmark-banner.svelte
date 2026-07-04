<script lang="ts">
	let {
		title = 'Benchmark Consent Banner',
		description = 'Deterministic benchmark fixture.',
		onAccept,
	}: {
		title?: string;
		description?: string;
		onAccept: () => void | Promise<void>;
	} = $props();
</script>

<div
	data-testid="consent-banner-root"
	style="position: fixed; left: 24px; right: 24px; bottom: 24px; max-width: 420px; padding: 16px; border: 1px solid #d0d7de; border-radius: 12px; background: #ffffff; color: #0f172a; box-shadow: 0 12px 40px rgba(15, 23, 42, 0.12); font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;"
>
	<div style="display: grid; gap: 10px;">
		<div style="display: grid; gap: 6px;">
			<div style="font-size: 16px; font-weight: 600;">{title}</div>
			<div style="font-size: 14px; line-height: 1.45; color: #475569;">
				{description}
			</div>
		</div>
		<button
			data-testid="consent-banner-accept-button"
			onclick={() => void onAccept()}
			style="display: inline-flex; align-items: center; justify-content: center; min-height: 40px; padding: 0 14px; border: 0; border-radius: 10px; background: #0f172a; color: #ffffff; font-size: 14px; font-weight: 600; cursor: pointer;"
			type="button"
		>
			Accept All
		</button>
	</div>
</div>

