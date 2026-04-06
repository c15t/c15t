/**
 * Build script: concatenates @c15t/ui dist CSS files and strips @layer wrappers.
 *
 * We can't use esbuild for CSS because it re-processes CSS modules and loses
 * the hashed class names. Instead, we directly concatenate the pre-built dist
 * CSS files that already have the correct hashed names (c15t-ui-root-hE9Kz, etc.).
 */

const uiDist = `${import.meta.dir}/../../../ui/dist/styles`;

const files = [
	`${uiDist}/components/consent-banner.module.css`,
	`${uiDist}/components/consent-dialog.module.css`,
	`${uiDist}/components/consent-widget.module.css`,
	`${uiDist}/primitives/button.module.css`,
	`${uiDist}/primitives/switch.module.css`,
	`${uiDist}/primitives/legal-links.module.css`,
];

let css = '';
for (const file of files) {
	css += await Bun.file(file).text();
	css += '\n';
}

// Strip @layer components{...} wrappers — handles minified CSS
let result = '';
let i = 0;
while (i < css.length) {
	const layerStart = css.indexOf('@layer components{', i);
	if (layerStart === -1) {
		result += css.slice(i);
		break;
	}

	result += css.slice(i, layerStart);

	let depth = 1;
	let j = layerStart + '@layer components{'.length;
	while (j < css.length && depth > 0) {
		if (css[j] === '{') depth++;
		else if (css[j] === '}') depth--;
		j++;
	}

	result += css.slice(layerStart + '@layer components{'.length, j - 1);
	i = j;
}

const outPath = `${import.meta.dir}/../../dist/c15t.css`;
await Bun.write(outPath, result);

const size = (result.length / 1024).toFixed(1);
console.log(`  dist/c15t.css  ${size}kb`);
