/**
 * Load a Storybook's `index.json` (or legacy `stories.json`) and project
 * the entries into the StoryEntry shape the pair-stories module expects.
 */

import { request } from '@playwright/test';
import type { StoryEntry } from './pair-stories';

type RawStorybookIndex = {
	entries?: Record<
		string,
		{ id: string; title: string; name: string; type?: string }
	>;
	stories?: Record<string, { id: string; title: string; name: string }>;
};

export async function loadStorybookIndex(
	baseUrl: string
): Promise<StoryEntry[]> {
	const ctx = await request.newContext();
	try {
		const indexUrl = new URL('/index.json', baseUrl).toString();
		const indexRes = await ctx.get(indexUrl);
		const raw: RawStorybookIndex = indexRes.ok()
			? await indexRes.json()
			: await ctx
					.get(new URL('/stories.json', baseUrl).toString())
					.then((r) => r.json());

		const source = raw.entries ?? raw.stories ?? {};
		return Object.values(source)
			.filter((e) => !('type' in e) || e.type === 'story')
			.map((e) => ({ id: e.id, title: e.title, name: e.name }));
	} finally {
		await ctx.dispose();
	}
}
