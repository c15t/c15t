const baseUrl = process.env.CSS_LAYER_PREVIEW_URL ?? 'http://localhost:3120';

const routes = [
	'/matrix/banner/baseline',
	'/matrix/banner/relay',
	'/matrix/dialog/relay',
];

console.log('c15t CSS layer manual review');
console.log('');
console.log(`Preview shell: ${baseUrl}`);

for (const route of routes) {
	console.log(`- ${baseUrl}${route}`);
}

console.log('');
console.log(
	'Run `bun run compat:styles:build` once, then `bun run compat:styles:review`, and open one of the preview routes above.'
);
