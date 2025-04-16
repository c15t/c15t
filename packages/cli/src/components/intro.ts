
import figlet from 'figlet';
import color from 'picocolors';
import type { CliContext } from '~/context/types';

/**
 * Displays the CLI introduction sequence, including
 * welcome message, figlet art, version, and docs link.
 * @param context - The CLI context
 * @param version - The CLI version string.
 */
export async function displayIntro(context: CliContext, version: string): Promise<void> {
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
	logger.message(color.cyan(figletText));

	// Version and Docs using the logger
	// logger.info(`Using c15t CLI ${color.dim(`v${version}`)}`);
	// logger.info(`Documentation: ${color.underline('https://c15t.com/docs')}`);
	
	// Spacing before next step
	// logger.message('');
}
