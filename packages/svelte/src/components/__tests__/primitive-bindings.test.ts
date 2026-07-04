import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, test } from 'vitest';
import BindablePrimitivesFixture from '../../__tests__/fixtures/bindable-primitives-fixture.svelte';

describe('Svelte primitive bindings', () => {
	test('updates bindable state while preserving consumer event handlers', async () => {
		render(BindablePrimitivesFixture);

		await fireEvent.click(screen.getByTestId('switch'));
		expect(screen.getByTestId('checked-value')).toHaveTextContent('true');
		expect(screen.getByTestId('switch-clicks')).toHaveTextContent('1');

		await fireEvent.click(screen.getByTestId('tab-two'));
		expect(screen.getByTestId('tab-value')).toHaveTextContent('two');
		expect(screen.getByTestId('tab-clicks')).toHaveTextContent('1');

		await fireEvent.click(screen.getByTestId('open-dialog'));
		expect(screen.getByTestId('dialog-open')).toHaveTextContent('true');

		await fireEvent.click(screen.getByTestId('close-dialog'));
		expect(screen.getByTestId('dialog-open')).toHaveTextContent('false');
		expect(screen.getByTestId('close-clicks')).toHaveTextContent('1');
	});
});
