import { loader } from 'fumadocs-core/source';
import { createMDXSource } from 'fumadocs-mdx';
import { icons } from 'lucide-react';
import { createElement } from 'react';
import { docs, meta } from '../../.source';

export const docsSource = loader({
	baseUrl: '/docs',
	source: createMDXSource(docs, meta),
});

export type Source = typeof docsSource;
