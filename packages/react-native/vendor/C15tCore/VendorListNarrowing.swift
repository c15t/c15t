// A publisher's vendor scope, applied to a list that arrived whole.
//
// Two web functions do this job, and both are the oracle here: `narrowGVLToVendors` in
// `packages/iab/src/tcf/fetch-gvl.ts`, and `narrowToVendorIds` in
// `packages/backend/src/http/gvl.ts`. Both exist because the scope cannot always travel
// with the document. The GVL endpoint applies `vendorIds` as a filter, which is what keeps
// a scoped publisher off the full list, but the filter only travels so far: the backend
// caps what it will put in a request line at `MAX_GVL_QUERY_VENDOR_IDS` and fetches the
// list whole above that, `createIAB` in `packages/iab` asks the endpoint for its scope and
// prunes whatever comes back in case the endpoint ignored the parameter, and neither path
// lets an unpruned document reach the surface a subject reads. Serving every GVL vendor to a
// visitor who was only ever shown a publisher's own partners is a disclosure failure, not
// a cosmetic one, so the prune is the part that carries the promise and the filter is only
// the bytes-saving optimisation in front of it.
//
// This file narrows a decoded list rather than the served bytes, for the same reason the
// web narrows a parsed object: by the time the core has a vendor list it holds a
// ``GlobalVendorList``, and `StoredEnvelope` writes what that value contains. One prune on
// the value therefore reaches the snapshot, the bridge JSON, and the envelope built from
// both. A second prune on raw JSON would not be a safety net on top of that, it would be a
// second answer -- and `StoredEnvelope` refuses an envelope whose stored key paths do not
// come back out of the typed value, so raw bytes pruned out of step with the value they
// were read from is the one edit that turns a stored list into nothing stored.

extension GlobalVendorList {
    /// The list with ``vendors`` kept down to `vendorIds`, and every other field untouched.
    ///
    /// The scope is a publisher's declaration about which vendors this deployment may
    /// disclose, and a list that arrived carrying more than that has to be reduced before
    /// anything renders from it or encodes from it. Purposes, features, special features,
    /// stacks, data categories and the version fields all come back exactly as served:
    /// they describe the framework, not the publisher's partner list, and the dialog needs
    /// their names while ``TcVendorList`` needs the two versions. Pruning a purpose alongside
    /// a vendor is how a device ends up rendering a row nobody served and advertising a
    /// vendor-list version no one agreed to.
    ///
    /// Two rules hold the prune honest, both taken from the oracles:
    ///
    /// - A scope of `nil` or `[]` is no scope. Both web functions return the list
    ///   untouched in that case, so a deployment that declared no scope keeps a complete
    ///   list instead of coming back with an empty drawer that a subject has to be told is
    ///   not a refusal.
    /// - Entries are chosen by dictionary key, never by reading an `id` out of an entry
    ///   body. ``GlobalVendorList/read(from:)`` already keys a dense-array publication by
    ///   each entry's own `id`, so the key is the id the document was read as; letting a
    ///   body `id` take part would let an entry whose two disagree answer for a vendor the
    ///   publisher did not name.
    ///
    /// Nothing is ever added: a scope id with no entry in the served list simply does not
    /// appear in the result. That is the point of pruning a served document rather than
    /// rebuilding one from the scope, and it is why an out-of-range or publisher-custom id
    /// costs nothing here -- a vendor the framework never assigned has no entry to survive,
    /// and inventing one would put a name on a drawer that no GVL revision stands behind.
    ///
    /// - Parameter vendorIds: The declared scope. `nil` or empty keeps every vendor served.
    /// - Returns: A list whose `vendors` are the served entries inside `vendorIds`, keyed and
    ///   valued exactly as served, with every other field as served.
    func narrowed(toVendorIds vendorIds: [Int]?) -> GlobalVendorList {
        guard let vendorIds, !vendorIds.isEmpty else { return self }
        let allowed = Set(vendorIds)
        // Filtering the served map, in both directions: only keys the scope names survive,
        // and the values that survive are carried over whole rather than rebuilt.
        let keptVendors = vendors.filter { allowed.contains($0.key) }
        // Field by field because every field on this type is a `let`. An entry here is how
        // a field added to ``GlobalVendorList`` reaches a narrowed list; leaving one out
        // quietly hands the dialog a default instead of what the backend served.
        return GlobalVendorList(
            gvlSpecificationVersion: gvlSpecificationVersion,
            vendorListVersion: vendorListVersion,
            tcfPolicyVersion: tcfPolicyVersion,
            lastUpdated: lastUpdated,
            purposes: purposes,
            specialPurposes: specialPurposes,
            features: features,
            specialFeatures: specialFeatures,
            stacks: stacks,
            dataCategories: dataCategories,
            vendors: keptVendors
        )
    }
}
