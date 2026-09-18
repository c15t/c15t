package com.c15t.core.tc

/**
 * A TC String this build cannot read.
 *
 * Both directions need a name of their own -- a device handing back another CMP's malformed
 * string is a storage event to absorb, while a caller asking for bytes this codec refuses to
 * write is a bug to fix -- and the caller has to tell them apart without reading a message.
 *
 * They extend [IllegalArgumentException] rather than [Exception] on purpose. This module's
 * convention is that a bad argument is an `IllegalArgumentException` (see
 * [com.c15t.core.store.RetiredWireFields] and [com.c15t.core.SubjectIdGenerator]), and a
 * TC string that reaches the kernel is an argument to it: a caller that already handles an
 * unusable stored value keeps handling it, and only code that cares which half of the codec
 * spoke has to import anything.
 */
class TcDecodingException(message: String) : IllegalArgumentException(message)

/**
 * Bytes this build declines to write, named by the field that blocks it.
 *
 * Raised by [TcStringEncoder] for the two core fields it deliberately does not encode, and for
 * any value that will not fit the width the format gives it. Silence is the alternative, and a
 * consent string that quietly drops a restriction is worse than one that was never written.
 */
class TcEncodingException(message: String) : IllegalArgumentException(message)
