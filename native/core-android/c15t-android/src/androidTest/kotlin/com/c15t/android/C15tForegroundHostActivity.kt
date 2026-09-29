package com.c15t.android

import android.app.Activity

/**
 * A window, so the instrumented process has a foreground to arrive in and leave.
 *
 * `ProcessLifecycleOwner` derives the process state from the activities inside it, and a
 * library's instrumented process owns none. This activity draws nothing and holds nothing:
 * its only job is to let a test move the process between the foreground and the background
 * so the observer [C15tAndroid.install] registered fires.
 */
class C15tForegroundHostActivity : Activity()
