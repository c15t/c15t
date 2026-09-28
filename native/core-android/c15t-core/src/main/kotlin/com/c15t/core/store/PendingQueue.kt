package com.c15t.core.store

import com.c15t.core.model.QueuedSave
import kotlinx.serialization.Serializable

/** Wire envelope for the persisted queue, so the top level stays an object. */
@Serializable
internal data class PendingQueue(val entries: List<QueuedSave> = emptyList())
