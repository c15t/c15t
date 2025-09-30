import type { JSX } from 'preact';
import { useLayoutEffect } from 'preact/hooks';
import { act as preactAct } from 'preact/test-utils';
import { type ComponentRenderOptions, render } from 'vitest-browser-preact';

export interface RenderHookResult<R, P> {
	rerender: (props?: P) => void;
	result: { current: R };
	unmount: () => void;
	act: (cb: () => unknown) => void;
}

export interface RenderHookOptions<P>
	extends Omit<ComponentRenderOptions, 'wrapper'> {
	wrapper?: ({ children }: { children: JSX.Element }) => JSX.Element;
	initialProps?: P;
}

export function renderHook<P, R>(
	renderCallback: (initialProps?: P) => R,
	options: RenderHookOptions<P> = {}
): RenderHookResult<R, P> {
	const { initialProps, wrapper, ...renderOptions } = options;
	const result = { current: undefined as unknown as R };

	function Inner({ renderCallbackProps }: { renderCallbackProps?: P }) {
		const pending = renderCallback(renderCallbackProps);
		useLayoutEffect(() => {
			result.current = pending;
		});
		return null;
	}

	const TestTree = ({ props }: { props?: P }) =>
		wrapper ? (
			wrapper({ children: <Inner renderCallbackProps={props} /> })
		) : (
			<Inner renderCallbackProps={props} />
		);

	const { rerender: baseRerender, unmount: baseUnmount } = render(
		<TestTree props={initialProps} />,
		renderOptions
	);

	// Ensure effects have run before the test reads result.current
	preactAct(() => {});

	const rerender = (next?: P) => baseRerender(<TestTree props={next} />);
	const unmount = () => baseUnmount();
	const act = (cb: () => unknown) =>
		preactAct(cb as () => void | Promise<void>);

	return { result, rerender, unmount, act };
}
