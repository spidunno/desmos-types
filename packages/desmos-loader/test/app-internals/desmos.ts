import { loadDesmos, Desmos, DESMOS_VERSION, type LoadDesmosOptions } from '@spidunno/desmos-loader/internals';

const options: LoadDesmosOptions = { url: '/vendor/calculator.js', evaluate: 'function' };
const api: typeof Desmos = await loadDesmos(options);
const version: string = DESMOS_VERSION;

// @ts-expect-error apiKey or url is required
loadDesmos({});

// @ts-expect-error not both
loadDesmos({ apiKey: 'k', url: '/x.js' });

export { Desmos };
