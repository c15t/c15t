import { Component, useState } from 'react';
import type { ReactNode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { renderToReadableStream } from 'react-dom/server';
import { expect, test, vi } from 'vitest';

import { createDeferredModule } from '../deferred-module';

const frame = () => new Promise(requestAnimationFrame);
const Content = ({ label }: { label: string }) => {
	const [count, setCount] = useState(0);
	return (
		<button
			onClick={() => setCount(count + 1)}
			type="button"
		>
			{label}: {count}
		</button>
	);
};
const exports = { Content };
const deferred = () => {
	let resolveModule!: (value: typeof exports) => void;
	let rejectModule!: (error: Error) => void;
	const promise = new Promise<typeof exports>((resolve, reject) => {
		resolveModule = resolve;
		rejectModule = reject;
	});
	const load = vi.fn(() => promise);
	return {
		load,
		module: createDeferredModule(load),
		reject: rejectModule,
		resolve: resolveModule,
	};
};

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
	constructor(props: { children: ReactNode }) {
		super(props);
		this.state = { failed: false };
	}
	static getDerivedStateFromError() {
		return { failed: true };
	}
	render() {
		return this.state.failed ? <p>Import failed</p> : this.props.children;
	}
}

test('reveals cold exports on module completion without waiting for Suspense retries', async () => {
	const fixture = deferred();
	const First = fixture.module.component((module) => module.Content);
	const Second = fixture.module.component((module) => module.Content);
	const container = document.createElement('div');
	document.body.append(container);
	const root = createRoot(container);
	try {
		// act() bypasses the React throttle this regression exercises.
		root.render(
			<>
				<First label="First" />
				<Second label="Second" />
			</>
		);
		await vi.waitFor(() => expect(fixture.load).toHaveBeenCalledOnce());
		expect(container.textContent).toBe('');
		fixture.resolve(exports);
		await frame();
		await frame();
		expect(container.textContent).toBe('First: 0Second: 0');
		container.querySelector('button')?.click();
		await frame();
		expect(container.textContent).toBe('First: 1Second: 0');
		await fixture.module.preload();
		expect(fixture.load).toHaveBeenCalledOnce();
	} finally {
		root.unmount();
		container.remove();
	}
});

test('reuses a preload and a load completed after an earlier subscriber unmounted', async () => {
	const fixture = deferred();
	const Deferred = fixture.module.component((module) => module.Content);
	const container = document.createElement('div');
	document.body.append(container);
	const root = createRoot(container);
	try {
		const preload = fixture.module.preload();
		root.render(<Deferred label="First" />);
		await frame();
		root.render(null);
		await frame();
		fixture.resolve(exports);
		await preload;
		root.render(<Deferred label="Reopened" />);
		await frame();
		expect(container.textContent).toBe('Reopened: 0');
		expect(fixture.load).toHaveBeenCalledOnce();
	} finally {
		root.unmount();
		container.remove();
	}
});

test('renders content on the server and hydrates a cold client without losing markup or state', async () => {
	const serverModule = createDeferredModule(() => Promise.resolve(exports));
	const Server = serverModule.component((module) => module.Content);
	const stream = await renderToReadableStream(<Server label="SSR" />);
	await stream.allReady;
	const html = await new Response(stream).text();
	expect(html).toContain('SSR');
	const fixture = deferred();
	const Client = fixture.module.component((module) => module.Content);
	const container = document.createElement('div');
	container.innerHTML = html;
	document.body.append(container);
	const original = container.querySelector('button');
	const errors = vi.fn();
	const root = hydrateRoot(container, <Client label="SSR" />, {
		onRecoverableError: errors,
	});
	try {
		await vi.waitFor(() => expect(fixture.load).toHaveBeenCalledOnce());
		expect(container.querySelector('button')).toBe(original);
		fixture.resolve(exports);
		await frame();
		await frame();
		expect(errors).not.toHaveBeenCalled();
		expect(container.querySelector('button')).toBe(original);
		original?.click();
		await frame();
		expect(container.textContent).toBe('SSR: 1');
	} finally {
		root.unmount();
		container.remove();
	}
});

test('retries the import on render after a failed preload', async () => {
	const load = vi
		.fn<() => Promise<typeof exports>>()
		.mockRejectedValueOnce(new Error('chunk unavailable'))
		.mockResolvedValue(exports);
	const module = createDeferredModule(load);
	const Deferred = module.component((loaded) => loaded.Content);
	await module.preload();
	const container = document.createElement('div');
	document.body.append(container);
	const root = createRoot(container);
	try {
		root.render(
			<Boundary>
				<Deferred label="Retried" />
			</Boundary>
		);
		await vi.waitFor(() => expect(container.textContent).toBe('Retried: 0'));
		expect(load).toHaveBeenCalledTimes(2);
	} finally {
		root.unmount();
		container.remove();
	}
});

test('reports a failed render import through the error boundary', async () => {
	const fixture = deferred();
	const Deferred = fixture.module.component((module) => module.Content);
	const container = document.createElement('div');
	document.body.append(container);
	const root = createRoot(container);
	const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
	try {
		// A preload in flight when the export renders shares its failure.
		const preload = fixture.module.preload();
		root.render(
			<Boundary>
				<Deferred label="Unavailable" />
			</Boundary>
		);
		// Let the render reach the lazy export before the import fails.
		await frame();
		await frame();
		fixture.reject(new Error('chunk unavailable'));
		await preload;
		await vi.waitFor(() => expect(container.textContent).toBe('Import failed'));
		expect(fixture.load).toHaveBeenCalledOnce();
	} finally {
		root.unmount();
		container.remove();
		error.mockRestore();
	}
});

test('reveals the first lazy export after its module was fully preloaded', async () => {
	const fixture = deferred();
	const Deferred = fixture.module.component((module) => module.Content);
	const Later = fixture.module.component((module) => module.Content);
	const preload = fixture.module.preload();
	fixture.resolve(exports);
	await preload;
	const container = document.createElement('div');
	document.body.append(container);
	const root = createRoot(container);
	try {
		root.render(<Deferred label="Preloaded" />);
		await frame();
		await frame();
		expect(container.textContent).toBe('Preloaded: 0');
		root.render(
			<>
				<Deferred label="Preloaded" />
				<Later label="Later" />
			</>
		);
		await frame();
		await frame();
		expect(container.textContent).toBe('Preloaded: 0Later: 0');
		expect(fixture.load).toHaveBeenCalledOnce();
	} finally {
		root.unmount();
		container.remove();
	}
});
