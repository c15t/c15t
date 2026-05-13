<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Hero from '$lib/components/Hero.svelte';
	import Stats from '$lib/components/Stats.svelte';
	import Features from '$lib/components/Features.svelte';
	import VideoDemo from '$lib/components/VideoDemo.svelte';
	import HowItWorks from '$lib/components/HowItWorks.svelte';
	import Pricing from '$lib/components/Pricing.svelte';
	import Testimonials from '$lib/components/Testimonials.svelte';
	import CTA from '$lib/components/CTA.svelte';
	import Footer from '$lib/components/Footer.svelte';
</script>

<main class="min-h-screen">
	<Header />
	<Hero />
	<Stats />
	<!-- <Features /> -->
	<VideoDemo />
	<HowItWorks />
	<Pricing />
	<Testimonials />
	<CTA />
	<Footer />
</main>
