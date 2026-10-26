// The recommended setup: load once, re-export `Desmos`.
import { loadDesmos, Desmos } from '@spidunno/desmos-loader';

await loadDesmos({ apiKey: 'YOUR_API_KEY' });

export { Desmos };
