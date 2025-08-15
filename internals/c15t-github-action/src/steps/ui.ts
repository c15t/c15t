interface WeightedAsciiArt {
	art: string;
	weight: number;
}

const ASCII_SET: WeightedAsciiArt[] = [
	{
		art: [
			'       _____                    _____',
			"   ---'   __\\______      ______/__   `---",
			'             ______)    (______',
			'             __)            (__',
			'            __)              (__',
			'   ---.______)                 (______.---',
			'',
			'         Your docs preview is ready',
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

export function buildDefaultPreviewComment(url: string): string {
	const updated = new Date().toUTCString();
	const ascii = pickWeightedAscii(ASCII_SET);
	const lines: string[] = [];
	lines.push('```');
	lines.push(ascii);
	lines.push('```');
	lines.push('| Preview | Status | Updated (UTC) |');
	lines.push('| - | - | - |');
	lines.push(`| [Open Preview](${url}) | Ready | ${updated} |`);
	return lines.join('\n');
}
