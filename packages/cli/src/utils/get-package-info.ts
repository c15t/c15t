import path from 'node:path';
import fs from 'fs-extra';

export function getPackageInfo() {
	const packageJsonPath = path.join('package.json');
	return fs.readJSONSync(packageJsonPath);
}
