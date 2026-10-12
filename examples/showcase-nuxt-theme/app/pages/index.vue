<script setup lang="ts">
const details = [
	['Producer', 'Finca La Esperanza'],
	['Region', 'Huila, Colombia'],
	['Altitude', '1,750 m'],
	['Variety', 'Pink Bourbon'],
	['Process', 'Washed'],
	['Roast', 'Light'],
] as const;
</script>

<template>
	<main class="page shell">
		<h1>Huila Pink Bourbon</h1>
		<p class="notes">Raspberry, panela, cocoa nib</p>
		<p class="lede">
			Grown by the Ramírez family on steep slopes above Pitalito. Pink Bourbon
			is a rare variety, brighter than most Colombian coffee, with red fruit up
			front and a brown-sugar finish. We roast it light to keep the fruit.
		</p>
		<dl class="specs">
			<div
				v-for="[term, value] in details"
				:key="term"
			>
				<dt>{{ term }}</dt>
				<dd>{{ value }}</dd>
			</div>
		</dl>
	</main>
</template>
