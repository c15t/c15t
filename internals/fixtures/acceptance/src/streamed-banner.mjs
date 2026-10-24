// oxlint-disable no-await-in-loop -- Sample each parser phase before releasing its HTTP gate.
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootSelector = '[data-testid="consent-banner-root"]';
const endSelector = '[data-c15t-stream-end]';
const titleSelector = '[data-testid="consent-banner-title"]';
const acceptSelector = '[data-testid="consent-banner-accept-button"]';

export const streamedBannerCases = [
	{ cut: 'svg', name: 'branding SVG' },
	{ cut: 'title', name: 'title' },
	{ cut: 'action', name: 'final action label' },
	{ cut: 'svg', name: 'JavaScript disabled', noJavaScript: true },
	{
		cut: 'svg',
		mode: 'unmarked',
		name: 'JavaScript disabled positive control',
		noJavaScript: true,
	},
	{ cut: 'svg', mode: 'two', name: 'two independent roots' },
	{ cut: 'svg', mode: 'unmarked', name: 'unmarked root fails open' },
	{ cut: 'svg', mode: 'headless', name: 'headless root fails open' },
	{ cut: 'svg', mode: 'missing', name: 'missing marker stays hidden' },
	{ cut: 'svg', mode: 'nested', name: 'nested marker belongs to its own root' },
];

const readBanner = (html) => {
	// Ignore comments and raw script/style text when locating the actual root.
	const tokens = [
		...html.matchAll(
			/<!--[\s\S]*?-->|<(?<raw>script|style)\b[^>]*>[\s\S]*?<\/\k<raw>\s*>|<\/?(?<tag>[a-z][\w:-]*)\b[^>]*>/giu
		),
	];
	const start = tokens.findIndex(
		(token) =>
			token.groups.tag &&
			/\bdata-testid=["']consent-banner-root["']/u.test(token[0])
	);
	assert.ok(start >= 0, 'Fresh SSR HTML must contain an ordinary banner root');
	assert.ok(
		tokens.filter(
			(token) =>
				token.groups.tag &&
				/\bdata-testid=["']consent-banner-root["']/u.test(token[0])
		).length === 1,
		'Fresh SSR HTML must contain exactly one ordinary banner root'
	);
	let depth = 0;
	let end;
	for (const token of tokens.slice(start)) {
		if (
			token.groups.tag?.toLowerCase() === tokens[start].groups.tag.toLowerCase()
		) {
			depth += token[0].startsWith('</') ? -1 : 1;
			if (depth === 0) {
				end = token.index + token[0].length;
				break;
			}
		}
	}
	assert.ok(end, 'Fresh SSR banner must have a closing root tag');
	const styles = tokens
		.filter((token) => token.groups.raw?.toLowerCase() === 'style')
		.map((token) => token[0])
		.join('');
	assert.ok(
		styles.includes('--consent-banner-'),
		'Use generated inline banner CSS'
	);
	return {
		root: html.slice(tokens[start].index, end),
		scripts: tokens
			.filter((token) => token.groups.raw?.toLowerCase() === 'script')
			.map((token) => token[0])
			.join(''),
		source: {
			htmlSha256: createHash('sha256').update(html).digest('hex'),
			rootEndByte: Buffer.byteLength(html.slice(0, end)),
			rootStartByte: Buffer.byteLength(html.slice(0, tokens[start].index)),
			stylesSha256: createHash('sha256').update(styles).digest('hex'),
		},
		styles,
	};
};

const streamParts = ({ root, styles, scripts }, scenario) => {
	let target = root;
	if (scenario.mode === 'unmarked') {
		target = target.replace(/^<[^>]+>/u, (tag) =>
			tag.replace(/\sdata-c15t-streamed(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/u, '')
		);
	}
	if (scenario.mode === 'headless') {
		target = target.replace(
			/\bclass=(?<quote>["'])(?<classes>.*?)\k<quote>/u,
			'class=$<quote>$<classes> headless$<quote>'
		);
	}
	if (scenario.mode === 'missing') {
		target = target.replace(
			/<span\b[^>]*\bdata-c15t-stream-end\b[^>]*>\s*<\/span>/gu,
			''
		);
	}
	const actions = [
		...target.matchAll(
			/<button\b[^>]*\bdata-testid=["'](?<testId>consent-banner-(?:accept|reject|customize|dismiss)-button)["'][^>]*>(?<content>[\s\S]*?)<\/button>/gu
		),
	];
	const action = actions.at(-1);
	assert.ok(action, 'Fresh SSR banner must contain consent actions');
	const label = [
		...action.groups.content.matchAll(
			/(?:^|>)(?<text>[^<]*\p{L}[^<]*)(?=<|$)/gu
		),
	].find((match) => match.groups.text.trim().length > 1);
	assert.ok(label, 'The final action must have a text label');
	const actionSelector = `[data-testid="${action.groups.testId}"]`;
	const actionText = label.groups.text.trim();
	let cut;
	let selector;
	if (scenario.cut === 'action') {
		cut =
			action.index +
			action[0].indexOf('>') +
			1 +
			label.index +
			(label[0].startsWith('>') ? 1 : 0) +
			label.groups.text.indexOf(actionText) +
			Math.floor(actionText.length / 2);
		selector = actionSelector;
	} else {
		const boundary =
			scenario.cut === 'svg'
				? target.match(/<\/svg\s*>/iu)
				: target.match(
						/<h[1-6]\b[^>]*\bdata-testid=["']consent-banner-title["'][^>]*>[\s\S]*?<\/h[1-6]>/iu
					);
		assert.ok(
			boundary,
			`Fresh SSR banner must contain the ${scenario.cut} boundary`
		);
		cut = boundary.index + boundary[0].length;
		selector = scenario.cut === 'svg' ? 'svg' : titleSelector;
	}
	if (scenario.mode === 'nested') {
		const opening = target.indexOf('>') + 1;
		target = target.slice(0, opening) + root + target.slice(opening);
		cut += root.length;
	}
	// Only the failure controls alter fetched markup. Styles are copied verbatim.
	const prefix = `<!doctype html><html lang="en"><head><meta charset="utf-8">${styles}${scripts}<script>window.__c15tStreamContentRan=true</script><script src="/content.js"></script></head><body>`;
	return {
		actionSelector,
		actionText,
		chunks: [
			prefix + (scenario.mode === 'two' ? root : '') + target.slice(0, cut),
			target.slice(cut),
			'<main data-c15t-stream-tail>After the banner</main></body></html>',
		],
		rootIndex: scenario.mode === 'two' ? 1 : 0,
		selector,
	};
};

const observeLayoutShifts = () => {
	const state = {
		entries: [],
		installation: 'before-navigation',
		score: 0,
		supported: PerformanceObserver.supportedEntryTypes.includes('layout-shift'),
	};
	window.__c15tStreamLayout = state;
	if (!state.supported) {
		return;
	}
	const rect = ({ x, y, width, height }) => ({ height, width, x, y });
	const record = (entries) => {
		for (const entry of entries) {
			if (!entry.hadRecentInput) {
				state.score += entry.value;
			}
			state.entries.push({
				hadRecentInput: entry.hadRecentInput,
				sources: entry.sources.map((source) => ({
					banner: Boolean(
						source.node?.closest?.('[data-testid="consent-banner-root"]')
					),
					currentRect: rect(source.currentRect),
					previousRect: rect(source.previousRect),
					tag: source.node?.nodeName,
					testId: source.node?.getAttribute?.('data-testid'),
				})),
				startTime: entry.startTime,
				value: entry.value,
			});
		}
	};
	const observer = new PerformanceObserver((list) => record(list.getEntries()));
	observer.observe({ buffered: true, type: 'layout-shift' });
	state.installed = true;
	window.__c15tReadStreamLayout = () => {
		record(observer.takeRecords());
		return state;
	};
};

const readNativeLayout = async (cdp, layout) => ({
	...layout,
	entries: await Promise.all(
		layout.entries.map(async (entry) => ({
			...entry,
			sources: await Promise.all(
				entry.sources.map(async (source) => {
					if (source.nodeId === undefined) {
						return { ...source, banner: null };
					}
					const { object } = await cdp.send('DOM.resolveNode', {
						backendNodeId: source.nodeId,
					});
					const { result } = await cdp.send('Runtime.callFunctionOn', {
						functionDeclaration: `function() { return Boolean(this.closest('${rootSelector}')); }`,
						objectId: object.objectId,
						returnByValue: true,
					});
					return { ...source, banner: result.value };
				})
			),
		}))
	),
});

const serveStream = async (chunks, evidence) => {
	const rootGate = Promise.withResolvers();
	const eofGate = Promise.withResolvers();
	const server = createServer(async (_request, response) => {
		const timeout = setTimeout(() => {
			evidence.gateTimedOut = true;
			response.destroy();
		}, 15_000);
		response.on('close', () => clearTimeout(timeout));
		response.writeHead(200, {
			'cache-control': 'no-store',
			'content-security-policy':
				"default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'",
			'content-type': 'text/html; charset=utf-8',
		});
		response.write(chunks[0]);
		evidence.writes.push('partial');
		await rootGate.promise;
		response.write(chunks[1]);
		evidence.writes.push('root');
		await eofGate.promise;
		response.end(chunks[2]);
		evidence.writes.push('eof');
	});
	await new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	return {
		close: async () => {
			rootGate.resolve();
			eofGate.resolve();
			server.closeAllConnections();
			await new Promise((resolve, reject) => {
				server.close((error) => (error ? reject(error) : resolve()));
			});
		},
		finish: eofGate.resolve,
		reveal: rootGate.resolve,
		url: `http://127.0.0.1:${server.address().port}/`,
	};
};

const sample = async (page) => {
	// Give the compositor a paint opportunity while the parser gate stays closed.
	await page.waitForTimeout(350);
	const state = await page.evaluate(
		({ roots, end }) => ({
			contentRan: window.__c15tStreamContentRan === true,
			layout: window.__c15tReadStreamLayout?.(),
			readyState: document.readyState,
			roots: [...document.querySelectorAll(roots)].map((root) => {
				const own = (selector) =>
					[...root.querySelectorAll(selector)].filter(
						(node) => node.closest(roots) === root
					);
				return {
					actions: own('button').map((node) => ({
						rect: node.getBoundingClientRect().toJSON(),
						testId: node.getAttribute('data-testid'),
						text: node.textContent.trim(),
						visible: node.checkVisibility({
							checkOpacity: true,
							checkVisibilityCSS: true,
						}),
					})),
					geometry: own(
						'[data-testid="consent-banner-card"], [data-testid="consent-banner-title"], [data-testid="consent-banner-branding"]'
					).map((node) => ({
						rect: node.getBoundingClientRect().toJSON(),
						testId: node.getAttribute('data-testid'),
						visible: node.checkVisibility({
							checkOpacity: true,
							checkVisibilityCSS: true,
						}),
					})),
					headless: root.classList.contains('headless'),
					lastMarker: root.lastElementChild?.matches(end),
					markerDisplay: root.querySelector(`:scope > ${end}`)
						? getComputedStyle(root.querySelector(`:scope > ${end}`)).display
						: null,
					markerHidden: root.querySelector(`:scope > ${end}`)?.hidden,
					markers: root.querySelectorAll(`:scope > ${end}`).length,
					nestedMarker: Boolean(root.querySelector(`${roots} ${end}`)),
					position: getComputedStyle(root).position,
					rect: root.getBoundingClientRect().toJSON(),
					streamed: root.hasAttribute('data-c15t-streamed'),
					svgCount: own('svg').length,
					titlePresent:
						own('[data-testid="consent-banner-title"]').length === 1,
					visibility: getComputedStyle(root).visibility,
				};
			}),
			tail: Boolean(document.querySelector('[data-c15t-stream-tail]')),
		}),
		{ end: endSelector, roots: rootSelector }
	);
	state.accessibleButtons = await page.getByRole('button').count();
	return state;
};

const checkParserPhases = (evidence, scenario) => {
	const { partial, root: parsed, eof } = evidence.phases;
	assert.match(evidence.csp, /script-src 'none'/u);
	for (const state of [partial, parsed, eof]) {
		assert.ok(state.layout?.supported && state.layout.installed, 'observer');
		assert.equal(
			state.layout.installation,
			scenario.noJavaScript
				? 'native-CDP-before-navigation'
				: 'before-navigation'
		);
		assert.equal(state.contentRan, false, 'content scripts blocked');
	}
	assert.ok(!evidence.gateTimedOut, 'gate expired');
	for (const state of [partial, parsed]) {
		assert.equal(state.readyState, 'loading', 'parser gate');
		assert.equal(state.tail, false, 'tail withheld');
	}
	assert.equal(eof.readyState, 'complete');
	assert.equal(eof.tail, true);
};

const checkPartialRoot = (evidence, parts, scenario) => {
	const { partial } = evidence.phases;
	const first = partial.roots[parts.rootIndex];
	const failOpen = ['unmarked', 'headless'].includes(scenario.mode);
	if (scenario.cut === 'svg') {
		assert.ok(first.svgCount > 0, 'branding SVG parsed');
		assert.equal(first.titlePresent, false, 'title withheld');
		assert.equal(first.actions.length, 0, 'actions withheld');
	} else if (scenario.cut === 'title') {
		assert.ok(first.titlePresent, 'title parsed');
		assert.equal(first.actions.length, 0, 'actions withheld');
	} else {
		assert.ok(first.actions.at(-1)?.text.length > 0, 'partial label');
		assert.notEqual(first.actions.at(-1).text, parts.actionText);
	}
	assert.equal(
		first.visibility,
		failOpen ? 'visible' : 'hidden',
		'incomplete root visibility'
	);
	assert.equal(first.markers, 0, 'completion marker withheld');
	assert.equal(first.streamed, scenario.mode !== 'unmarked', 'root opt-in');
	if (!failOpen && scenario.mode !== 'two') {
		assert.equal(partial.accessibleButtons, 0, 'hidden controls inaccessible');
	}
	if (scenario.mode === 'headless') {
		assert.ok(first.headless, 'headless opt-out');
	} else {
		assert.equal(first.position, 'fixed', 'actual generated banner CSS');
	}
	if (scenario.mode === 'nested') {
		assert.ok(first.nestedMarker, 'nested marker parsed before outer marker');
	}
	if (scenario.mode === 'two') {
		assert.equal(partial.roots.length, 2);
		assert.equal(partial.roots[0].visibility, 'visible', 'first root complete');
		assert.equal(partial.roots[0].markers, 1);
	}
};

const checkCompleteRoots = (evidence, parts, scenario) => {
	const { partial, root: parsed, eof } = evidence.phases;
	const missing = scenario.mode === 'missing';
	for (const state of [parsed, eof]) {
		for (const root of state.roots) {
			assert.equal(root.visibility, missing ? 'hidden' : 'visible');
			assert.equal(root.markers, missing ? 0 : 1, 'one owned marker');
			if (!missing) {
				assert.ok(root.lastMarker && root.markerHidden, 'last hidden child');
				assert.equal(root.markerDisplay, 'none', 'marker adds no layout');
				assert.ok(root.titlePresent && root.actions.length > 0);
				assert.ok(
					[...root.actions, ...root.geometry].every((entry) => entry.visible),
					'completed content visible'
				);
			}
		}
	}
	if (missing) {
		assert.equal(parsed.accessibleButtons, 0, 'missing marker stays hidden');
	}
	for (let index = 0; index < parsed.roots.length; index += 1) {
		for (const key of ['rect', 'geometry', 'actions']) {
			assert.deepEqual(
				parsed.roots[index][key],
				eof.roots[index][key],
				`stable ${key} geometry across EOF`
			);
		}
	}
	if (!['unmarked', 'headless'].includes(scenario.mode)) {
		for (const state of [partial, parsed, eof]) {
			assert.equal(state.layout.score, 0, 'streamed layout shift score');
		}
	} else if (scenario.mode === 'unmarked') {
		assert.ok(eof.layout.score > 0, 'unmarked positive control must shift');
		assert.ok(
			eof.layout.entries.some(
				(entry) =>
					!entry.hadRecentInput && entry.sources.some((source) => source.banner)
			),
			'banner attribution'
		);
	}
};

const saveArtifacts = (artifact, evidence, html, parts, frames) => {
	mkdirSync(join(artifact, '..'), { recursive: true });
	writeFileSync(`${artifact}.json`, JSON.stringify(evidence, null, 2));
	writeFileSync(`${artifact}-ssr.html`, html);
	if (parts) {
		writeFileSync(`${artifact}-stream.html`, parts.chunks.join(''));
	}
	for (const [phase, frame] of Object.entries(frames)) {
		writeFileSync(`${artifact}-${phase}.png`, Buffer.from(frame, 'base64'));
	}
};

const closeStreamTest = async (stream, context, tracePath, failure) => {
	const cleanup = await Promise.allSettled([
		stream?.close(),
		(async () => {
			if (context) {
				try {
					await context.tracing.stop(tracePath ? { path: tracePath } : {});
				} finally {
					await context.close();
				}
			}
		})(),
	]);
	for (const result of cleanup) {
		if (result.status === 'rejected') {
			console.error('Streamed banner cleanup failed', result.reason);
			if (!failure) {
				throw result.reason;
			}
		}
	}
};

export const verifyStreamedBanner = async (
	browser,
	app,
	scenario,
	artifactDirectory
) => {
	const directory =
		artifactDirectory ??
		fileURLToPath(new URL('../../../../.ci-reports/', import.meta.url));
	const evidence = {
		app: app.label,
		console: [],
		phases: {},
		requests: [],
		scenario: scenario.name,
		writes: [],
	};
	const frames = {};
	let html = '';
	let parts;
	let stream;
	let context;
	let page;
	let failure;
	const artifact = join(
		directory,
		`${app.label}-streamed-${scenario.name}`.replaceAll(/[^a-z0-9]/giu, '-')
	);
	try {
		const response = await fetch(`http://127.0.0.1:${app.port}${app.path}`, {
			headers: { 'accept-language': 'en' },
		});
		assert.ok(response.ok, `Fresh SSR request returned ${response.status}`);
		html = await response.text();
		const banner = readBanner(html);
		parts = streamParts(banner, scenario);
		evidence.source = banner.source;
		evidence.chunks = parts.chunks.map((chunk) => Buffer.byteLength(chunk));
		stream = await serveStream(parts.chunks, evidence);
		context = await browser.newContext({
			bypassCSP: false,
			javaScriptEnabled: !scenario.noJavaScript,
			serviceWorkers: 'block',
			viewport: { height: 900, width: 1280 },
		});
		if (!scenario.noJavaScript) {
			await context.addInitScript(observeLayoutShifts);
		}
		await context.route('**/*', (route) => {
			const request = route.request();
			if (request.isNavigationRequest() && request.url() === stream.url) {
				return route.continue();
			}
			evidence.requests.push({
				type: request.resourceType(),
				url: request.url(),
			});
			return route.abort();
		});
		await context.tracing.start({ screenshots: true, snapshots: true });
		page = await context.newPage();
		page.setDefaultTimeout(5000);
		page.setDefaultNavigationTimeout(5000);
		page.on('console', (message) => evidence.console.push(message.text()));
		const cdp = await context.newCDPSession(page);
		const nativeLayout = {
			entries: [],
			installation: 'native-CDP-before-navigation',
			installed: false,
			score: 0,
			supported: false,
		};
		if (scenario.noJavaScript) {
			cdp.on('PerformanceTimeline.timelineEventAdded', ({ event }) => {
				if (event.type === 'layout-shift') {
					const entry = event.layoutShiftDetails;
					nativeLayout.entries.push(entry);
					if (!entry.hadRecentInput) {
						nativeLayout.score += entry.value;
					}
				}
			});
			await cdp.send('PerformanceTimeline.enable', {
				eventTypes: ['layout-shift'],
			});
			nativeLayout.installed = true;
			nativeLayout.supported = true;
		}
		evidence.supportedBeforeNavigation = await page.evaluate(() =>
			PerformanceObserver.supportedEntryTypes.includes('layout-shift')
		);
		assert.ok(
			evidence.supportedBeforeNavigation,
			'LayoutShift must be supported before navigation'
		);
		const navigation = await page.goto(stream.url, { waitUntil: 'commit' });
		evidence.csp = navigation.headers()['content-security-policy'];
		const root = page.locator(rootSelector).nth(parts.rootIndex);
		await root.locator(parts.selector).last().waitFor({ state: 'attached' });
		for (const phase of ['partial', 'root', 'eof']) {
			if (phase === 'root') {
				stream.reveal();
				await page.waitForFunction(
					({ index, roots, actionSelector, actionText }) => {
						const node = document.querySelectorAll(roots).item(index);
						return (
							[...node.querySelectorAll(actionSelector)]
								.at(-1)
								?.textContent.trim() === actionText
						);
					},
					{
						actionSelector: parts.actionSelector,
						actionText: parts.actionText,
						index: parts.rootIndex,
						roots: rootSelector,
					}
				);
			} else if (phase === 'eof') {
				stream.finish();
				await page.waitForLoadState('load');
			}
			evidence.phases[phase] = await sample(page);
			if (scenario.noJavaScript) {
				evidence.phases[phase].layout = await readNativeLayout(
					cdp,
					nativeLayout
				);
			}
			frames[phase] = (
				await cdp.send('Page.captureScreenshot', { format: 'png' })
			).data;
		}
		console.log(
			`[streamed-banner] ${JSON.stringify({
				app: app.label,
				case: scenario.name,
				phases: Object.fromEntries(
					Object.entries(evidence.phases).map(([phase, state]) => [
						phase,
						{
							layout: state.layout,
							readyState: state.readyState,
							visibility: state.roots.map((entry) => entry.visibility),
						},
					])
				),
			})}`
		);
		checkParserPhases(evidence, scenario);
		checkPartialRoot(evidence, parts, scenario);
		checkCompleteRoots(evidence, parts, scenario);
		if (scenario.noJavaScript) {
			await root.locator(acceptSelector).focus();
			assert.ok(
				await root
					.locator(acceptSelector)
					.evaluate((node) => document.activeElement === node),
				'Native focus must reach Accept All with JavaScript disabled'
			);
			await page.keyboard.press('Tab');
			assert.ok(
				await root
					.locator(parts.actionSelector)
					.evaluate((node) => document.activeElement === node),
				'Native Tab must reach the final action with JavaScript disabled'
			);
			evidence.keyboard = { focused: 'accept', tabbed: parts.actionSelector };
		}
		if (artifactDirectory) {
			saveArtifacts(artifact, evidence, html, parts, frames);
		}
		return evidence;
	} catch (error) {
		failure = error;
		try {
			saveArtifacts(artifact, evidence, html, parts, frames);
		} catch (artifactError) {
			console.error('Could not save streamed banner artifacts', artifactError);
		}
		console.error(`[streamed-banner] ${JSON.stringify(evidence)}`);
		throw error;
	} finally {
		await closeStreamTest(
			stream,
			context,
			failure || artifactDirectory ? `${artifact}.zip` : undefined,
			failure
		);
	}
};
