<section class="px-4 pt-32 pb-20 sm:px-6 lg:px-8">
	<div class="container mx-auto max-w-6xl">
		<div class="space-y-8 text-center">
			<div
				class="bg-secondary text-secondary-foreground inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm"
			>
				<span class="relative flex h-2 w-2">
					<span
						class="bg-accent absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
					></span>
					<span class="bg-accent relative inline-flex h-2 w-2 rounded-full"
					></span>
				</span>
				Now serving all of London
			</div>

			<h1
				class="text-5xl font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl"
			>
				The fastest courier service in London
			</h1>

			<p class="text-muted-foreground mx-auto max-w-2xl text-xl text-pretty">
				Revolutionary pigeon-powered delivery that's fast, reliable, and
				surprisingly efficient. Experience the future of urban logistics today.
			</p>

			<div class="flex flex-col items-center justify-center gap-4 sm:flex-row">
				<a
					href="#pricing"
					class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-11 items-center justify-center rounded-md px-8 text-base font-medium"
				>
					Start Shipping
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="ml-2"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg
					>
				</a>
				<a
					href="#video-demo"
					class="border-input hover:bg-accent hover:text-accent-foreground inline-flex h-11 items-center justify-center rounded-md border bg-transparent px-8 text-base font-medium"
				>
					View Demo
				</a>
				<button
					onclick={async () => {
						const res = await fetch('https://api.github.com/user/65376239', {
							method: 'GET',
							headers: { 'Content-Type': 'application/json' },
						});
						console.log('res', res);
					}}
					class="border-input hover:bg-accent hover:text-accent-foreground inline-flex h-11 items-center justify-center rounded-md border bg-transparent px-8 text-base font-medium"
				>
					Fetch
				</button>
			</div>
		</div>
	</div>
</section>
