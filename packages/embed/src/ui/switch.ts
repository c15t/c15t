/**
 * Vanilla JS toggle switch for consent categories.
 */

export interface SwitchOptions {
	checked: boolean;
	disabled?: boolean;
	onChange: (checked: boolean) => void;
}

export function createSwitch(options: SwitchOptions): HTMLLabelElement {
	const label = document.createElement('label');
	label.setAttribute(
		'style',
		`
		position: relative;
		display: inline-flex;
		width: 36px;
		height: 20px;
		flex-shrink: 0;
		cursor: ${options.disabled ? 'not-allowed' : 'pointer'};
		opacity: ${options.disabled ? '0.5' : '1'};
	`
			.replace(/\s+/g, ' ')
			.trim()
	);

	const input = document.createElement('input');
	input.type = 'checkbox';
	input.checked = options.checked;
	input.disabled = options.disabled ?? false;
	input.setAttribute(
		'style',
		'position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0);'
	);

	const track = document.createElement('span');
	const updateTrack = (checked: boolean) => {
		track.setAttribute(
			'style',
			`
			position: absolute;
			inset: 0;
			border-radius: 10px;
			background: ${checked ? 'var(--c15t-switch-track-active, hsl(228, 100%, 60%))' : 'var(--c15t-switch-track, hsl(0, 0%, 85%))'};
			transition: background var(--c15t-duration-fast, 150ms);
		`
				.replace(/\s+/g, ' ')
				.trim()
		);
	};
	updateTrack(options.checked);

	const thumb = document.createElement('span');
	const updateThumb = (checked: boolean) => {
		thumb.setAttribute(
			'style',
			`
			position: absolute;
			top: 2px;
			left: ${checked ? '18px' : '2px'};
			width: 16px;
			height: 16px;
			border-radius: 50%;
			background: var(--c15t-switch-thumb, #fff);
			transition: left var(--c15t-duration-fast, 150ms);
			box-shadow: 0 1px 3px rgba(0,0,0,0.2);
		`
				.replace(/\s+/g, ' ')
				.trim()
		);
	};
	updateThumb(options.checked);

	input.addEventListener('change', () => {
		updateTrack(input.checked);
		updateThumb(input.checked);
		options.onChange(input.checked);
	});

	label.append(input, track, thumb);

	// Expose update method for external state changes
	(
		label as HTMLLabelElement & { setChecked: (v: boolean) => void }
	).setChecked = (v: boolean) => {
		input.checked = v;
		updateTrack(v);
		updateThumb(v);
	};

	return label;
}
