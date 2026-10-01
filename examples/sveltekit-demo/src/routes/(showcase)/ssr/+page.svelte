<script lang="ts">
	import CTA from '$lib/components/CTA.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Header from '$lib/components/Header.svelte';
	import Hero from '$lib/components/Hero.svelte';
	import HowItWorks from '$lib/components/HowItWorks.svelte';
	import Pricing from '$lib/components/Pricing.svelte';
	import Stats from '$lib/components/Stats.svelte';
	import Testimonials from '$lib/components/Testimonials.svelte';
	import VideoDemo from '$lib/components/VideoDemo.svelte';
</script>

<main class="min-h-screen">
	<Header />
	<Hero />
	<Stats />
	<VideoDemo />
	<HowItWorks />
	<Pricing />
	<Testimonials />
	<CTA />
	<Footer />
</main>
