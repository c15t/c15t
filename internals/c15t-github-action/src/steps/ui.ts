interface WeightedAsciiArt {
	art: string;
	weight: number;
}

const ASCII_SET: WeightedAsciiArt[] = [
	{
		art: [
			'     _____                    _____',
			" ---'   __\\______      ______/__   `---",
			'           ______)    (______',
			'           __)            (__',
			'          __)              (__',
			' ---.______)                 (______.---',
			'',
			'       Your docs preview is ready',
		].join('\n'),
		weight: 1,
	},
	{
		art: [
			'⠀⠀⠀⠀⠀⣠⣴⣶⣿⣿⣷⣶⣶⣦⣄⡀⠀⠀⠀⠀',
			'⠀⠀⢠⣴⣿⡿⠟⠋⠁⠉⠉⠉⠉⠛⢿⣷⣆⠀⠀⠀',
			'⠀⢠⣿⡿⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⢿⣷⣄⠀',
			'⢀⣿⡿⠁⠀⠀⢰⣿⣿⠄⠀⠀⠀⠀⠀⠀⠈⢻⣿⡀',
			'⣾⣿⠃⠀⠀⠀⠀⠙⠉⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⡇  your docs are ready',
			'⢿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡀⠀⠀⠀⠀⣿⣿  ps. here’s a cookie too',
			'⢺⣿⡆⠀⠀⢀⣠⡀⠀⠀⠀⠀⣾⣿⡇⠀⠀⢠⣿⡟',
			'⠘⣿⣧⠀⠀⢸⣿⡟⠀⠀⠀⠀⠈⠉⠀⠀⢀⣾⡿⠁',
			'⠀⠙⢿⣷⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣾⣿⠃⠀',
			'⠀⠀⠈⠻⣿⣷⣤⣀⣀⣀⡀⣀⣠⣴⣿⣿⠟⠁⠀⠀',
			'⠀⠀⠀⠀⠈⠙⠻⠿⠿⢿⣿⣿⠿⠟⠉⠀⠀⠀⠀⠀',
		].join('\n'),
		weight: 10,
	},
	{
		art: [
			'          900    1000',
			'     800              1100',
			'',
			'   700                      1200',
			'',
			' 600                          1300',
			'               O',
			'500              \\           1400',
			'                 \\',
			' 400               \\        1500',
			'             vibes  \\',
			'    300              \\   1600',
			'',
			'we cant keep up with these vibes',
			'      your docs are ready',
		].join('\n'),
		weight: 10,
	},
];

function pickWeightedAscii(choices: WeightedAsciiArt[]): string {
	let total = 0;
	for (const c of choices) {
		const w = c.weight > 0 ? c.weight : 0;
		total += w;
	}
	if (total <= 0) {
		return choices[0]?.art || '';
	}
	const r = Math.random() * total;
	let acc = 0;
	for (const c of choices) {
		const w = c.weight > 0 ? c.weight : 0;
		acc += w;
		if (r < acc) {
			return c.art;
		}
	}
	return choices.at(-1)?.art || '';
}

export function buildDefaultPreviewComment(
	url: string,
	options?: { debug?: boolean }
): string {
	const updated = new Date().toUTCString();
	const ascii = options?.debug
		? ASCII_SET.map((a) => a.art).join('\n\n')
		: pickWeightedAscii(ASCII_SET);
	const lines: string[] = [];
	lines.push('```');
	lines.push(ascii);
	lines.push('```');
	lines.push('| Preview | Status | Updated (UTC) |');
	lines.push('| - | - | - |');
	lines.push(`| [Open Preview](${url}) | Ready | ${updated} |`);
	const pad = '   ';
	const padded = lines.map((l) => `${pad}${l}`);
	return padded.join('\n');
}
