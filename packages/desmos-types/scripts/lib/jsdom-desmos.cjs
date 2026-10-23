/**
 * Load a Desmos `calculator.js` bundle into jsdom, with stubs for the browser
 * APIs it expects. Shared by the scripts in this folder.
 *
 * The bundle is third-party code executed inside jsdom; only use bundles
 * downloaded from desmos.com.
 */
'use strict';

const { JSDOM } = require('jsdom');

/** Fake layout size given to every element (jsdom has no layout engine). */
const WIDTH = 1000;
const HEIGHT = 700;

function rect() {
  return { x: 0, y: 0, top: 0, left: 0, right: WIDTH, bottom: HEIGHT, width: WIDTH, height: HEIGHT, toJSON() {} };
}

/**
 * Evaluate `source` (the bundle's text) in a fresh jsdom window and return
 * the window. `window.Desmos` is the API.
 */
function loadDesmos(source) {
  const dom = new JSDOM('<!doctype html><div id="calc" style="width:800px;height:600px"></div>', {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const w = dom.window;
  // APIs the bundle expects that jsdom doesn't provide.
  w.structuredClone = structuredClone;
  w.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  w.matchMedia = () => ({
    matches: false,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  });
  w.HTMLCanvasElement.prototype.getContext = function () {
    const canvas = this;
    return new Proxy(
      {},
      {
        get: (_t, k) =>
          k === 'canvas'
            ? canvas
            : k === 'measureText'
              ? () => ({ width: 1 })
              : k === 'getImageData' || k === 'createImageData'
                ? () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })
                : typeof k === 'string'
                  ? () => {}
                  : undefined,
        set: () => true,
      }
    );
  };
  // jsdom has no layout. Give every element a size so the expressions list
  // believes it is visible and renders its item views.
  for (const [prop, value] of [
    ['offsetWidth', WIDTH],
    ['offsetHeight', HEIGHT],
    ['clientWidth', WIDTH],
    ['clientHeight', HEIGHT],
    ['scrollWidth', WIDTH],
    ['scrollHeight', HEIGHT],
  ]) {
    Object.defineProperty(w.HTMLElement.prototype, prop, { configurable: true, get: () => value });
  }
  w.Element.prototype.getBoundingClientRect = rect;
  w.Range.prototype.getBoundingClientRect = rect;
  w.Range.prototype.getClientRects = () => [rect()];
  w.console.warn = () => {};
  w.console.error = () => {};
  w.eval(source);
  return w;
}

module.exports = { loadDesmos };
