plugins {
	// AGP 9 compiles Kotlin itself, so there is no separate Kotlin Android plugin to
	// apply here; adding it collides with the `kotlin` extension AGP registers.
	alias(libs.plugins.android.library)
}

android {
	namespace = "com.c15t.android"
	compileSdk = libs.versions.compileSdk.get().toInt()

	defaultConfig {
		minSdk = libs.versions.minSdk.get().toInt()
		consumerProguardFiles("consumer-rules.pro")
	}

	buildTypes {
		release {
			isMinifyEnabled = false
		}
	}

	compileOptions {
		sourceCompatibility = JavaVersion.VERSION_17
		targetCompatibility = JavaVersion.VERSION_17
	}

	kotlin {
		compilerOptions {
			jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
		}
	}

	buildFeatures {
		buildConfig = false
	}

	lint {
		warningsAsErrors = true

		// Every coordinate in gradle/libs.versions.toml is pinned on purpose, so the
		// "a newer version exists" nag is noise here, not a finding.
		disable += setOf(
			"GradleDependency",
			"AndroidGradlePluginVersion",
		)
	}

	testOptions {
		unitTests {
			// The unit tests here cover the module's Android-free helpers only;
			// the consent logic itself is tested in :c15t-core on a plain JVM.
			isReturnDefaultValues = true
		}
	}
}

dependencies {
	api(project(":c15t-core"))

	implementation(libs.androidx.startup)
	implementation(libs.androidx.lifecycle.process)
	compileOnly(libs.androidx.annotation)

	// JUnit directly: AGP's built-in Kotlin does not register a test framework, so
	// the plain kotlin-test artifact would carry the assertions but not @Test.
	testImplementation(libs.junit)
}
