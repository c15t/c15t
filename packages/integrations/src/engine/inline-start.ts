/**
 * Manifest steps as inline JavaScript, for a server render that starts a
 * granted vendor from the HTML before hydration.
 *
 * The runner is a string, not a function, so a minifier or a coverage
 * tool can't rename what it calls. It runs the step types the snippet
 * vendors use, with the semantics of `executeStep` in `runtime.ts`; a step
 * it doesn't run makes the whole vendor fall back to the script loader.
 *
 * @internal
 */
import type { ScriptServerStart } from '@c15t/core';

import { RUNTIME_VALUE_KIND } from '../types';
import type { ManifestStep } from '../types';

/** JSON safe inside a `<script>` element. */
const inlineJSON = function inlineJSON(value: unknown): string {
	return JSON.stringify(value)
		.replace(/</gu, '\\u003c')
		.replace(/\u2028/gu, '\\u2028')
		.replace(/\u2029/gu, '\\u2029');
};

/** The global name of the shared runner the prelude defines. */
const RUNNER = '__c15tRunSteps';

/**
 * `executeStep` for every step type except constructGlobal, which only runs
 * after a vendor's script loads. Keep it in step with `runtime.ts`.
 */
const RUNNER_SOURCE = `function(steps){var w=window,K=${inlineJSON(RUNTIME_VALUE_KIND)};
function c(v){if(v&&typeof v==='object'){if(!Array.isArray(v)&&v.kind===K&&(v.value==='date'||v.value==='timestamp'))return v.value==='date'?new Date():Date.now();if(Array.isArray(v))return v.map(c);var o={};for(var k in v)o[k]=c(v[k]);return o}return v}
function q(queue,owner){var t='global' in queue&&typeof queue.global==='string'?w[queue.global]:owner?owner[queue.property]:undefined;return Array.isArray(t)?t:undefined}
for(var i=0;i<steps.length;i++){var s=steps[i];(function(s){switch(s.type){
case 'setGlobal':if(s.ifUndefined!==false&&w[s.name]!==undefined)return;if(s.keepExistingQueue&&Array.isArray(w[s.name]))return;w[s.name]=c(s.value);return;
case 'defineQueueFunction':if(s.ifUndefined!==false&&w[s.name]!==undefined)return;w[s.name]=function(){var t=w[s.queue];if(!Array.isArray(t))return;t.push(s.pushStyle==='array'?Array.prototype.slice.call(arguments):arguments)};return;
case 'defineStubFunction':if(s.ifUndefined!==false&&w[s.name]!==undefined)return;var f=function(){var self=w[s.name],d=self&&s.dispatchProperty?self[s.dispatchProperty]:undefined,a=Array.prototype.slice.call(arguments);if(typeof d==='function'){d.apply(self,a);return}var t=q(s.queue,self);if(!t)return;t.push(s.queueFormat==='array'?a:arguments)};w[s.name]=f;
if('property' in s.queue&&typeof s.queue.property==='string'&&f[s.queue.property]===undefined)f[s.queue.property]=[];(s.aliases||[]).forEach(function(n){w[n]=f});(s.selfReferences||[]).forEach(function(n){f[n]=f});for(var p in s.properties||{})f[p]=c(s.properties[p]);return;
case 'callGlobal':var g=w[s.global];if(!g)return;var a=(s.args||[]).map(c);if(s.method){if(typeof g[s.method]==='function')g[s.method].apply(g,a)}else if(typeof g==='function')g.apply(undefined,a);return;
case 'pushToQueue':if(Array.isArray(w[s.queue]))w[s.queue].push(c(s.value));return;
case 'setGlobalPath':var r=s.path[0];if(s.ifGlobalIsQueue&&(!r||!Array.isArray(w[r])))return;if(s.path.length===0)return;var o=w;for(var j=0;j<s.path.length-1;j++){o=o[s.path[j]];if(o===null||typeof o!=='object')return}var k=s.path[s.path.length-1];if(s.ifUndefined&&o[k]!==undefined)return;o[k]=c(s.value);return;
case 'defineQueueMethods':var t=w[s.target];if(t===null||(typeof t!=='object'&&typeof t!=='function'))return;if(!s.queue&&!Array.isArray(t))return;var F=s.queueFormat;s.methods.forEach(function(m){if(s.preserveExisting&&typeof t[m]==='function')return;t[m]=function(){var u=q(s.queue||{global:s.target},t);if(!u)return;var a=Array.prototype.slice.call(arguments);if(F==='methodCall'||F==='wrappedMethodCall'||F==='voidMethodCall'){var p=new Promise(function(r){u.push({args:a,name:m,resolve:r})});return F==='wrappedMethodCall'?{promise:p}:F==='voidMethodCall'?undefined:p}if(F==='callback'){u.push({fn:function(){var l=w[s.target];if(l===null||(typeof l!=='object'&&typeof l!=='function'))return;if(typeof l[m]==='function')l[m].apply(l,a)},name:m});return}u.push(F==='nameAndArgs'?[m,a]:[m].concat(a));return s.returnTarget?t:undefined}});return;
case 'defineQueueClass':var t=w[s.target];if(t===null||(typeof t!=='object'&&typeof t!=='function'))return;var Q=s.queueProperty==null?'_q':s.queueProperty,C=function(){this[Q]=[]};s.methods.forEach(function(m){C.prototype[m]=function(){var u=this[Q];if(Array.isArray(u))u.push({args:Array.prototype.slice.call(arguments),name:m});return this}});t[s.name]=C;return;
case 'defineGlobalMethods':var t=w[s.target];if(t===null||(typeof t!=='object'&&typeof t!=='function'))return;if(s.ifGlobalIsQueue&&!Array.isArray(t))return;s.methods.forEach(function(m){t[m.name]=m.behavior==='return'?function(){return c(m.value)}:function(){}});return;
case 'setCookie':document.cookie=s.cookie;return;
case 'defineQueueProxy':if(w[s.name])return;w[s.queue]=w[s.queue]||[];w[s.name]=new Proxy({},{get:function(t,m){if(typeof m!=='string'||m==='then'||m==='toJSON'||m in t)return t[m];if(m==='push')return function(){var u=w[s.queue];if(u)return u.push.apply(u,arguments)};return function(){var a=Array.prototype.slice.call(arguments),b=typeof a[a.length-1]==='function'?a.pop():undefined;return new Promise(function(r){var u=w[s.queue];if(u)u.push([m].concat(a,[function(x){if(b)b(x);r(x)}]))})}}});return;
}})(s)}}`;

/** Whether the inline runner runs `step` exactly as `executeStep` would. */
const runsInline = function runsInline(step: ManifestStep): boolean {
	switch (step.type) {
		case 'setGlobal':
		case 'defineQueueFunction':
		case 'defineStubFunction':
		case 'callGlobal':
		case 'pushToQueue':
		case 'setGlobalPath':
		case 'defineQueueMethods':
		case 'defineQueueClass':
		case 'defineGlobalMethods':
		case 'setCookie':
		case 'defineQueueProxy':
		case 'loadScript': {
			return true;
		}
		default: {
			return false;
		}
	}
};

/**
 * Whether JSON carries `value` unchanged. `cloneStepValue` keeps
 * `undefined`, a `Date`, a function, a non-finite number, `-0`, an array
 * hole and a class instance; JSON drops or converts each of them. It also
 * keeps an own `__proto__` key, which the inline code, an object literal,
 * reads as the object's prototype.
 */
const survivesJSON = function survivesJSON(value: unknown): boolean {
	if (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'boolean'
	) {
		return true;
	}
	if (typeof value === 'number') {
		return Number.isFinite(value) && !Object.is(value, -0);
	}
	if (Array.isArray(value)) {
		// Spreading turns a hole into `undefined`, which fails.
		return [...value].every(survivesJSON);
	}
	if (typeof value !== 'object') {
		return false;
	}
	const prototype = Object.getPrototypeOf(value);
	return (
		(prototype === Object.prototype || prototype === null) &&
		!Object.hasOwn(value, '__proto__') &&
		Object.values(value).every(survivesJSON)
	);
};

/** The values a step passes to the page, which the runner gets as JSON. */
const stepValues = function stepValues(step: ManifestStep): unknown[] {
	switch (step.type) {
		case 'setGlobal':
		case 'pushToQueue':
		case 'setGlobalPath': {
			// JSON drops an `undefined` value, and the runner reads the
			// missing key as `undefined`, as Hightouch's `loadOptions` needs.
			return step.value === undefined ? [] : [step.value];
		}
		case 'callGlobal': {
			return step.args ?? [];
		}
		case 'defineStubFunction': {
			return Object.values(step.properties ?? {});
		}
		case 'defineGlobalMethods': {
			// As with `setGlobal`, the runner returns `undefined` for a
			// dropped `undefined` value.
			return step.methods.flatMap((method) =>
				method.behavior === 'return' && method.value !== undefined
					? [method.value]
					: []
			);
		}
		default: {
			return [];
		}
	}
};

/**
 * `steps` as inline code for `Script.serverStart`, or `undefined` when a
 * step has no inline form or passes a value JSON can't carry unchanged.
 *
 * @param steps - The steps `onBeforeLoad` would run, in order.
 * @returns The code and the shared runner it calls.
 * @internal
 */
export const inlineStepsStart = function inlineStepsStart(
	steps: ManifestStep[]
): ScriptServerStart | undefined {
	if (
		!steps.every(
			(step) => runsInline(step) && stepValues(step).every(survivesJSON)
		)
	) {
		return;
	}
	const run = steps.filter((step) => step.type !== 'loadScript');
	return {
		code: `window.${RUNNER}(${inlineJSON(run)})`,
		prelude: `window.${RUNNER}=window.${RUNNER}||${RUNNER_SOURCE}`,
	};
};
