module.exports = function rawMarkdownLoader(source) {
	return `export default ${JSON.stringify(source)};`;
};
