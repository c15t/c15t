"use strict";
exports.id = 931;
exports.ids = [931];
exports.modules = {

/***/ 931:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   baseDir: () => (/* binding */ baseDir),
/* harmony export */   currentDir: () => (/* binding */ currentDir),
/* harmony export */   failOnIncrease: () => (/* binding */ failOnIncrease),
/* harmony export */   githubToken: () => (/* binding */ githubToken),
/* harmony export */   header: () => (/* binding */ header),
/* harmony export */   packagesDir: () => (/* binding */ packagesDir),
/* harmony export */   prNumber: () => (/* binding */ prNumber),
/* harmony export */   repo: () => (/* binding */ repo),
/* harmony export */   skipComment: () => (/* binding */ skipComment),
/* harmony export */   threshold: () => (/* binding */ threshold),
/* harmony export */   transitiveRoots: () => (/* binding */ transitiveRoots)
/* harmony export */ });
/* harmony import */ var _actions_core__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(8109);
/* harmony import */ var _actions_github__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(5861);
/**
 * @packageDocumentation
 * Configuration and input resolution for the bundle analysis GitHub Action.
 */


/**
 * Directory containing base branch rsdoctor data files
 */
const baseDir = _actions_core__WEBPACK_IMPORTED_MODULE_0__.getInput('base_dir', { required: false }) || '.bundle-base';
/**
 * Directory containing current branch rsdoctor data files
 */
const currentDir = _actions_core__WEBPACK_IMPORTED_MODULE_0__.getInput('current_dir', { required: false }) || '.';
/**
 * GitHub token for API requests
 */
const githubToken = _actions_core__WEBPACK_IMPORTED_MODULE_0__.getInput('github_token', { required: true });
/**
 * Header identifier for sticky comments
 */
const header = _actions_core__WEBPACK_IMPORTED_MODULE_0__.getInput('header', { required: false }) || 'bundle-analysis';
/**
 * Pull request number (auto-detected if not provided)
 */
const inputPrNumber = _actions_core__WEBPACK_IMPORTED_MODULE_0__.getInput('pr_number', { required: false });
const prNumber = _actions_github__WEBPACK_IMPORTED_MODULE_1__/* .context */ ._?.payload?.pull_request?.number ??
    (inputPrNumber ? Number(inputPrNumber) : undefined);
/**
 * Whether to skip posting a comment
 */
const skipComment = _actions_core__WEBPACK_IMPORTED_MODULE_0__.getBooleanInput('skip_comment', {
    required: false,
});
/**
 * Whether to fail the action on significant bundle increases
 */
const failOnIncrease = _actions_core__WEBPACK_IMPORTED_MODULE_0__.getBooleanInput('fail_on_increase', {
    required: false,
});
/**
 * Directory containing packages to analyze
 */
const packagesDir = _actions_core__WEBPACK_IMPORTED_MODULE_0__.getInput('packages_dir', { required: false }) || 'packages';
/**
 * Percentage threshold for significant bundle size increase
 */
const thresholdInput = _actions_core__WEBPACK_IMPORTED_MODULE_0__.getInput('threshold', { required: false }) || '10';
const parsedThreshold = Number.parseFloat(thresholdInput);
const threshold = Number.isNaN(parsedThreshold) || parsedThreshold < 0 ? 10 : parsedThreshold;
/**
 * Root packages used to compute effective transitive impact.
 */
const transitiveRoots = (_actions_core__WEBPACK_IMPORTED_MODULE_0__.getInput('transitive_roots', { required: false }) || 'c15t,@c15t/react')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
/**
 * Repository descriptor where the action will run
 */
const repo = {
    owner: _actions_github__WEBPACK_IMPORTED_MODULE_1__/* .context */ ._.repo.owner,
    repo: _actions_github__WEBPACK_IMPORTED_MODULE_1__/* .context */ ._.repo.repo,
};


/***/ })

};
;