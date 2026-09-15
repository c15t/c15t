import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';
import { createActor, fromPromise, setup, waitFor } from 'xstate';

import {
	createPersistenceSubscriber,
	loadSnapshot,
	rehydrateSnapshot,
	saveSnapshot,
} from './persistence';

const dirs: string[] = [];
afterEach(async () => {
	await Promise.all(
		dirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true }))
	);
});
const location = async function location() {
	const dir = await mkdtemp(join(tmpdir(), 'c15t-resume-'));
	dirs.push(dir);
	return join(dir, 'state.json');
};

describe('machine persistence', () => {
	it('restores an invoked promise with fresh runtime services and shared serializable inputs', async () => {
		const machine = setup({
			actors: {
				work: fromPromise<
					string,
					{ cliContext: { read: () => string }; selected: string[] }
				>(({ input }) =>
					Promise.resolve(
						`${input.cliContext.read()}:${input.selected.join(',')}`
					)
				),
			},
		}).createMachine({
			context: {
				cliContext: { read: () => 'original' },
				selected: ['analytics'],
			},
			initial: 'working',
			states: {
				complete: { type: 'final' },
				working: {
					invoke: {
						input: ({ context }) => ({
							cliContext: context.cliContext,
							selected: context.selected,
						}),
						onDone: 'complete',
						src: 'work',
					},
				},
			},
		});
		const suspended = machine.provide({
			actors: { work: fromPromise(() => new Promise<string>(() => {})) },
		});
		const first = createActor(suspended).start();
		const file = await location();
		await saveSnapshot(
			first.getPersistedSnapshot() as ReturnType<typeof first.getSnapshot>,
			'example',
			file
		);
		first.stop();
		const persisted = await loadSnapshot<
			ReturnType<typeof first.getPersistedSnapshot>
		>(file, 'example');
		expect(persisted).not.toBeNull();
		expect(await readFile(file, 'utf8')).not.toContain('[Circular]');
		expect((await stat(file)).mode % 512).toBe(0o600);
		const calls: string[] = [];
		rehydrateSnapshot(persisted, {
			read: () => {
				calls.push('restored');
				return 'fresh';
			},
		});
		const restored = createActor(machine, {
			snapshot: persisted ?? undefined,
		}).start();
		await waitFor(restored, (snapshot) => snapshot.status === 'done');
		expect(calls).toEqual(['restored']);
		restored.stop();
	});

	it('serializes writes before final cleanup so a late save cannot resurrect state', async () => {
		const file = await location();
		const subscriber = createPersistenceSubscriber('test', file);
		subscriber({ value: 'first' });
		subscriber({ value: 'second' });
		subscriber({ value: 'complete' });
		await subscriber.flush();
		await expect(readFile(file, 'utf8')).rejects.toThrow();
	});
});
