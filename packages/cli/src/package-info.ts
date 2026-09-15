import manifest from '../package.json';

/** Metadata for the installed CLI, independent of the user's project. */
export const packageInfo = { name: manifest.name, version: manifest.version };
