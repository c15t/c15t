import { Image as FrameworkImage } from 'fumadocs-core/framework';
import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';
import type {
	AnchorHTMLAttributes,
	FC,
	HTMLAttributes,
	ImgHTMLAttributes,
	TableHTMLAttributes,
} from 'react';
import { Callout } from './components/callout';
import { Card, Cards } from './components/card';
import {
	CodeBlock,
	CodeBlockTab,
	CodeBlockTabs,
	CodeBlockTabsList,
	CodeBlockTabsTrigger,
	Pre,
} from './components/codeblock';
import { Heading } from './components/heading';
import { Tab, Tabs } from './components/interactive/tabs';
import { cn } from './lib/utils';

function Table(props: TableHTMLAttributes<HTMLTableElement>) {
	return (
		<div className="prose-no-margin relative my-6 overflow-auto">
			<table {...props} />
		</div>
	);
}

function Image(
	props: ImgHTMLAttributes<HTMLImageElement> & {
		sizes?: string;
	}
) {
	return (
		<FrameworkImage
			sizes="(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 900px"
			{...props}
			src={props.src as unknown as string}
			className={cn('rounded-lg', props.className)}
		/>
	);
}

// use this function to get MDX components, you will need it for rendering MDX
export function getMDXComponents(components?: MDXComponents): MDXComponents {
	return {
		CodeBlockTab,
		CodeBlockTabs,
		CodeBlockTabsList,
		CodeBlockTabsTrigger,
		pre: (props: HTMLAttributes<HTMLPreElement>) => (
			<CodeBlock {...props}>
				<Pre>{props.children}</Pre>
			</CodeBlock>
		),
		Card,
		Cards,
		a: Link as FC<AnchorHTMLAttributes<HTMLAnchorElement>>,
		img: Image,
		h1: (props: HTMLAttributes<HTMLHeadingElement>) => (
			<Heading as="h1" {...props} />
		),
		h2: (props: HTMLAttributes<HTMLHeadingElement>) => (
			<Heading as="h2" {...props} />
		),
		h3: (props: HTMLAttributes<HTMLHeadingElement>) => (
			<Heading as="h3" {...props} />
		),
		h4: (props: HTMLAttributes<HTMLHeadingElement>) => (
			<Heading as="h4" {...props} />
		),
		h5: (props: HTMLAttributes<HTMLHeadingElement>) => (
			<Heading as="h5" {...props} />
		),
		h6: (props: HTMLAttributes<HTMLHeadingElement>) => (
			<Heading as="h6" {...props} />
		),
		table: Table,
		Callout,
		Tabs,
		Tab,
		...components,
	};
}
