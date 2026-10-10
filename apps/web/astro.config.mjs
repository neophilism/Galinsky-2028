import { defineConfig } from 'astro/config';
import {fileURLToPath} from 'node:url';
process.env.G28_SOURCE_ROOT=fileURLToPath(new URL('../../',import.meta.url));
export default defineConfig({output:'static', outDir:'../../dist/web', build:{format:'directory'}, trailingSlash:'always'});
