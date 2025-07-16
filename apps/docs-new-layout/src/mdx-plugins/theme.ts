/**
 * Custom Shiki themes based on the project's design system
 * Using actual OKLCH color values from Tailwind CSS and project color definitions
 * Mapped to match the syntaxhighlighting.css color scheme
 */

/**
 * Light theme variant using the project's color palette
 */
export const customTheme = {
	name: 'light-astro-tailwind',
	type: 'light' as const,
	colors: {
		'editor.background': '#ffffff', // From user's example theme
		'editor.foreground': '#24292e', // From user's example theme
		'editorLineNumber.foreground': '#1b1f23', // From user's example theme (opacity handled by CSS)
		'editorLineNumber.activeForeground': '#24292e', // From user's example theme
		'editor.selectionBackground': '#0366d6', // From user's example theme (opacity handled by CSS)
		'editor.currentLineBackground': '#f6f8fa', // From user's example theme
		'activityBar.background': '#ffffff', // Aligned with editor background
		'sideBar.background': '#ffffff', // Aligned with editor background
		'statusBar.background': '#ffffff', // Aligned with editor background
		'panel.background': '#ffffff', // Aligned with editor background
		'terminal.background': '#ffffff', // Aligned with editor background
	},
	settings: [
		{
			scope: ['comment', 'punctuation.definition.comment', 'string.comment'],
			settings: {
				foreground: '#6a737d', // From user's example
			},
		},
		{
			scope: [
				'constant',
				'entity.name.constant',
				'variable.other.constant',
				'variable.other.enummember',
				'variable.language',
			],
			settings: {
				foreground: '#005cc5', // From user's example
			},
		},
		{
			scope: ['entity', 'entity.name'],
			settings: {
				foreground: '#6f42c1', // From user's example
			},
		},
		{
			scope: 'variable.parameter.function',
			settings: {
				foreground: '#24292e', // From user's example
			},
		},
		{
			scope: 'entity.name.tag',
			settings: {
				foreground: '#22863a', // From user's example
			},
		},
		{
			scope: 'keyword',
			settings: {
				foreground: '#d73a49', // From user's example
			},
		},
		{
			scope: ['storage', 'storage.type'],
			settings: {
				foreground: '#d73a49', // From user's example
			},
		},
		{
			scope: [
				'storage.modifier.package',
				'storage.modifier.import',
				'storage.type.java',
			],
			settings: {
				foreground: '#24292e', // From user's example
			},
		},
		{
			scope: [
				'string',
				'punctuation.definition.string',
				'string punctuation.section.embedded source',
			],
			settings: {
				foreground: '#032f62', // From user's example
			},
		},
		{
			scope: 'support',
			settings: {
				foreground: '#005cc5', // From user's example
			},
		},
		{
			scope: 'meta.property-name',
			settings: {
				foreground: '#005cc5', // From user's example
			},
		},
		{
			scope: 'variable',
			settings: {
				foreground: '#e36209', // From user's example
			},
		},
		{
			scope: 'variable.other',
			settings: {
				foreground: '#24292e', // From user's example
			},
		},
		{
			scope: [
				'invalid.broken',
				'invalid.deprecated',
				'invalid.illegal',
				'invalid.unimplemented',
			],
			settings: {
				fontStyle: 'italic',
				foreground: '#b31d28', // From user's example
			},
		},
		{
			scope: 'carriage-return',
			settings: {
				background: '#d73a49', // From user's example
				content: '^M',
				fontStyle: 'italic underline',
				foreground: '#fafbfc', // From user's example
			},
		},
		{
			scope: 'message.error',
			settings: {
				foreground: '#b31d28', // From user's example
			},
		},
		{
			scope: 'string variable',
			settings: {
				foreground: '#005cc5', // From user's example
			},
		},
		{
			scope: ['source.regexp', 'string.regexp'],
			settings: {
				foreground: '#032f62', // From user's example
			},
		},
		{
			scope: [
				'string.regexp.character-class',
				'string.regexp constant.character.escape',
				'string.regexp source.ruby.embedded',
				'string.regexp string.regexp.arbitrary-repitition',
			],
			settings: {
				foreground: '#032f62', // From user's example
			},
		},
		{
			scope: 'string.regexp constant.character.escape',
			settings: {
				fontStyle: 'bold',
				foreground: '#22863a', // From user's example
			},
		},
		{
			scope: 'support.constant',
			settings: {
				foreground: '#005cc5', // From user's example
			},
		},
		{
			scope: 'support.variable',
			settings: {
				foreground: '#005cc5', // From user's example
			},
		},
		{
			scope: 'meta.module-reference',
			settings: {
				foreground: '#005cc5', // From user's example
			},
		},
		{
			scope: 'punctuation.definition.list.begin.markdown',
			settings: {
				foreground: '#e36209', // From user's example
			},
		},
		{
			scope: ['markup.heading', 'markup.heading entity.name'],
			settings: {
				fontStyle: 'bold',
				foreground: '#005cc5', // From user's example
			},
		},
		{
			scope: 'markup.quote',
			settings: {
				foreground: '#22863a', // From user's example
			},
		},
		{
			scope: 'markup.italic',
			settings: {
				fontStyle: 'italic',
				foreground: '#24292e', // From user's example
			},
		},
		{
			scope: 'markup.bold',
			settings: {
				fontStyle: 'bold',
				foreground: '#24292e', // From user's example
			},
		},
		{
			scope: ['markup.underline'],
			settings: {
				fontStyle: 'underline', // From user's example
			},
		},
		{
			scope: ['markup.strikethrough'],
			settings: {
				fontStyle: 'strikethrough', // From user's example
			},
		},
		{
			scope: 'markup.inline.raw',
			settings: {
				foreground: '#005cc5', // From user's example
			},
		},
		{
			scope: [
				'markup.deleted',
				'meta.diff.header.from-file',
				'punctuation.definition.deleted',
			],
			settings: {
				background: '#ffeef0', // From user's example
				foreground: '#b31d28', // From user's example
			},
		},
		{
			scope: [
				'markup.inserted',
				'meta.diff.header.to-file',
				'punctuation.definition.inserted',
			],
			settings: {
				background: '#f0fff4', // From user's example
				foreground: '#22863a', // From user's example
			},
		},
		{
			scope: ['markup.changed', 'punctuation.definition.changed'],
			settings: {
				background: '#ffebda', // From user's example
				foreground: '#e36209', // From user's example
			},
		},
		{
			scope: ['markup.ignored', 'markup.untracked'],
			settings: {
				background: '#005cc5', // From user's example
				foreground: '#f6f8fa', // From user's example
			},
		},
		{
			scope: 'meta.diff.range',
			settings: {
				fontStyle: 'bold',
				foreground: '#6f42c1', // From user's example
			},
		},
		{
			scope: 'meta.diff.header',
			settings: {
				foreground: '#005cc5', // From user's example
			},
		},
		{
			scope: 'meta.separator',
			settings: {
				fontStyle: 'bold',
				foreground: '#005cc5', // From user's example
			},
		},
		{
			scope: 'meta.output',
			settings: {
				foreground: '#005cc5', // From user's example
			},
		},
		{
			scope: [
				'brackethighlighter.tag',
				'brackethighlighter.curly',
				'brackethighlighter.round',
				'brackethighlighter.square',
				'brackethighlighter.angle',
				'brackethighlighter.quote',
			],
			settings: {
				foreground: '#586069', // From user's example
			},
		},
		{
			scope: 'brackethighlighter.unmatched',
			settings: {
				foreground: '#b31d28', // From user's example
			},
		},
		{
			scope: ['constant.other.reference.link', 'string.other.link'],
			settings: {
				fontStyle: 'underline',
				foreground: '#032f62', // From user's example
			},
		},
	],
};

/**
 * Dark theme variant using the project's color palette, ensuring good contrast.
 */
export const customDarkTheme = {
	name: 'dark-astro-tailwind',
	type: 'dark' as const,
	colors: {
		'editor.background': '#252525', // Retained from previous dark theme for strong contrast
		'editor.foreground': '#A5F3FC', // Retained from previous dark theme for strong contrast
		'editorLineNumber.foreground': '#06B6D4',
		'editorLineNumber.activeForeground': '#22D3EE',
		'editor.selectionBackground': '#454545',
		'editor.currentLineBackground': '#343434',
		'activityBar.background': '#252525',
		'sideBar.background': '#252525',
		'statusBar.background': '#252525',
		'panel.background': '#252525',
		'terminal.background': '#252525',
	},
	settings: [
		{
			scope: [
				'variable.other.constant',
				'meta.object.member',
				'meta.attribute.entity',
				'entity.name.type.class',
				'source',
			],
			settings: {
				foreground: '#A5F3FC',
			},
		},
		{
			scope: [
				'punctuation.definition.entity',
				'punctuation.separator',
				'punctuation.accessor',
				'punctuation.definition.tag',
				'punctuation.definition.parameters',
				'punctuation.definition.string',
				'punctuation.definition.array',
				'punctuation.definition.block',
				'punctuation.definition.list',
			],
			settings: {
				foreground: '#22D3EE',
			},
		},
		{
			scope: 'variable.parameter',
			settings: {
				foreground: '#A5F3FC',
			},
		},
		{
			scope: ['entity.other.attribute-name.line-number', 'line-number'],
			settings: {
				foreground: '#06B6D4',
			},
		},
		{
			scope: ['comment', 'comment.line', 'comment.block'],
			settings: {
				foreground: '#8C8C8C',
			},
		},
		{
			scope: 'comment.block.cdata',
			settings: {
				foreground: '#A5F3FC',
			},
		},
		{
			scope: [
				'constant.language',
				'constant.numeric',
				'constant.character',
				'constant.other',
			],
			settings: {
				foreground: '#60A5FA',
			},
		},
		{
			scope: ['entity.name.function', 'support.function'],
			settings: {
				foreground: '#93C5FD',
			},
		},
		{
			scope: 'support.function.builtin',
			settings: {
				foreground: '#60A5FA',
			},
		},
		{
			scope: ['entity.name.type.class', 'support.class'],
			settings: {
				foreground: '#BFDBFE',
			},
		},
		{
			scope: ['variable.other.property', 'meta.property-name'],
			settings: {
				foreground: '#60A5FA',
			},
		},
		{
			scope: [
				'entity.name.tag.css',
				'entity.other.attribute-name.css.selector',
				'entity.other.pseudo-class',
				'entity.other.pseudo-element',
			],
			settings: {
				foreground: '#93C5FD',
			},
		},
		{
			scope: ['entity.other.attribute-name', 'entity.name.tag.xml'],
			settings: {
				foreground: '#B4C6FC',
			},
		},
		{
			scope: [
				'string.quoted.double',
				'string.quoted.single',
				'string.unquoted',
			],
			settings: {
				foreground: '#CDDBFE',
			},
		},
		{
			scope: 'entity.name.tag',
			settings: {
				foreground: '#B4C6FC',
			},
		},
		{
			scope: ['string', 'string.quoted'],
			settings: {
				foreground: '#BEF264',
			},
		},
		{
			scope: ['string.quoted.interpolation', 'string.template'],
			settings: {
				foreground: '#BEF264',
			},
		},
		{
			scope: [
				'variable.other.readwrite',
				'variable.other.object',
				'variable.language',
			],
			settings: {
				foreground: '#5EEAD4',
			},
		},
		{
			scope: ['entity.name.namespace', 'entity.name.scope-resolution'],
			settings: {
				foreground: '#A5F3FC',
			},
		},
		{
			scope: ['keyword', 'keyword.control', 'keyword.operator.new'],
			settings: {
				foreground: '#B2CCFF',
			},
		},
		{
			scope: [
				'keyword.operator',
				'keyword.operator.arithmetic',
				'keyword.operator.assignment',
				'keyword.operator.comparison',
				'keyword.operator.logical',
			],
			settings: {
				foreground: '#95B6FF',
			},
		},
		{
			scope: [
				'variable.other.constant.property',
				'entity.other.attribute-name.symbol',
				'punctuation.definition.template-expression',
			],
			settings: {
				foreground: '#95B6FF',
			},
		},
		{
			scope: 'constant.numeric',
			settings: {
				foreground: '#FDBA74',
			},
		},
		{
			scope: 'constant.language.boolean',
			settings: {
				foreground: '#FED7AA',
			},
		},
		{
			scope: 'markup.deleted',
			settings: {
				foreground: '#F87171',
			},
		},
		{
			scope: 'markup.inserted',
			settings: {
				foreground: '#4ADE80',
			},
		},
		{
			scope: 'markup.changed',
			settings: {
				foreground: '#FBBD24',
			},
		},
		{
			scope: ['keyword.other.important', 'storage.modifier.import'],
			settings: {
				foreground: '#FCA5A5',
			},
		},
		{
			scope: 'markup.highlighted',
			settings: {
				foreground: '#FBBD24',
			},
		},
		{
			scope: ['invalid.deprecated', 'invalid.illegal'],
			settings: {
				foreground: '#F87171',
			},
		},
		{
			scope: 'markup.italic',
			settings: {
				foreground: '#FBBD24',
				fontStyle: 'italic',
			},
		},
		{
			scope: 'markup.focused',
			settings: {
				foreground: '#FCD34D',
			},
		},
		{
			scope: 'markup.other.notice',
			settings: {
				foreground: '#60A5FA',
			},
		},
		{
			scope: ['keyword.control.at-rule', 'entity.name.at-rule'],
			settings: {
				foreground: '#F17EB8',
			},
		},
		{
			scope: ['entity', 'entity.name.type', 'entity.other'],
			settings: {
				foreground: '#F8B4D9',
			},
		},
		{
			scope: 'string.regexp',
			settings: {
				foreground: '#4ADE80',
			},
		},
		{
			scope: 'meta.tag.metadata.doctype',
			settings: {
				foreground: '#22D3EE',
			},
		},
		{
			scope: 'comment.block.documentation.prolog',
			settings: {
				foreground: '#06B6D4',
			},
		},
		{
			scope: 'markup.bold',
			settings: {
				fontStyle: 'bold',
			},
		},
		{
			scope: 'markup.underline',
			settings: {
				fontStyle: 'underline',
			},
		},
	],
};
