<script lang="ts">
	let { data } = $props();
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
	{#if !data.externalId}
		<div class="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
			<h1 class="text-xl font-semibold text-gray-900 mb-4">Consent Check</h1>
			<p class="text-gray-600 mb-4">
				Please provide an externalId query parameter.
			</p>
			<code class="block bg-gray-100 p-3 rounded text-sm">
				/consent-check?externalId=user_123&type=analytics
			</code>
		</div>
	{:else if data.error}
		<div class="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
			<h1 class="text-xl font-semibold text-red-600 mb-4">Error</h1>
			<p class="text-gray-600 mb-2">Failed to check consent status:</p>
			<code class="block bg-red-50 text-red-700 p-3 rounded text-sm">
				{data.error.message}
			</code>
			{#if data.error.code}
				<p class="text-sm text-gray-500 mt-2">Error code: {data.error.code}</p>
			{/if}
		</div>
	{:else}
		<div class="bg-white rounded-lg shadow-md p-6 max-w-2xl w-full">
			<h1 class="text-xl font-semibold text-gray-900 mb-4">Consent Status</h1>

			<div class="mb-4">
				<p class="text-sm text-gray-500">External ID</p>
				<p class="font-mono text-gray-900">{data.externalId}</p>
			</div>

			<div class="mb-4">
				<p class="text-sm text-gray-500">Consent Type</p>
				<p class="font-mono text-gray-900">{data.type}</p>
			</div>

			<div class="border-t pt-4">
				<p class="text-sm text-gray-500 mb-2">Response Data</p>
				<pre class="bg-gray-100 p-4 rounded overflow-auto text-sm">{JSON.stringify(data.result, null, 2)}</pre>
			</div>
		</div>
	{/if}
</div>
