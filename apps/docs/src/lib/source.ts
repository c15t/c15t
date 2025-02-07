import { loader } from 'fumadocs-core/source';
import { createMDXSource } from 'fumadocs-mdx';
import {
	docs,
	docsMeta,
	framework,
	frameworkMeta,
	privacyRegulations,
	privacyRegulationsMeta,
	releaseNotes,
	releaseNotesMeta,
} from '../../.source';

export const source = loader({
	baseUrl: '/docs',
	source: createMDXSource(docs, docsMeta),
});

export const releaseNotesSource = loader({
	baseUrl: '/docs/release-notes',
	source: createMDXSource(releaseNotes, releaseNotesMeta),
});

export const frameworkSource = loader({
	baseUrl: '/docs/framework',
	source: createMDXSource(framework, frameworkMeta),
});

export const privacyRegulationsSource = loader({
	baseUrl: '/docs/privacy-regulations',
	source: createMDXSource(privacyRegulations, privacyRegulationsMeta),
});
