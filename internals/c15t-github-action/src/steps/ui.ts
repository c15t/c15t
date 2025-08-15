interface WeightedAsciiArt {
	art: string;
	weight: number;
}

const ASCII_SET: WeightedAsciiArt[] = [
	{
		art: [
			'⠀⠀⠀⠀⠀⠀_____⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀_____',
			"⠀⠀---'⠀⠀⠀__\\______⠀⠀⠀⠀⠀⠀______/__⠀⠀⠀`---",
			'⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀______)⠀⠀⠀⠀(______',
			'⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀__)⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀(__',
			'⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀__)⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀(__',
			'⠀⠀---.______)⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀(______.---',
			'',
			'All⠀signs⠀point⠀to…⠀your⠀docs⠀update⠀is⠀ready',
		].join('\n'),
		weight: 1,
	},
	{
		art: [
			'⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
			'⠀⠀⠀⠀⠀⠀⠀⢀⣠⣴⣶⣿⣿⡿⠿⠷⣶⣤⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀',
			'⠀⠀⠀⠀⢀⣴⣾⣿⣿⣿⣿⣿⣿⣇⠀⠀⢸⣿⣿⣿⣦⡀⠀⠀⠀⠀⠀⠀',
			'⠀⠀⢀⣴⣿⡿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⡀⠀⠀⠀⠀',
			'⠀⢠⣿⡟⠁⠀⠀⢹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⡀⠀⠀⠀',
			'⢠⣿⣿⣿⣦⣄⣠⣼⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⢿⣿⣿⣿⣷⠀⠀⠀',
			'⣾⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡏⠀⠀⢹⣿⣿⣿⡇⠀⠀One⠀warm⠀cookie⠀of',
			'⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⣶⣿⣿⣿⣿⣿⠀⠀documentation,⠀fresh⠀from',
			'⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠀⠀the⠀oven,⠀enjoy.',
			'⠈⢿⣿⣿⣿⣿⠟⠻⣿⣿⠋⠀⠉⣿⣿⣿⣿⣿⣿⣿⣿⡏⠀⢙⣿⠃⠀⠀',
			'⠀⠈⢿⣿⣿⠁⠀⠀⠘⣿⣆⠀⢀⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠏⠀⠀⠀',
			'⠀⠀⠀⠙⢿⣦⣤⣤⣶⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠋⠀⠀⠀⠀',
			'⠀⠀⠀⠀⠀⠙⠿⣿⣿⣿⣿⣿⣿⣿⣿⡟⠉⢹⣿⣿⡿⠟⠁⠀⠀⠀⠀⠀',
			'⠀⠀⠀⠀⠀⠀⠀⠀⠉⠛⠿⠿⣿⣿⣿⣷⡤⠾⠛⠉⠀⠀⠀⠀⠀⠀⠀⠀',
			'⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
		].join('\n'),
		weight: 1,
	},
	{
		art: [
			'⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀900⠀⠀⠀⠀1000',
			'⠀⠀⠀⠀⠀800⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀1100',
			'',
			'⠀⠀⠀700⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀1200',
			'',
			'⠀600⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀1300',
			'⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀(")',
			'500⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\\⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀1400',
			'⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\\',
			'⠀400⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\\⠀⠀⠀⠀⠀⠀⠀⠀1500',
			'⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀vibes⠀⠀⠀⠀\\',
			'⠀⠀⠀⠀300⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\\⠀⠀⠀1600',
			'',
			'we⠀cant⠀keep⠀up⠀with⠀these⠀vibes',
		].join('\n'),
		weight: 1,
	},
	{
		art: [
			'⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀_⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
			'⠀⠀⠀⠀⠀⠀⠀|⠀⠀⠀(_)⠀⠀⠀⠀|⠀⠀⠀⠀⠀⠀',
			'⠀⠀⠀⠀⠀⠀|⠀⠀⠀⠀_)⠀⠀|⠀⠀⠀⠀⠀⠀⠀⠀⠀',
			'⠀⠀(⠀⠀⠀⠀⠀⠀⠀(⠀⠀⠀⠀⠀|⠀⠀⠀⠀⠀⠀⠀⠀',
			'⠀⠀⠀(⠀⠀_.-"""-._⠀⠀⠀⠀)⠀⠀⠀⠀⠀',
			"⠀⠀(⠀.'⠀⠀⠀⠀⠀⠀⠀⠀⠀`.⠀⠀⠀)⠀⠀⠀⠀",
			'⠀⠀⠀/⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\\⠀⠀)⠀⠀⠀⠀',
			'⠀⠀|_=_=_=_=_=_=_=_|⠀⠀⠀⠀⠀⠀',
			"⠀⠀⠀\\⠀⠀'⠀⠀⠀⠀⠀⠀⠀'⠀⠀/⠀⠀⠀⠀⠀⠀⠀",
			"⠀⠀⠀⠀\\⠀`:⠀⠀⠀⠀⠀:'⠀/⠀⠀⠀⠀⠀⠀⠀⠀",
			"⠀⠀⠀⠀⠀\\⠀`:⠀⠀⠀:'⠀/⠀⠀⠀",
			"⠀⠀⠀⠀⠀⠀\\⠀`:⠀:'⠀/⠀⠀",
			"⠀⠀⠀⠀⠀⠀⠀\\⠀`:'⠀/⠀⠀",
			"⠀⠀⠀⠀⠀⠀⠀⠀\\`'/⠀⠀'⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀",
			'⠀⠀⠀⠀⠀⠀⠀⠀__||__⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
			'⠀⠀⠀⠀⠀⠀⠀|⠀docs⠀|',
			"⠀⠀⠀⠀⠀⠀⠀'------'",
			'your⠀docs⠀are⠀dropping⠀hot',
		].join('\n'),
		weight: 1,
	},
	{
		art: [
			'⠀⠀__',
			'⠀(`/\\',
			'⠀`=\\/\\⠀__...--~~~~~-._⠀⠀⠀_.-~~~~~--...__',
			'⠀⠀`=\\/\\⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\\⠀/⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\\\\',
			'⠀⠀⠀`=\\/⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀V⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\\\\',
			'⠀⠀⠀//_\\___--~~~~~~-._⠀⠀|⠀⠀_.-~~~~~~--...__\\\\',
			'⠀⠀//⠀⠀)⠀(..----~~~~._\\⠀|⠀/_.~~~~----.....__\\\\',
			'⠀===================\\\\|//====================',
			'',
			'I⠀just⠀read⠀your⠀latest⠀docs⠀update,⠀you’re⠀a⠀real⠀page⠀turner.',
		].join('\n'),
		weight: 1,
	},
	{
		art: [
			'⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀/⠀\\',
			'⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀/⠀_⠀\\',
			"⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀|.o⠀'.|",
			"⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀|'._.'|",
			'⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀|⠀⠀⠀⠀⠀|',
			"⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀,'|⠀⠀|⠀⠀|`.",
			'⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀/⠀⠀|⠀⠀|⠀⠀|⠀⠀\\',
			"⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀|,-'--|--'-.|",
			'I just launched your docs update into orbit.',
		].join('\n'),
		weight: 1,
	},
];

function pickWeightedAscii(choices: WeightedAsciiArt[], seed?: string): string {
	let total = 0;
	for (const c of choices) {
		const w = c.weight > 0 ? c.weight : 0;
		total += w;
	}
	if (total <= 0) {
		return choices[0]?.art || '';
	}
	// Deterministic fallback when a seed is provided (FNV-1a style hash)
	let r: number;
	if (seed) {
		let h = 2166136261 >>> 0;
		for (let i = 0; i < seed.length; i++) {
			h ^= seed.charCodeAt(i);
			// h *= 16777619 (using shifts to avoid bigint)
			h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
		}
		r = (h % total) as number;
	} else {
		r = Math.random() * total;
	}
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
	options?: { debug?: boolean; seed?: string }
): string {
	const updated = new Date().toUTCString();

	const formatArt = (ascii: string) => {
		const braille = '⠀';
		const asciiWithBrailleSpaces = ascii.replace(/ /g, braille);
		const pad = '   ';
		return asciiWithBrailleSpaces
			.split('\n')
			.map((l) => `${pad}${l}`)
			.join('\n');
	};

	if (options?.debug) {
		return [
			'```',
			ASCII_SET.map((a) => formatArt(a.art)).join('\n\n'),
			'```',
			'| Preview | Status | Updated (UTC) |',
			'| - | - | - |',
			`| [Open Preview](${url}) | Ready | ${updated} |`,
		].join('\n');
	}
	return [
		'```',
		formatArt(pickWeightedAscii(ASCII_SET, options?.seed ?? url)),
		'```',
		'| Preview | Status | Updated (UTC) |',
		'| - | - | - |',
		`| [Open Preview](${url}) | Ready | ${updated} |`,
	].join('\n');
}
