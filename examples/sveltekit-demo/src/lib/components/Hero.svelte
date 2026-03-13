<section class="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
	<div class="container mx-auto max-w-6xl">
		<div class="text-center space-y-8">
			<div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm">
				<span class="relative flex h-2 w-2">
					<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
					<span class="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
				</span>
				Now serving all of London
			</div>

			<h1 class="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-balance">
				The fastest courier service in London
			</h1>

			<p class="text-xl text-muted-foreground max-w-2xl mx-auto text-pretty">
				Revolutionary pigeon-powered delivery that's fast, reliable, and
				surprisingly efficient. Experience the future of urban logistics today.
			</p>

			<div class="flex flex-col sm:flex-row items-center justify-center gap-4">
				<a href="#pricing" class="inline-flex items-center justify-center rounded-md text-base font-medium h-11 px-8 bg-primary text-primary-foreground hover:bg-primary/90">
					Start Shipping
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
				</a>
				<a href="#video-demo" class="inline-flex items-center justify-center rounded-md text-base font-medium h-11 px-8 border border-input bg-transparent hover:bg-accent hover:text-accent-foreground">
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
					class="inline-flex items-center justify-center rounded-md text-base font-medium h-11 px-8 border border-input bg-transparent hover:bg-accent hover:text-accent-foreground"
				>
					Fetch
				</button>
			</div>
		</div>
	</div>
</section>
