export const RelationType = {
	BelongsToOneRelation: 'BelongsToOneRelation', // when current model has exacly one related row in different table and current model is using foreign key
	HasOneRelation: 'HasOneRelation', // when current model has exactly one related row in different table and different table has foreign key to current model
	HasManyRelation: 'HasManyRelation', // when current model has many related rows in different table and different table has foreign key to current model
	BelongsToManyRelation: 'BelongsToManyRelation',
	HasOneThroughRelation: 'HasOneThroughRelation',
	HasManyThroughRelation: 'HasManyThroughRelation',
} as const;

export type RelationTypeMap = (typeof RelationType)[keyof typeof RelationType];
