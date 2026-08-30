<script lang="ts">
	import { Frame } from '@c15t/svelte';
</script>

<section
	id="video-demo"
	class="bg-background py-24"
>
	<div class="container mx-auto px-4">
		<div class="mx-auto max-w-4xl">
			<div class="mb-12 text-center">
				<h2 class="mb-4 text-4xl font-bold text-balance">
					See PigeonPost in Action
				</h2>
				<p class="text-muted-foreground text-xl text-balance">
					Watch how our revolutionary pigeon-powered delivery system works
				</p>
			</div>

			<Frame
				category="experience"
				class="relative aspect-video w-full"
			>
				<iframe
					src="https://www.youtube.com/embed/gwqYfNWVPpk?si=eEtKAUke_JUXTMfl&start=36"
					title="PigeonPost Demo Video"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					allowfullscreen
					class="inset-0 h-full w-full"
				></iframe>
			</Frame>
		</div>
	</div>
</section>
