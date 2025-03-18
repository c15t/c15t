import type {
	AliasableExpression,
	CommonTableExpressionNameNode,
	DeleteQueryBuilder,
	Expression,
	ExtractTypeFromStringReference,
	InsertQueryBuilder,
	OperationNode,
	QueryCreator,
	SelectQueryNode,
	UpdateObject,
	UpdateQueryBuilder,
} from 'kysely';
import type { UpdateObjectFactory } from '../model';
import type { ShallowRecord } from './type-utils';

/**
 * Parses a string like 'id, first_name' into a type 'id' | 'first_name'
 */
type ExtractColumnNamesFromColumnList<R extends string> =
	R extends `${infer C}, ${infer RS}`
		? C | ExtractColumnNamesFromColumnList<RS>
		: R;

/**
 * Parses a string like 'person(id, first_name)' into a type:
 *
 * {
 *   id: any,
 *   first_name: any
 * }
 *
 */
export type ExtractRowFromCommonTableExpressionName<CN extends string> =
	CN extends `${string}(${infer CL})`
		? { [C in ExtractColumnNamesFromColumnList<CL>]: any }
		: ShallowRecord<string, any>;

export interface CommonTableExpressionNode extends OperationNode {
	readonly kind: 'CommonTableExpressionNode';
	readonly name: CommonTableExpressionNameNode;
	readonly materialized?: boolean;
	readonly expression: OperationNode;
}

export type CommonTableExpression<DB, CN extends string> = (
	creator: QueryCreator<DB>
) => CommonTableExpressionOutput<DB, CN>;

type CommonTableExpressionOutput<DB, CN extends string> =
	| Expression<ExtractRowFromCommonTableExpressionName<CN>>
	| InsertQueryBuilder<DB, any, ExtractRowFromCommonTableExpressionName<CN>>
	| UpdateQueryBuilder<
			DB,
			any,
			any,
			ExtractRowFromCommonTableExpressionName<CN>
	  >
	| DeleteQueryBuilder<DB, any, ExtractRowFromCommonTableExpressionName<CN>>;

/**
 * Extracts 'person' from a string like 'person(id, first_name)'.
 */
type ExtractTableFromCommonTableExpressionName<CN extends string> =
	CN extends `${infer TB}(${string})` ? TB : CN;

export type RecursiveCommonTableExpression<DB, CN extends string> = (
	creator: QueryCreator<
		DB & {
			// Recursive CTE can select from itself.
			[K in ExtractTableFromCommonTableExpressionName<CN>]: ExtractRowFromCommonTableExpressionName<CN>;
		}
	>
) => CommonTableExpressionOutput<DB, CN>;

export type QueryCreatorWithCommonTableExpression<
	DB,
	CN extends string,
	CTE,
> = QueryCreator<
	DB & {
		[K in ExtractTableFromCommonTableExpressionName<CN>]: ExtractRowFromCommonTableExpression<CTE>;
	}
>;

/**
 * Given a common CommonTableExpression CTE extracts the row type from it.
 *
 * For example a CTE `(db) => db.selectFrom('person').select(['id', 'first_name'])`
 * would result in `Pick<Person, 'id' | 'first_name'>`.
 */
type ExtractRowFromCommonTableExpression<CTE> = CTE extends (
	creator: QueryCreator<any>
) => infer Q
	? Q extends Expression<infer QO>
		? QO
		: Q extends InsertQueryBuilder<any, any, infer QO>
			? QO
			: Q extends UpdateQueryBuilder<any, any, any, infer QO>
				? QO
				: Q extends DeleteQueryBuilder<any, any, infer QO>
					? QO
					: never
	: never;

export interface SelectQueryBuilderExpression<O>
	extends AliasableExpression<O> {
	get isSelectQueryBuilder(): true;
	toOperationNode(): SelectQueryNode;
}

export type ExtractRawTypeFromReferenceExpression<
	DB,
	TB extends keyof DB,
	RE,
	DV = unknown,
> = RE extends string
	? ExtractTypeFromStringReference<DB, TB, RE>
	: RE extends SelectQueryBuilderExpression<infer O>
		? O[keyof O] | null
		: RE extends (qb: any) => SelectQueryBuilderExpression<infer O>
			? O[keyof O] | null
			: RE extends Expression<infer O>
				? O
				: RE extends (qb: any) => Expression<infer O>
					? O
					: DV;

export type UpdateObjectExpression<
	DB,
	TB extends keyof DB,
	UT extends keyof DB = TB,
> = UpdateObject<DB, TB, UT> | UpdateObjectFactory<DB, TB, UT>;
