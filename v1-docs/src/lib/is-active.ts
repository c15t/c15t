export function isActive(
	url: string,
	pathname: string,
	nested = true
): boolean {
	let urlPath = url;
	let pathnamePath = pathname;

	if (urlPath.endsWith('/')) {
		urlPath = urlPath.slice(0, -1);
	}
	if (pathnamePath.endsWith('/')) {
		pathnamePath = pathnamePath.slice(0, -1);
	}

	return (
		urlPath === pathnamePath ||
		(nested && pathnamePath.startsWith(`${urlPath}/`))
	);
}
