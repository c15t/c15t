import * as p from '@clack/prompts';
import figlet from 'figlet';
import color from 'picocolors';

/**
 * Displays the CLI introduction sequence, including
 * welcome message, figlet art, version, and docs link.
 * @param version - The CLI version string.
 */
export async function displayIntro(version: string): Promise<void> {
	// Welcome Message
	p.log.message(
		`${color.bgCyan(color.black(' c15t '))} ${color.bold('Welcome!')} Let's get you set up.`
	);
	p.log.message(''); // Spacing

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
						resolve('c15t');
					} else {
						resolve(data || 'c15t');
					}
				}
			);
		});
	} catch {
		// Ignore errors, figletText already has default
	}

	p.log.message(color.cyan(figletText));
	// Removed extra space here for tighter layout

	// Version and Docs
	p.log.info(`${color.green('✔')} Using c15t CLI ${color.dim(`v${version}`)}`);
	p.log.info(
		`${color.blue('ℹ')} Documentation: ${color.underline('https://c15t.com/docs')}`
	);
	p.log.message(''); // Spacing before next step
}
