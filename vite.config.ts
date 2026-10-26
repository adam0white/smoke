import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// Preview must exercise the same eval-free policy as the deployed static site.
const csp = /Content-Security-Policy: (.+)/.exec(readFileSync('public/_headers', 'utf8'))?.[1];
if (!csp) throw new Error('Missing release Content Security Policy.');
export default defineConfig({ preview: { headers: { 'Content-Security-Policy': csp } } });
