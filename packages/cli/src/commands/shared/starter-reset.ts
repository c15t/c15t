import { atRule, parse } from 'postcss';
import type { Root, Rule } from 'postcss';

const isStarterReset = (rule: Rule): boolean => {
	if (rule.selector.trim() !== '*') {
		return false;
	}
	const declarations = rule.nodes.filter((node) => node.type !== 'comment');
	return (
		declarations.some(
			(node) => node.type === 'decl' && node.prop === 'padding'
		) &&
		declarations.some(
			(node) => node.type === 'decl' && node.prop === 'margin'
		) &&
		declarations.every((node) => {
			if (node.type !== 'decl' || node.important) {
				return false;
			}
			if (node.prop === 'box-sizing') {
				return node.value === 'border-box';
			}
			return (
				(node.prop === 'padding' || node.prop === 'margin') &&
				/^0(?:px)?$/u.test(node.value)
			);
		})
	);
};

/** Put the stock universal spacing reset below c15t's component layer. */
export const layerStarterReset = (content: string): string => {
	let root: Root;
	try {
		root = parse(content);
	} catch {
		// Skip content we cannot safely rewrite. Parser errors include source text,
		// which may come from a sensitive file reached through a stylesheet alias.
		return content;
	}
	const newline = content.includes('\r\n') ? '\r\n' : '\n';
	for (const node of [...root.nodes]) {
		if (node.type !== 'rule' || !isStarterReset(node)) {
			continue;
		}
		const layer = atRule({ name: 'layer', params: 'base' });
		layer.raws.before = node.raws.before;
		layer.raws.after = newline;
		node.replaceWith(layer);
		layer.append(node);
		node.raws.before = `${newline}\t`;
		node.raws.after = node.raws.after?.replaceAll('\n', '\n\t');
		node.walk((child) => {
			child.raws.before = child.raws.before?.replaceAll('\n', '\n\t');
		});
	}
	return root.toString();
};
