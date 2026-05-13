<script lang="ts">
	import { Frame } from '@c15t/svelte';
</script>

<section id="video-demo" class="py-24 bg-background">
	<div class="container mx-auto px-4">
		<div class="max-w-4xl mx-auto">
			<div class="text-center mb-12">
				<h2 class="text-4xl font-bold mb-4 text-balance">See PigeonPost in Action</h2>
				<p class="text-xl text-muted-foreground text-balance">
					Watch how our revolutionary pigeon-powered delivery system works
				</p>
			</div>

			<Frame category="experience" class="relative w-full aspect-video">
				<iframe
					src="https://www.youtube.com/embed/gwqYfNWVPpk?si=eEtKAUke_JUXTMfl&start=36"
					title="PigeonPost Demo Video"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					allowfullscreen
					class="inset-0 w-full h-full"
				></iframe>
			</Frame>
		</div>
	</div>
</section>
