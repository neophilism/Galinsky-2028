import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('.',import.meta.url)),build:{outDir:'../../dist/portal',emptyOutDir:true,sourcemap:false},server:{host:'127.0.0.1',port:4323,proxy:{'/api':'http://127.0.0.1:4322'}}});
