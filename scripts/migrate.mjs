import {readFile,readdir} from 'node:fs/promises';
import {databasePool} from '../apps/api/src/postgres-store.mjs';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required; no fallback database is used.');
const pool=databasePool(process.env.DATABASE_URL);const c=await pool.connect();
try{await c.query('SELECT pg_advisory_lock(282028)');for(const f of (await readdir('db/migrations')).filter(f=>f.endsWith('.sql')).sort()){
 await c.query('BEGIN');try{await c.query(await readFile('db/migrations/'+f,'utf8'));await c.query('COMMIT');console.log('Applied migration '+f);}catch(e){await c.query('ROLLBACK');throw e;}
}}finally{await c.query('SELECT pg_advisory_unlock(282028)');c.release();await pool.end();}
