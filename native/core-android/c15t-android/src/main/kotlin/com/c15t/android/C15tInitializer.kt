package com.c15t.android

import android.content.Context
import androidx.startup.Initializer

/**
 * Starts c15t before the first Activity exists.
 *
 * The core's own [com.c15t.core.C15tKernel.bootstrap] is idempotent and does its
 * network work on a worker thread, so this adds nothing measurable to launch time
 * while guaranteeing that an ad SDK initialised during `Application.onCreate`
 * already gets a real answer from [com.c15t.core.C15t.isAllowed].
 *
 * A host that configures c15t itself can drop this with
 * `tools:node="remove"` on the provider entry in its manifest.
 */
class C15tInitializer : Initializer<Unit> {
	override fun create(context: Context) {
		C15tAndroid.bootstrap(context)
	}

	override fun dependencies(): List<Class<out Initializer<*>>> = emptyList()
}
