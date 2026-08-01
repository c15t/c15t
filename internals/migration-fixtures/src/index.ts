/**
 * Ground-truth database shapes captured from published `@c15t/backend`
 * releases. Consumed by the migrator's tests to prove that a real database
 * from any shipped version upgrades correctly.
 *
 * Fixtures are committed JSON under `fixtures/<shape>/<engine>.json` and are
 * regenerated with `bun run generate`. See the README for why they are
 * generated from npm rather than from the schema definitions in this repo.
 */

export { ENGINES, type Engine, type EngineName, engineByName } from './engines';
export type {
	CapturedColumn,
	CapturedShape,
	CapturedTable,
} from './introspect';
export {
	columnNames,
	domainTableNames,
	loadFixture,
	type UnsupportedShape,
} from './load';
export { type MigratorEra, SHAPES, type Shape, shapeByName } from './shapes';
