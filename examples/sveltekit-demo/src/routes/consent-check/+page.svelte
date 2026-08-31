<script lang="ts">
	let { data } = $props();
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50 p-4">
	{#if !data.externalId}
		<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-md">
			<h1 class="mb-4 text-xl font-semibold text-gray-900">Consent Check</h1>
			<p class="mb-4 text-gray-600">
				Please provide an externalId query parameter.
			</p>
			<code class="block rounded bg-gray-100 p-3 text-sm">
				/consent-check?externalId=user_123&type=analytics
			</code>
		</div>
	{:else if data.error}
		<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-md">
			<h1 class="mb-4 text-xl font-semibold text-red-600">Error</h1>
			<p class="mb-2 text-gray-600">Failed to check consent status:</p>
			<code class="block rounded bg-red-50 p-3 text-sm text-red-700">
				{data.error.message}
			</code>
			{#if data.error.code}
				<p class="mt-2 text-sm text-gray-500">Error code: {data.error.code}</p>
			{/if}
		</div>
	{:else}
		<div class="w-full max-w-2xl rounded-lg bg-white p-6 shadow-md">
			<h1 class="mb-4 text-xl font-semibold text-gray-900">Consent Status</h1>

			<div class="mb-4">
				<p class="text-sm text-gray-500">External ID</p>
				<p class="font-mono text-gray-900">{data.externalId}</p>
			</div>

			<div class="mb-4">
				<p class="text-sm text-gray-500">Consent Type</p>
				<p class="font-mono text-gray-900">{data.type}</p>
			</div>

			<div class="border-t pt-4">
				<p class="mb-2 text-sm text-gray-500">Response Data</p>
				<pre
					class="overflow-auto rounded bg-gray-100 p-4 text-sm">{JSON.stringify(
						data.result,
						null,
						2
					)}</pre>
			</div>
		</div>
	{/if}
</div>
