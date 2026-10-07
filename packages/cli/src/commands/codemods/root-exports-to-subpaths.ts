import { Node, SyntaxKind } from 'ts-morph';
import type * as TsMorphTypes from 'ts-morph';

import { runTransform } from './runner';
import type { CodemodRunOptions, CodemodRunResult } from './runner';
import {
	addTodo,
	applyEdits,
	isNameTaken,
	moveSpecifiers,
	toTextEdit,
	UNCHANGED,
} from './source-edits';
import type { SpecifierMove, TextEdit, TransformResult } from './source-edits';

type Destination = 'headless' | 'trigger' | 'types' | 'banner' | 'core';

/** Names the v2 `@c15t/react` and `@c15t/nextjs` roots exported that v3 serves from a subpath. */
const MOVED_GROUPS: [Destination, string[]][] = [
	// Served by `/headless` on every framework entry.
	[
		'headless',
		[
			'ConsentDialogTriggerVisibility',
			'defaultTranslationConfig',
			'detectBrowserLanguage',
			'HeadlessConsentBannerAction',
			'HeadlessConsentBannerState',
			'HeadlessConsentDialogAction',
			'HeadlessConsentDialogState',
			'HeadlessConsentSurface',
			'HeadlessConsentSurfaceAction',
			'HeadlessConsentSurfaceState',
			'HeadlessConsentWriteAction',
			'mergeTranslationConfigs',
			'prepareTranslationConfig',
			'useColorScheme',
			'useConsentDialogTrigger',
			'UseConsentDialogTriggerOptions',
			'UseConsentDialogTriggerResult',
			'useFocusTrap',
			'useHeadlessConsentUI',
		],
	],
	// `/consent-dialog-trigger`, React entries only.
	[
		'trigger',
		[
			'ConsentDialogTriggerCompound',
			'TriggerButton',
			'TriggerButtonProps',
			'TriggerIcon',
			'TriggerIconProps',
			'TriggerIconType',
			'TriggerRoot',
			'TriggerRootProps',
			'TriggerSize',
			'TriggerText',
			'TriggerTextProps',
			'TriggerVisibility',
			'useDraggable',
			'UseDraggableOptions',
			'UseDraggableReturn',
			'useTriggerContext',
		],
	],
	// `/types`, React entries only.
	[
		'types',
		[
			'ColorTokens',
			'MotionTokens',
			'RadiusTokens',
			'ShadowTokens',
			'SpacingTokens',
			'TypographyTokens',
		],
	],
	// `/components/consent-banner`, React entries only. The short names also
	// exist on the dialog and widget entries with other meanings.
	[
		'banner',
		[
			'AcceptButton',
			'Card',
			'ConsentBannerAcceptButton',
			'ConsentBannerCard',
			'ConsentBannerCustomizeButton',
			'ConsentBannerDescription',
			'ConsentBannerFooter',
			'ConsentBannerFooterSubGroup',
			'ConsentBannerHeader',
			'ConsentBannerRejectButton',
			'ConsentBannerTitle',
			'CustomizeButton',
			'Description',
			'Footer',
			'FooterSubGroup',
			'Header',
			'RejectButton',
			'Title',
		],
	],
	// The headless engine root.
	[
		'core',
		[
			'AllConsentNames',
			'buildPrefetchScript',
			'ConsentType',
			'Overrides',
			'PrefetchOptions',
			'Translations',
		],
	],
];

const MOVED = new Map<string, Destination>(
	MOVED_GROUPS.flatMap(([destination, names]) =>
		names.map((name) => [name, destination] as const)
	)
);

/** Root names v3 removed, with what to use instead. */
const REMOVED: Record<string, string> = {
	C15tPrefetch:
		'Render ConsentRoot with state from resolveConsent() in c15t/next/server.',
	ComponentSlots: 'Use ReactComponentSlots from c15t/react/types.',
	ConsentButton:
		'Use the ConsentBanner and ConsentWidget buttons, or call useHeadlessConsentUI() from your own button.',
	ConsentManagerInterface: 'Read state through the v3 hooks.',
	ConsentStoreState: 'Read state through the v3 hooks.',
	GoogleMap: 'Wrap your own embed in ConsentGate.',
	SlotStyle: 'Use ReactComponentSlots from c15t/react/types.',
	UseHeadlessConsentUIResult: 'Use ReturnType<typeof useHeadlessConsentUI>.',
	YouTubeEmbed: 'Wrap your own embed in ConsentGate.',
	configureConsentManager: 'Use createConsentRuntime() from c15t/runtime.',
	fetchInitialData:
		'Render ConsentRoot with state from resolveConsent() in c15t/next/server.',
	useConsentScript:
		'Register the script in the scripts option with a @c15t/integrations helper.',
	useSSRStatus: 'There is no replacement.',
};

interface EntryFamily {
	/** Entry for names served by the framework's own headless entry. */
	headless: string;
	/** Entry prefix for React-only subpaths. */
	react: string;
	/** Headless engine entry. */
	core: string;
}

const FAMILIES: Record<string, EntryFamily> = {
	'@c15t/nextjs': {
		core: '@c15t/core',
		headless: '@c15t/nextjs/headless',
		react: '@c15t/react',
	},
	'@c15t/react': {
		core: '@c15t/core',
		headless: '@c15t/react/headless',
		react: '@c15t/react',
	},
	'c15t/next': {
		core: 'c15t',
		headless: 'c15t/next/headless',
		react: 'c15t/react',
	},
	'c15t/react': {
		core: 'c15t',
		headless: 'c15t/react/headless',
		react: 'c15t/react',
	},
};

const targetFor = function targetFor(
	family: EntryFamily,
	destination: Destination
): string {
	switch (destination) {
		case 'headless': {
			return family.headless;
		}
		case 'trigger': {
			return `${family.react}/consent-dialog-trigger`;
		}
		case 'types': {
			return `${family.react}/types`;
		}
		case 'banner': {
			return `${family.react}/components/consent-banner`;
		}
		default: {
			return family.core;
		}
	}
};

const planDeclaration = function planDeclaration(
	declaration: TsMorphTypes.ImportDeclaration | TsMorphTypes.ExportDeclaration,
	family: EntryFamily,
	edits: TextEdit[],
	summaries: string[]
): number {
	const specifiers =
		'getNamedImports' in declaration
			? declaration.getNamedImports()
			: declaration.getNamedExports();
	const moves = new Map<TsMorphTypes.Node, SpecifierMove>();
	let operations = 0;
	for (const specifier of specifiers) {
		const name = specifier.getNameNode().getText();
		const destination = MOVED.get(name);
		if (destination) {
			const target = targetFor(family, destination);
			moves.set(specifier, { target, text: specifier.getText() });
			summaries.push(`${name} -> ${target}`);
			operations += 1;
			continue;
		}
		const hint = REMOVED[name];
		if (hint && addTodo(declaration, `${name} was removed. ${hint}`, edits)) {
			summaries.push(`TODO: ${name}`);
			operations += 1;
		}
	}
	moveSpecifiers(declaration, moves, edits);
	return operations;
};

/**
 * `import * as c15t from '@c15t/react'`: each `c15t.Name` that moved becomes
 * `Name`, imported from its v3 entry, unless the file already uses the name.
 * Accesses to removed names, and moved names that clash, get a TODO.
 */
const planNamespaceImport = function planNamespaceImport(
	declaration: TsMorphTypes.ImportDeclaration,
	namespace: TsMorphTypes.Identifier,
	family: EntryFamily,
	edits: TextEdit[],
	summaries: string[]
): number {
	const sourceFile = declaration.getSourceFile();
	const groups = new Map<string, Map<string, boolean>>();
	let operations = 0;
	for (const reference of namespace.findReferencesAsNodes()) {
		const parent = reference.getParent();
		if (
			reference.getSourceFile() !== sourceFile ||
			!(
				(Node.isPropertyAccessExpression(parent) &&
					parent.getExpression() === reference) ||
				(Node.isQualifiedName(parent) && parent.getLeft() === reference)
			)
		) {
			continue;
		}
		const name = Node.isQualifiedName(parent)
			? parent.getRight().getText()
			: parent.getName();
		const access = `${namespace.getText()}.${name}`;
		const hint = REMOVED[name];
		if (hint) {
			if (
				addTodo(declaration, `${access}: ${name} was removed. ${hint}`, edits)
			) {
				summaries.push(`TODO: ${name}`);
				operations += 1;
			}
			continue;
		}
		const destination = MOVED.get(name);
		if (!destination) {
			continue;
		}
		const target = targetFor(family, destination);
		if (isNameTaken(sourceFile, name)) {
			if (
				addTodo(
					declaration,
					`${access} moved to ${target}. Import ${name} from there.`,
					edits
				)
			) {
				summaries.push(`TODO: ${name}`);
				operations += 1;
			}
			continue;
		}
		edits.push(toTextEdit(parent, name));
		// A name used only in types is imported with `type`.
		const typeUse =
			Node.isQualifiedName(parent) &&
			!parent.getFirstAncestorByKind(SyntaxKind.TypeQuery);
		const names = groups.get(target) ?? new Map<string, boolean>();
		names.set(name, (names.get(name) ?? true) && typeUse);
		groups.set(target, names);
		summaries.push(`${access} -> ${target}`);
		operations += 1;
	}
	const quote = declaration.getModuleSpecifier().getText().charAt(0);
	const typeOnly = declaration.isTypeOnly();
	const lines = [...groups].map(([target, names]) => {
		const list = [...names]
			.map(([name, onlyTypes]) =>
				onlyTypes && !typeOnly ? `type ${name}` : name
			)
			.join(', ');
		return `\nimport ${typeOnly ? 'type ' : ''}{ ${list} } from ${quote}${target}${quote};`;
	});
	if (lines.length > 0) {
		edits.push({
			end: declaration.getEnd(),
			start: declaration.getEnd(),
			text: lines.join(''),
		});
	}
	return operations;
};

const STAR_EXPORT_TODO =
	'In v3 this entry no longer exports the names that moved to subpaths, such as the headless hooks, trigger parts and token types. Re-export the subpaths you need as well.';

const transformSourceFile = function transformSourceFile(
	sourceFile: TsMorphTypes.SourceFile
): TransformResult {
	const edits: TextEdit[] = [];
	const summaries: string[] = [];
	let operations = 0;
	const declarations = [
		...sourceFile.getImportDeclarations(),
		...sourceFile.getExportDeclarations(),
	];
	for (const declaration of declarations) {
		const family = FAMILIES[declaration.getModuleSpecifierValue() ?? ''];
		if (!family) {
			continue;
		}
		const namespace = Node.isImportDeclaration(declaration)
			? declaration.getNamespaceImport()
			: undefined;
		if (namespace && Node.isImportDeclaration(declaration)) {
			operations += planNamespaceImport(
				declaration,
				namespace,
				family,
				edits,
				summaries
			);
			continue;
		}
		if (
			Node.isExportDeclaration(declaration) &&
			!declaration.hasNamedExports()
		) {
			if (addTodo(declaration, STAR_EXPORT_TODO, edits)) {
				summaries.push('TODO: star export');
				operations += 1;
			}
			continue;
		}
		operations += planDeclaration(declaration, family, edits, summaries);
	}
	if (edits.length === 0) {
		return UNCHANGED;
	}
	applyEdits(sourceFile, edits);
	return { changed: true, operations, summaries: [...new Set(summaries)] };
};

/**
 * Moves imports and re-exports of names that left the v3 `c15t/react`,
 * `c15t/next`, `@c15t/react` and `@c15t/nextjs` roots to the subpath that
 * exports them now, and marks removed names with a `TODO(c15t v3)` comment.
 *
 * @param options - Codemod execution options.
 * @returns Changed files and non-fatal per-file errors.
 */
export const runRootExportsToSubpathsCodemod =
	function runRootExportsToSubpathsCodemod(
		options: CodemodRunOptions
	): Promise<CodemodRunResult> {
		return runTransform(options, transformSourceFile);
	};
