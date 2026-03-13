<script lang="ts">
	import { getConsentContext } from '@c15t/svelte';

	const consent = getConsentContext();
</script>

<footer class="border-t border-border py-12 px-4 sm:px-6 lg:px-8">
	<div class="container mx-auto max-w-6xl">
		<div class="grid md:grid-cols-4 gap-8 mb-8">
			<div class="space-y-4">
				<div class="flex items-center gap-2">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 7h.01"/><path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"/><path d="m20 7 2 .5-2 .5"/><path d="M10 18v3"/><path d="M14 17.75V21"/><path d="M7 18a6 6 0 0 0 3.84-10.61"/></svg>
					<span class="text-xl font-semibold">PigeonPost</span>
				</div>
				<p class="text-sm text-muted-foreground">
					Revolutionary pigeon-powered courier service for modern London.
				</p>
			</div>

			<div class="space-y-4">
				<h3 class="font-semibold">Product</h3>
				<ul class="space-y-2 text-sm text-muted-foreground">
					<li><a href="#features" class="hover:text-foreground transition-colors">Features</a></li>
					<li><a href="#pricing" class="hover:text-foreground transition-colors">Pricing</a></li>
					<li><a href="#api" class="hover:text-foreground transition-colors">API</a></li>
					<li><a href="#documentation" class="hover:text-foreground transition-colors">Documentation</a></li>
				</ul>
			</div>

			<div class="space-y-4">
				<h3 class="font-semibold">Company</h3>
				<ul class="space-y-2 text-sm text-muted-foreground">
					<li><a href="#about" class="hover:text-foreground transition-colors">About</a></li>
					<li><a href="#blog" class="hover:text-foreground transition-colors">Blog</a></li>
					<li><a href="#careers" class="hover:text-foreground transition-colors">Careers</a></li>
					<li><a href="#contact-us" class="hover:text-foreground transition-colors">Contact</a></li>
				</ul>
			</div>

			<div class="space-y-4">
				<h3 class="font-semibold">Legal</h3>
				<ul class="space-y-2 text-sm text-muted-foreground">
					<li>
					<button
						onclick={() => consent.state.setActiveUI('dialog')}
						class="transition-colors hover:text-foreground cursor-pointer"
					>
						Your privacy settings
					</button>
				</li>
				<li><a href="#privacy" class="hover:text-foreground transition-colors">Privacy</a></li>
					<li><a href="#terms" class="hover:text-foreground transition-colors">Terms</a></li>
					<li><a href="#security" class="hover:text-foreground transition-colors">Security</a></li>
				</ul>
			</div>
		</div>

		<div class="pt-8 border-t border-border text-center text-sm text-muted-foreground">
			<p>&copy; 2025 PigeonPost. All rights reserved.</p>
		</div>
	</div>
</footer>
