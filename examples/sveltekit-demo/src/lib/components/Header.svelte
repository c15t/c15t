<script lang="ts">
	import ThemeSwitcherButton from '$lib/consent-manager/ThemeSwitcherButton.svelte';
	import I18nButton from './I18nButton.svelte';
</script>

<header class="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
	<div class="container mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex items-center justify-between h-16">
			<div class="flex items-center gap-2">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 7h.01"/><path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"/><path d="m20 7 2 .5-2 .5"/><path d="M10 18v3"/><path d="M14 17.75V21"/><path d="M7 18a6 6 0 0 0 3.84-10.61"/></svg>
				<span class="text-xl font-semibold">PigeonPost</span>
			</div>

			<nav class="hidden md:flex items-center gap-8">
				<a href="#features" class="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
				<a href="#how-it-works" class="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
				<a href="#pricing" class="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
				<a href="#testimonials" class="text-sm text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
			</nav>

			<div class="flex items-center gap-4">
				<button class="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 hover:bg-accent hover:text-accent-foreground">
					Log in
				</button>
				<a href="#pricing" class="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90">
					Get Started
				</a>
				<I18nButton />
				<ThemeSwitcherButton />
			</div>
		</div>
	</div>
</header>
