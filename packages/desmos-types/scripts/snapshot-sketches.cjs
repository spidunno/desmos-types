#!/usr/bin/env node
/**
 * Writes `test/fixtures/graph-sketches.ts`: real graph sketches from a
 * Desmos bundle, as object literals typed with the internals' sketch types.
 *
 *   node scripts/snapshot-sketches.cjs path/to/calculator.js
 *
 * A corpus of expressions covering every 2D branch mode is rendered in a
 * graphing calculator (plus complex mode and the geometry tool). Because each
 * branch is an object literal in a discriminated union, `npm test` then
 * checks every field name, value type and tuple length against the
 * hand-written types; a branch shape the types don't describe is a compile
 * error.
 *
 * Long coordinate arrays are trimmed; fixed-length tuples are kept whole.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { loadDesmos } = require('./lib/jsdom-desmos.cjs');

const bundlePath = process.argv[2];
if (!bundlePath) {
  console.error('Usage: node scripts/snapshot-sketches.cjs path/to/calculator.js');
  process.exit(1);
}
const OUT_FILE = path.join(__dirname, '..', 'test', 'fixtures', 'graph-sketches.ts');

const w = loadDesmos(fs.readFileSync(bundlePath, 'utf8'));
const D = w.Desmos;

// ---------------------------------------------------------------------------
// Corpus
// ---------------------------------------------------------------------------

const IMAGE =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const E = (id, latex, extra = {}) => ({ type: 'expression', id, latex, ...extra });
const op = (name) => String.raw`\operatorname{${name}}`;

/** Graphing calculator: every non-geometry 2D mode, plus shape variations. */
const GRAPHING = [
  E('a', 'a=2', { sliderBounds: { min: 0, max: 5 } }),
  E('b', 'b=1'),
  E('L', 'L=[1,2,2,3,3,3,4,5]'),
  // X / Y functions
  E('fy', 'y=x^2'),
  E('fx', 'x=y^2'),
  E('frestrict', String.raw`y=\sin(x)\left\{x>0\right\}`),
  E('flist', 'y=[1,2,3]x'),
  E('fdash', 'y=x+1', { lineStyle: 'DASHED', lineWidth: 5, lineOpacity: 0.5 }),
  E('fwidths', 'y=[1,2]x+3', { lineWidth: '[1,5]' }),
  E('fpiece', String.raw`y=\left\{x<0:-x,x\right\}`),
  E('def', 'f(x)=x^3'),
  E('usef', 'y=f(x)-2'),
  // inequalities
  E('ineqy', 'y>x^2-3'),
  E('ineqyle', String.raw`y\le-x^2+3`),
  E('ineqx', String.raw`x<\sin(y)`),
  E('between', '-1<y<1'),
  E('ineqpolar', String.raw`r<2+\cos(\theta)`),
  E('ineqimplicit', 'x^2+y^2<4'),
  // parametric, polar, implicit
  E('param', String.raw`(\cos t,\sin t)`, { parametricDomain: { min: '0', max: String.raw`2\pi` } }),
  E('paramfill', String.raw`(2\cos t,\sin t)`, { fill: true, parametricDomain: { min: '0', max: String.raw`2\pi` } }),
  E('polar', String.raw`r=1+\cos(\theta)`),
  E('implicit', 'x^2+y^2=9'),
  E('implicit2', 'x^3+y^3=3xy'),
  // points
  E('pt', '(1,2)'),
  E('ptlabel', '(2,3)', { label: 'Hello', showLabel: true, labelOrientation: 'above', pointStyle: 'CROSS' }),
  E('ptlatexlabel', '(3,1)', { label: '`a=${a}`', showLabel: true }),
  E('ptlist', '[(1,1),(2,4),(3,9)]', { lines: true, points: true }),
  E('ptlistlines', '[(0,0),(1,1),(2,0)]', { lines: true, points: false }),
  E('ptstyles', '[(1,1),(2,2),(3,3)]', { pointSize: '[5,10,15]', pointOpacity: '[0.2,0.5,1]' }),
  E('ptmov', '(a,b)'),
  E('ptmovx', '(a,1)', { dragMode: 'X' }),
  E('ptnan', '[(1,1),(0/0,2),(3,3)]'),
  E('textlabel', '(4,4)', { label: 'Only label', showLabel: true, pointOpacity: '0' }),
  // polygons and statistics
  E('poly', `${op('polygon')}((0,0),(2,0),(0,2))`),
  E('polylist', `${op('polygon')}([(0,0),(1,0),(1,1)],[(3,3),(4,3),(4,4)])`),
  E('hist', `${op('histogram')}(L)`),
  E('dot', `${op('dotplot')}(L)`),
  E('box', `${op('boxplot')}(L)`),
  E('dist', `N=${op('normaldist')}(0,1)`),
  E('discrete', `B=${op('binomialdist')}(10,0.5)`),
  // tables and regressions
  {
    type: 'table',
    id: 'tbl',
    columns: [
      { latex: 'x_1', values: ['1', '2', '3', '4'] },
      { latex: 'y_1', values: ['2', '4', '5', '8'], lines: true },
      { latex: 'y_2', values: ['1', '1', '2', '2'], dragMode: 'XY' },
    ],
  },
  E('reg', String.raw`y_1\sim mx_1+k`),
];

/** Complex mode: complex-number points. */
const COMPLEX = [E('ca', 'a=1'), E('z', '1+2i'), E('zmov', 'a+i'), E('zlist', '[i,2i,1+i]')];

/** Geometry tool: the geometry object modes. */
const GEOMETRY = [
  E('gA', 'A=(0,0)'),
  E('gB', 'B=(3,0)'),
  E('gC', 'C=(0,3)'),
  E('gD', 'D=(-3,-2)'),
  E('gpoly', `${op('polygon')}(A,B,C)`),
  E('gseg', `${op('segment')}(A,B)`),
  E('gseglist', `${op('segment')}([A,B],[C,D])`),
  E('gline', `${op('line')}(B,C)`),
  E('gray', `${op('ray')}(A,D)`),
  E('gcircle', `${op('circle')}(A,2)`),
  E('garc', `${op('arc')}(B,A,C)`),
  E('gvec', `${op('vector')}(A,C)`),
  E('gangle', `${op('angle')}(B,A,C)`),
  E('gdirangle', `${op('directedangle')}(C,A,B)`),
  E('gperp', `${op('perpendicular')}(${op('line')}(A,B),C)`),
  E('glabel', 'B', { label: 'Point B', showLabel: true }),
];

function mount() {
  const el = w.document.createElement('div');
  w.document.body.appendChild(el);
  return el;
}

const graphing = D.GraphingCalculator(mount());
graphing.setExpressions(GRAPHING);

// `setExpression` doesn't accept images, so load them through a state.
const images = D.GraphingCalculator(mount());
images.setState({
  version: 11,
  graph: { viewport: { xmin: -10, xmax: 10, ymin: -10, ymax: 10 } },
  expressions: { list: [{ type: 'image', id: 'img', image_url: IMAGE, name: 'img', width: '2', height: '2', center: '(-5,-5)' }] },
});

const complex = D.GraphingCalculator(mount(), { allowComplex: true });
complex.setState({ version: 11, graph: { viewport: { xmin: -10, xmax: 10, ymin: -10, ymax: 10 }, complex: true }, expressions: { list: COMPLEX } });

const geometry = D.Geometry(mount());
geometry.setExpressions(GEOMETRY);

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

const MAX_FLAT = 6;
const MAX_POINTS = 3;

/** Trim long coordinate arrays; keep short (tuple) arrays whole. */
function trimSegments(mode, segments) {
  return segments.slice(0, 2).map((segment) => {
    if (segment.length > 0 && Array.isArray(segment[0])) return segment.slice(0, MAX_POINTS);
    return segment.length > 6 ? segment.slice(0, MAX_FLAT) : segment;
  });
}

function trimPOI(poi) {
  const out = {};
  for (const [k, v] of Object.entries(poi || {})) out[k] = { x: v.x.slice(0, 3), y: v.y.slice(0, 3) };
  return out;
}

function serializeBranch(branch) {
  const out = {};
  for (const [k, v] of Object.entries(branch)) {
    if (v === undefined) continue;
    if (k === 'segments') out[k] = trimSegments(branch.branchMode, v);
    else if (k === 'poi') out[k] = trimPOI(v);
    else if (k === 'compiled') {
      const { fn, ...rest } = v;
      out[k] = rest;
    } else out[k] = v;
  }
  return out;
}

function serializeSketch(sketch) {
  return {
    id: sketch.id,
    is3d: sketch.is3d,
    color: sketch.color,
    style: sketch.style,
    showPOI: sketch.showPOI,
    showHighlight: sketch.showHighlight,
    hoistToTop: sketch.hoistToTop,
    selected: sketch.selected,
    tokenHovered: sketch.tokenHovered,
    tokenSelected: sketch.tokenSelected,
    // Labels reference POIs (which reference the sketch); keep the rest.
    labels: sketch.labels.map(({ poi, ...rest }) => rest),
    branches: sketch.branches.map(serializeBranch),
  };
}

/** JSON, except non-finite numbers are written as `NaN` / `Infinity` rather than `null`. */
const literal = (value) =>
  JSON.stringify(value, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? `__NUM__${v}` : v), 2)
    .replace(/"__NUM__(NaN|-?Infinity)"/g, '$1')
    .replace(/^/gm, '  ')
    .trimStart();

setTimeout(() => {
  const sketches = {};
  for (const [name, calc] of [['graphing', graphing], ['images', images], ['complex', complex], ['geometry', geometry]]) {
    for (const [id, sketch] of Object.entries(calc.controller.grapher2d.graphSketches)) sketches[`${name}:${id}`] = serializeSketch(sketch);
  }
  const modes = new Set(Object.values(sketches).flatMap((s) => s.branches.map((b) => b.branchMode)));

  const text = [
    '// AUTO-GENERATED by scripts/snapshot-sketches.cjs. Do not edit by hand.',
    `// Source: Desmos ${D.version} (commit ${D.commit}).`,
    `// Branch modes covered: ${[...modes].sort((a, b) => a - b).join(', ')}.`,
    '//',
    '// Real graph sketches, typed with the internals sketch types. If a branch',
    "// doesn't match its mode's interface, this file fails to compile.",
    '',
    'export {};',
    '',
    'type SketchSnapshot = Omit<',
    '  Desmos.Internals.GraphSketch,',
    "  'branches' | 'labels' | '__cachedPOI' | '__cachedPOIIds' | `get${string}` | 'updateIntersections' | 'updateFrom' | '_pushPOI'",
    '> & {',
    "  labels: Array<DistributiveOmit<Desmos.Internals.SketchLabel, 'poi'>>;",
    '  branches: Desmos.Internals.GraphBranch[];',
    '};',
    'type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;',
    '',
    `export const sketches: Record<string, SketchSnapshot> = ${literal(sketches)};`,
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, text);
  console.log(`Wrote ${Object.keys(sketches).length} sketches covering branch modes ${[...modes].sort((a, b) => a - b).join(', ')} to ${path.relative(process.cwd(), OUT_FILE)}`);
  process.exit(0);
}, 4000);
