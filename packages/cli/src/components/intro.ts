import figlet from 'figlet';
import color from 'picocolors';

import type { CliContext } from '~/context/types';

interface DeferredPromise<Value> {
	promise: Promise<Value>;
	resolve: (value: Value | PromiseLike<Value>) => void;
	reject: (reason?: unknown) => void;
}

type PromiseWithResolversConstructor = PromiseConstructor & {
	withResolvers: <Value>() => DeferredPromise<Value>;
};

const createDeferredPromise = function createDeferredPromise<Value>(
	run: (
		resolve: DeferredPromise<Value>['resolve'],
		reject: DeferredPromise<Value>['reject']
	) => void
): Promise<Value> {
	const deferred = (
		Promise as PromiseWithResolversConstructor
	).withResolvers<Value>();
	run(deferred.resolve, deferred.reject);
	return deferred.promise;
};

/**
 * Displays the CLI introduction sequence, including
 * welcome message, figlet art, version, and docs link.
 * @param context - The CLI context
 * @param version - The CLI version string.
 */
export const displayIntro = async function displayIntro(
	context: CliContext,
	_version: string
): Promise<void> {
	const { logger } = context;

	logger.info(`${color.bold('Welcome!')} Let's get you set up.`);

	// Spacing between welcome and figlet
	logger.message('');

	// Generate and display Figlet text (async)
	// Default
	let figletText = 'c15t';
	try {
		figletText = await createDeferredPromise((resolve) => {
			figlet.text(
				'c15t',
				{
					font: 'Nancyj-Improved',
					horizontalLayout: 'default',
					verticalLayout: 'default',
					whitespaceBreak: true,
					width: 80,
				},
				(err, data) => {
					if (err) {
						logger.debug('Failed to generate figlet text');
						resolve('c15t');
					} else {
						resolve(data || 'c15t');
					}
				}
			);
		});
	} catch (error) {
		logger.debug('Error generating figlet text', error);
	}

	// Display the figlet text - this needs to be displayed directly as figlet formatting is important
	// Apply a teal color fade with more vibrant top colors
	const customColor = {
		// More vibrant teal colors with less grayness at the top
		// Enhanced brightness
		teal10: (text: string) => `\x1b[38;2;10;80;70m${text}\x1b[0m`,
		// Super bright
		teal100: (text: string) => `\x1b[38;2;65;235;220m${text}\x1b[0m`,
		// Dark but more saturated
		// Less gray, more teal
		teal20: (text: string) => `\x1b[38;2;15;100;90m${text}\x1b[0m`,
		// Vibrant mid-dark
		teal30: (text: string) => `\x1b[38;2;20;120;105m${text}\x1b[0m`,
		// Medium brightness
		teal40: (text: string) => `\x1b[38;2;25;150;130m${text}\x1b[0m`,
		// Getting brighter
		teal50: (text: string) => `\x1b[38;2;30;170;150m${text}\x1b[0m`,
		// Original color
		teal75: (text: string) => `\x1b[38;2;34;211;187m${text}\x1b[0m`,
		teal90: (text: string) => `\x1b[38;2;45;225;205m${text}\x1b[0m`,
	};

	const lines = figletText.split('\n');
	const coloredLines = lines.map((line, index) => {
		// Calculate the position in the gradient based on line index
		const position = index / (lines.length - 1);

		// Create more gradual transitions, especially at the top
		if (position < 0.1) {
			// Start darker
			return customColor.teal10(line);
		}
		if (position < 0.2) {
			// Gradual transition
			return customColor.teal20(line);
		}
		if (position < 0.3) {
			// More gradual steps
			return customColor.teal30(line);
		}
		if (position < 0.4) {
			// Medium brightness
			return customColor.teal40(line);
		}
		if (position < 0.5) {
			// Getting brighter
			return customColor.teal50(line);
		}
		if (position < 0.65) {
			// Original full color
			return customColor.teal75(line);
		}
		if (position < 0.8) {
			// Enhanced brightness
			return customColor.teal90(line);
		}
		// End with super bright
		return customColor.teal100(line);
	});

	// Join all colored lines and send as a single message
	logger.message(coloredLines.join('\n'));

	// Version and Docs using the logger
	// logger.info(`Using c15t CLI ${color.dim(`v${version}`)}`);
	// logger.info(`Documentation: ${color.underline('https://c15t.com/docs')}`);

	// Spacing before next step
	// logger.message('');
};
