// Metro autolinking for @c15t/react-native.
//
// The TurboModule bindings live in the `C15tReactNative` iOS target and the
// `com.c15t.reactnative` Android module, both shipped inside this package.
// The pure consent cores (`native/core-swift`, `native/core-android` in the
// monorepo) are dependencies of those targets, never autolinked directly.
module.exports = {
	dependencies: {
		'@c15t/react-native': {
			android: {
				sourceDir: './android',
			},
			ios: {
				projects: ['./ios/C15tReactNative.xcodeproj'],
			},
		},
	},
};
