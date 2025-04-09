import * as Base from 'fumadocs-ui/components/codeblock';

/**
 * Props for the CodeBlock component.
 */
interface CodeBlockProps {
	/**
	 * The code to be highlighted and displayed.
	 */
	code: string;

	/**
	 * The language of the code for syntax highlighting.
	 */
	lang: string;

	/**
	 * Additional props to pass to the wrapper component.
	 */
	wrapper?: Base.CodeBlockProps;
}

/**
 * A component that highlights and displays code snippets with consistent styling.
 *
 * @param props - The props for the CodeBlock component.
 * @returns A JSX element that displays the highlighted code.
 *
 * @remarks
 * This component uses the FumaDocs library to highlight code syntax and ensure consistent styling.
 * It is used to wrap code snippets in documentation pages, providing a uniform appearance.
 */
export async function CodeBlock({ code, lang, wrapper }: CodeBlockProps) {
	// const rendered = await highlight(code, {
	// 	lang,
	// 	components: {
	// 		pre: Base.Pre,
	// 	},
	// });

	return <Base.CodeBlock {...wrapper}>{code}</Base.CodeBlock>;
}
