import { defineConfig, defineDocs } from 'fumadocs-mdx/config';

export const { docs, meta: docsMeta } = defineDocs({
	dir: ['src/content/docs'],
});

// export const releaseNotes = defineDocs({
// 	dir: ['src/content/release-notes'],
// });

export const { docs: releaseNotes, meta: releaseNotesMeta } = defineDocs({
	dir: 'src/content/release-notes',
});
export const { docs: components, meta: componentsMeta } = defineDocs({
	dir: 'src/content/components',
});
export const { docs: privacyRegulations, meta: privacyRegulationsMeta } =
	defineDocs({
		dir: 'src/content/privacy-regulations',
	});

export default defineConfig();
