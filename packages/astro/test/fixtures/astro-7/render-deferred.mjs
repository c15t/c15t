import { pathToFileURL } from 'node:url';

const { app } = await import(pathToFileURL(process.argv[2]).href);
const origin = 'https://fixture.example';
const response = await app.render(new Request(`${origin}/deferred`));
if (response.status !== 200) {
	throw new Error(`Page returned ${response.status}: ${await response.text()}`);
}
const html = await response.text();
const path = html.match(/href="(?<path>\/_server-islands\/[^"]+)"/u)?.groups
	?.path;
if (!path) {
	throw new Error('Page did not preload a server island');
}
const islandResponse = await app.render(
	new Request(new URL(path.replaceAll('&amp;', '&'), origin))
);
if (islandResponse.status !== 200) {
	throw new Error(
		`Island returned ${islandResponse.status}: ${await islandResponse.text()}`
	);
}
process.stdout.write(
	JSON.stringify({ html, island: await islandResponse.text() })
);
