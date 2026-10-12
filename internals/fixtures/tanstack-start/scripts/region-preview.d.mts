export declare const regionPreviewHeaders: (
	url: string,
	referer: string | null | undefined
) => Record<string, string>;

export declare const withRegionPreview: (request: Request) => Request;
