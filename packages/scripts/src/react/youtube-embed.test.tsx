import type { ComponentType, ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { YouTubeEmbed } from './youtube-embed';

// Mock the c15t core library
vi.mock('c15t', async () => {
	const originalModule = await vi.importActual('c15t');

	return {
		...(originalModule as object),
		configureConsentManager: () => ({
			getCallbacks: () => ({}),
			setCallbacks: () => ({}),
			showConsentBanner: async () => ({
				ok: true,
				data: {
					showConsentBanner: false,
					jurisdiction: { code: 'GDPR' },
					translations: {
						language: 'en',
						translations: {},
					},
				},
				error: null,
				response: null,
			}),
			setConsent: async () => ({
				ok: true,
				data: { success: true },
				error: null,
				response: null,
			}),
			verifyConsent: async () => ({
				ok: true,
				data: { valid: true },
				error: null,
				response: null,
			}),
		}),
	};
});

// Dynamically import after mocks are set up
type ConsentProviderComponent = ComponentType<{
	options: { mode: string };
	children: ReactNode;
}>;

let ConsentManagerProvider: ConsentProviderComponent | undefined;

describe('YouTubeEmbed', () => {
	beforeEach(async () => {
		// Import the provider after mocks are established
		if (!ConsentManagerProvider) {
			const reactModule = await import('@c15t/react');
			ConsentManagerProvider =
				reactModule.ConsentManagerProvider as ConsentProviderComponent;
		}

		// Clear localStorage before each test
		window.localStorage.clear();
		vi.clearAllMocks();
	});

	const renderWithProvider = (children: ReactNode) => {
		if (!ConsentManagerProvider) {
			throw new Error(
				'ConsentManagerProvider must be initialized before rendering'
			);
		}

		// Mock localStorage with full consent granted
		window.localStorage.setItem(
			'privacy-consent-storage',
			JSON.stringify({
				consents: {
					necessary: true,
					experience: true,
					functionality: true,
					marketing: true,
					measurement: true,
				},
				consentInfo: {
					type: 'all',
					timestamp: Date.now(),
				},
			})
		);

		return render(
			<ConsentManagerProvider options={{ mode: 'offline' }}>
				{children}
			</ConsentManagerProvider>
		);
	};

	const waitForIframe = async (
		selector = 'iframe'
	): Promise<HTMLIFrameElement> => {
		let iframe: HTMLIFrameElement | null = null;
		await vi.waitFor(() => {
			iframe = document.querySelector(selector);
			expect(iframe).toBeInTheDocument();
		});
		return iframe as unknown as HTMLIFrameElement;
	};

	describe('Basic Rendering', () => {
		test('should render youtube iframe with correct video ID', async () => {
			renderWithProvider(<YouTubeEmbed videoId="dQw4w9WgXcQ" />);

			const iframe = await waitForIframe();
			expect(iframe).toHaveAttribute(
				'src',
				'https://www.youtube.com/embed/dQw4w9WgXcQ'
			);
		});

		test('should use default title when not provided', async () => {
			renderWithProvider(<YouTubeEmbed videoId="dQw4w9WgXcQ" />);

			const iframe = await waitForIframe();
			expect(iframe.title).toBe('YouTube video');
		});

		test('should use custom title when provided', async () => {
			renderWithProvider(
				<YouTubeEmbed
					videoId="dQw4w9WgXcQ"
					title="Rick Astley - Never Gonna Give You Up"
				/>
			);

			const iframe = await waitForIframe();
			expect(iframe.title).toBe('Rick Astley - Never Gonna Give You Up');
		});

		test('should apply default dimensions', async () => {
			renderWithProvider(<YouTubeEmbed videoId="dQw4w9WgXcQ" />);

			const iframe = await waitForIframe();
			const wrapper = iframe.parentElement as HTMLElement;
			expect(wrapper).toBeInTheDocument();
			expect(wrapper.style.width).toBe('100%');
			expect(wrapper.style.height).toBe('315px');
		});

		test('should apply custom dimensions', async () => {
			renderWithProvider(
				<YouTubeEmbed videoId="dQw4w9WgXcQ" width={640} height={480} />
			);

			const iframe = await waitForIframe();
			const wrapper = iframe.parentElement as HTMLElement;
			expect(wrapper.style.width).toBe('640px');
			expect(wrapper.style.height).toBe('480px');
		});
	});

	describe('URL Construction', () => {
		test('should construct embed URL without params', async () => {
			renderWithProvider(<YouTubeEmbed videoId="dQw4w9WgXcQ" />);

			const iframe = await waitForIframe();
			expect(iframe).toHaveAttribute(
				'src',
				'https://www.youtube.com/embed/dQw4w9WgXcQ'
			);
		});

		test('should append query params when provided', async () => {
			renderWithProvider(
				<YouTubeEmbed videoId="dQw4w9WgXcQ" params="autoplay=1&mute=1" />
			);

			const iframe = await waitForIframe();
			expect(iframe).toHaveAttribute(
				'src',
				'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1'
			);
		});

		test('should handle single query param', async () => {
			renderWithProvider(
				<YouTubeEmbed videoId="dQw4w9WgXcQ" params="autoplay=1" />
			);

			const iframe = await waitForIframe();
			expect(iframe).toHaveAttribute(
				'src',
				'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1'
			);
		});

		test('should not add question mark when params is empty string', async () => {
			renderWithProvider(<YouTubeEmbed videoId="dQw4w9WgXcQ" params="" />);

			const iframe = await waitForIframe();
			expect(iframe).toHaveAttribute(
				'src',
				'https://www.youtube.com/embed/dQw4w9WgXcQ'
			);
		});
	});

	describe('Consent Category', () => {
		test('should render iframe when measurement consent is granted', async () => {
			renderWithProvider(<YouTubeEmbed videoId="dQw4w9WgXcQ" />);

			const iframe = await waitForIframe();
			expect(iframe).toBeInTheDocument();
		});

		test('should render iframe when custom consent category is granted', async () => {
			renderWithProvider(
				<YouTubeEmbed videoId="dQw4w9WgXcQ" category="marketing" />
			);

			const iframe = await waitForIframe();
			expect(iframe).toBeInTheDocument();
		});

		test('should accept custom placeholder prop', async () => {
			renderWithProvider(
				<YouTubeEmbed
					videoId="dQw4w9WgXcQ"
					placeholder={
						<div data-testid="custom-placeholder">Custom Message</div>
					}
				/>
			);

			// Since we have consent, the iframe should render (not the placeholder)
			const iframe = await waitForIframe();
			expect(iframe).toBeInTheDocument();
		});

		test('should pass correct category prop to Frame', async () => {
			renderWithProvider(<YouTubeEmbed videoId="dQw4w9WgXcQ" />);

			// Verify the component renders successfully with default category
			const iframe = await waitForIframe();
			expect(iframe).toBeInTheDocument();
		});
	});

	describe('Styling', () => {
		test('should apply custom className to wrapper', async () => {
			renderWithProvider(
				<YouTubeEmbed videoId="dQw4w9WgXcQ" className="custom-class" />
			);

			const iframe = await waitForIframe();
			const wrapper = iframe.parentElement as HTMLElement;
			expect(wrapper.className).toContain('custom-class');
		});

		test('should apply custom styles to wrapper', async () => {
			renderWithProvider(
				<YouTubeEmbed
					videoId="dQw4w9WgXcQ"
					style={{ border: '2px solid red', borderRadius: '8px' }}
				/>
			);

			const iframe = await waitForIframe();
			const wrapper = iframe.parentElement as HTMLElement;
			expect(wrapper.style.border).toBe('2px solid red');
			expect(wrapper.style.borderRadius).toBe('8px');
		});

		test('should apply custom iframe className', async () => {
			renderWithProvider(
				<YouTubeEmbed
					videoId="dQw4w9WgXcQ"
					iframeClassName="custom-iframe-class"
				/>
			);

			const iframe = await waitForIframe();
			expect(iframe.className).toContain('custom-iframe-class');
		});

		test('should apply custom iframe styles', async () => {
			renderWithProvider(
				<YouTubeEmbed
					videoId="dQw4w9WgXcQ"
					iframeStyle={{ borderRadius: '12px', opacity: '0.9' }}
				/>
			);

			const iframe = await waitForIframe();
			expect(iframe.style.borderRadius).toBe('12px');
			expect(iframe.style.opacity).toBe('0.9');
		});

		test('should maintain default iframe styles', async () => {
			renderWithProvider(<YouTubeEmbed videoId="dQw4w9WgXcQ" />);

			const iframe = await waitForIframe();
			expect(iframe.style.width).toBe('100%');
			expect(iframe.style.height).toBe('100%');
			expect(iframe.style.border).toBe('0px');
		});
	});

	describe('Iframe Attributes', () => {
		test('should set correct allow attribute', async () => {
			renderWithProvider(<YouTubeEmbed videoId="dQw4w9WgXcQ" />);

			const iframe = await waitForIframe();
			expect(iframe.getAttribute('allow')).toBe(
				'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
			);
		});

		test('should set correct referrerPolicy', async () => {
			renderWithProvider(<YouTubeEmbed videoId="dQw4w9WgXcQ" />);

			const iframe = await waitForIframe();
			expect(iframe.getAttribute('referrerpolicy')).toBe(
				'strict-origin-when-cross-origin'
			);
		});

		test('should have allowFullScreen attribute', async () => {
			renderWithProvider(<YouTubeEmbed videoId="dQw4w9WgXcQ" />);

			const iframe = await waitForIframe();
			expect(iframe.allowFullscreen).toBe(true);
		});
	});

	describe('Ref Forwarding', () => {
		test('should forward ref to wrapper div', async () => {
			const ref = { current: null as HTMLDivElement | null };

			renderWithProvider(<YouTubeEmbed videoId="dQw4w9WgXcQ" ref={ref} />);

			await vi.waitFor(() => {
				expect(ref.current).toBeInstanceOf(HTMLDivElement);
				expect(ref.current?.tagName).toBe('DIV');
			});
		});
	});

	describe('Accessibility', () => {
		test('should have title attribute on iframe for screen readers', async () => {
			renderWithProvider(
				<YouTubeEmbed
					videoId="dQw4w9WgXcQ"
					title="Educational video about React"
				/>
			);

			const iframe = await waitForIframe();
			expect(iframe.title).toBe('Educational video about React');
		});

		test('should maintain semantic structure', async () => {
			renderWithProvider(<YouTubeEmbed videoId="dQw4w9WgXcQ" />);

			const iframe = await waitForIframe();
			const wrapper = iframe.parentElement as HTMLElement;
			expect(wrapper.tagName).toBe('DIV');
			expect(iframe).toBeInTheDocument();
		});
	});

	describe('Edge Cases', () => {
		test('should handle special characters in video ID', async () => {
			renderWithProvider(<YouTubeEmbed videoId="abc-123_XYZ" />);

			const iframe = await waitForIframe();
			expect(iframe.src).toContain('abc-123_XYZ');
		});

		test('should handle percentage width', async () => {
			renderWithProvider(<YouTubeEmbed videoId="dQw4w9WgXcQ" width="80%" />);

			const iframe = await waitForIframe();
			const wrapper = iframe.parentElement as HTMLElement;
			expect(wrapper.style.width).toBe('80%');
		});

		test('should handle numeric height', async () => {
			renderWithProvider(<YouTubeEmbed videoId="dQw4w9WgXcQ" height={720} />);

			const iframe = await waitForIframe();
			const wrapper = iframe.parentElement as HTMLElement;
			expect(wrapper.style.height).toBe('720px');
		});

		test('should merge iframe styles correctly', async () => {
			renderWithProvider(
				<YouTubeEmbed
					videoId="dQw4w9WgXcQ"
					iframeStyle={{ border: '1px solid blue', width: '90%' }}
				/>
			);

			const iframe = await waitForIframe();
			// Custom styles should override defaults
			expect(iframe.style.border).toBe('1px solid blue');
			expect(iframe.style.width).toBe('90%');
			// Other defaults should remain
			expect(iframe.style.height).toBe('100%');
		});
	});

	describe('Props Passing', () => {
		test('should pass data attributes to wrapper', async () => {
			renderWithProvider(
				<YouTubeEmbed
					videoId="dQw4w9WgXcQ"
					data-tracking-id="yt-embed-1"
					data-section="hero"
				/>
			);

			const iframe = await waitForIframe();
			const wrapper = iframe.parentElement as HTMLElement;
			expect(wrapper.getAttribute('data-tracking-id')).toBe('yt-embed-1');
			expect(wrapper.getAttribute('data-section')).toBe('hero');
		});

		test('should pass aria attributes to wrapper', async () => {
			renderWithProvider(
				<YouTubeEmbed
					videoId="dQw4w9WgXcQ"
					aria-label="Featured video"
					aria-describedby="video-description"
				/>
			);

			const iframe = await waitForIframe();
			const wrapper = iframe.parentElement as HTMLElement;
			expect(wrapper.getAttribute('aria-label')).toBe('Featured video');
			expect(wrapper.getAttribute('aria-describedby')).toBe(
				'video-description'
			);
		});
	});
});
