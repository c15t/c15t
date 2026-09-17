plugins {
	alias(libs.plugins.kotlin.jvm)
	alias(libs.plugins.kotlin.serialization)
}

// Pure JVM on purpose: nothing in this module may import android.*, so the whole
// consent engine is testable without an emulator.
kotlin {
	jvmToolchain(17)
}

dependencies {
	api(libs.kotlinx.serialization.json)

	testImplementation(libs.junit)
	testImplementation(libs.kotlin.test)
}

// The benchmark lives in its own source set so it never ships in the library
// artifact and cannot be reached from a host app's classpath.
val benchSource = sourceSets.create("bench")

// The bench source set sees main's classes and its dependencies, so the
// benchmark drives exactly the code that ships.
configurations.named("benchImplementation") {
	extendsFrom(configurations.named("implementation").get())
}

dependencies {
	"benchImplementation"(sourceSets.main.get().output)
}

tasks.register<JavaExec>("bench") {
	group = "verification"
	description = "Measures hydrate, policy evaluation, snapshot(), and offline save."
	dependsOn("compileBenchKotlin")
	mainClass.set("com.c15t.core.bench.Bench")
	classpath = benchSource.output + configurations.named("benchRuntimeClasspath").get()
	// One collector keeps the numbers comparable between runs.
	jvmArgs = listOf("-XX:+UseSerialGC")
}
