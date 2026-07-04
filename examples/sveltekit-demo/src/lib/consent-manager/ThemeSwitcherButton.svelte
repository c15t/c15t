<script lang="ts">
	import { themePresets, type ThemePresetName } from './theme-presets';
	import { themePresetStore } from './theme-store.svelte';

	let open = $state(false);
	let ref: HTMLDivElement | undefined = $state();

	const presetInfo: Record<ThemePresetName, { label: string; icon: string; description: string }> = {
		minimal: { label: 'Minimal', icon: '\u25fb\ufe0f', description: 'Standard CSS' },
		dark: { label: 'Dark Mode', icon: '\ud83c\udf19', description: 'Always dark' },
		full: { label: 'Enterprise', icon: '\ud83c\udfe2', description: 'Full width banner' },
		tailwind: { label: 'Tailwind', icon: '\ud83c\udf0a', description: 'Uses app variables' },
		none: { label: 'Default', icon: '\u2699\ufe0f', description: 'No theme preset' },
	};

	function handleClickOutside(e: MouseEvent) {
		if (ref && !ref.contains(e.target as Node)) {
			open = false;
		}
	}

	$effect(() => {
		if (open) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	});
</script>

<div bind:this={ref} class="relative">
	<button
		class="inline-flex items-center justify-center rounded-md text-sm font-medium h-8 w-8 border border-input bg-transparent hover:bg-accent hover:text-accent-foreground"
		aria-expanded={open}
		aria-label="Theme settings"
		aria-haspopup="menu"
		onclick={() => (open = !open)}
	>
		<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
			<title>Theme settings</title>
			<circle cx="12" cy="12" r="3" />
			<path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
		</svg>
	</button>

	{#if open}
		<div class="absolute top-full right-0 z-[60] mt-2 flex w-56 flex-col gap-2 rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95">
			<span class="mb-1 font-medium text-xs text-zinc-500 dark:text-zinc-400">Theme Preset</span>
			{#each Object.keys(themePresets) as presetKey}
				{@const info = presetInfo[presetKey as ThemePresetName]}
				{@const isActive = themePresetStore.preset === presetKey}
				<button
					type="button"
					onclick={() => themePresetStore.setPreset(presetKey as ThemePresetName)}
					class="flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-all {isActive ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}"
				>
					<span class="text-lg">{info.icon}</span>
					<div class="flex flex-col">
						<span class="font-medium text-sm">{info.label}</span>
						<span class="text-xs {isActive ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-500 dark:text-zinc-400'}">
							{info.description}
						</span>
					</div>
				</button>
			{/each}
		</div>
	{/if}
</div>
