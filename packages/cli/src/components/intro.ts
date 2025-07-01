import figlet from 'figlet';
import color from 'picocolors';
import type { CliContext } from '~/context/types';

/**
 * Displays the CLI introduction sequence, including
 * welcome message, figlet art, version, and docs link.
 * @param context - The CLI context
 * @param version - The CLI version string.
 */
export async function displayIntro(context: CliContext): Promise<void> {
	const { logger } = context;

	logger.info(`${color.bold('Welcome!')} Let's get you set up.`);

	// Spacing between welcome and figlet
	logger.message('');

	// Generate and display Figlet text (async)
	let figletText = 'c15t'; // Default
	try {
		figletText = await new Promise((resolve) => {
			figlet.text(
				'c15t',
				{
					font: 'Nancyj-Improved',
					horizontalLayout: 'default',
					verticalLayout: 'default',
					width: 80,
					whitespaceBreak: true,
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
		teal10: (text: string) => `\x1b[38;2;10;80;70m${text}\x1b[0m`, // Dark but more saturated
		teal20: (text: string) => `\x1b[38;2;15;100;90m${text}\x1b[0m`, // Less gray, more teal
		teal30: (text: string) => `\x1b[38;2;20;120;105m${text}\x1b[0m`, // Vibrant mid-dark
		teal40: (text: string) => `\x1b[38;2;25;150;130m${text}\x1b[0m`, // Medium brightness
		teal50: (text: string) => `\x1b[38;2;30;170;150m${text}\x1b[0m`, // Getting brighter
		teal75: (text: string) => `\x1b[38;2;34;211;187m${text}\x1b[0m`, // Original color
		teal90: (text: string) => `\x1b[38;2;45;225;205m${text}\x1b[0m`, // Enhanced brightness
		teal100: (text: string) => `\x1b[38;2;65;235;220m${text}\x1b[0m`, // Super bright
	};

	const lines = figletText.split('\n');
	const coloredLines = lines.map((line, index) => {
		// Calculate the position in the gradient based on line index
		const position = index / (lines.length - 1);

		// Create more gradual transitions, especially at the top
		if (position < 0.1) {
			return customColor.teal10(line); // Start darker
		}
		if (position < 0.2) {
			return customColor.teal20(line); // Gradual transition
		}
		if (position < 0.3) {
			return customColor.teal30(line); // More gradual steps
		}
		if (position < 0.4) {
			return customColor.teal40(line); // Medium brightness
		}
		if (position < 0.5) {
			return customColor.teal50(line); // Getting brighter
		}
		if (position < 0.65) {
			return customColor.teal75(line); // Original full color
		}
		if (position < 0.8) {
			return customColor.teal90(line); // Enhanced brightness
		}
		return customColor.teal100(line); // End with super bright
	});

	// Join all colored lines and send as a single message
	logger.message(coloredLines.join('\n'));

	// Version and Docs using the logger
	// logger.info(`Using c15t CLI ${color.dim(`v${version}`)}`);
	// logger.info(`Documentation: ${color.underline('https://c15t.com/docs')}`);

	// Spacing before next step
	// logger.message('');
}
