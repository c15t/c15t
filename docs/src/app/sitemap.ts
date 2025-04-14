import { stat } from 'node:fs/promises';
import fg from 'fast-glob';
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const files = await fg(['./src/content/**/*.mdx']);

  const urls = await Promise.all(
    files.map(async (file) => {
      return {
        url: file
          .replace('./src/content/', 'https://c15t.com/docs/')
          .replace('.mdx', '')
          .replace('/index', ''),
        lastModified: await stat(file).then((stats) => stats.mtime),
        changeFrequency: 'yearly',
        priority: 1,
      };
    })
  );

  return urls as MetadataRoute.Sitemap;
}
