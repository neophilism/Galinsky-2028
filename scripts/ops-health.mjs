#!/usr/bin/env node
// Read-only operator inspection: NEVER SELECT account emails, delivery payloads,
// token hashes, IP buckets, worksheets, donor records or protected submissions.
import {databasePool} from '../apps/api/src/postgres-store.mjs';
import {assessOperations} from '../packages/core/ops-health.mjs';
if(!process.env.DATABASE_URL){console.error('DATABASE_URL is required for read-only operations check');process.exit(2);}
const pool=databasePool(process.env.DATABASE_URL);
try{
 const [versions,accounts,materials,jobs]=await Promise.all([
   pool.query('SELECT version FROM g28.schema_migrations ORDER BY version'),
   pool.query('SELECT count(*)::integer AS value FROM g28.accounts'),
   pool.query("SELECT count(*)::integer AS value FROM g28.materials WHERE status='published' AND audience='volunteer'"),
   pool.query(`SELECT count(*) FILTER(WHERE status='queued')::integer AS queued,
                      count(*) FILTER(WHERE status='leased')::integer AS leased,
                      count(*) FILTER(WHERE status='dead')::integer AS dead,
                      COALESCE(GREATEST(0,EXTRACT(EPOCH FROM now()-min(created_at) FILTER(WHERE status='queued'))),0)::integer AS oldest_queued
               FROM g28.outbox`)
 ]);
 const o=jobs.rows[0];
 const report=assessOperations({versions:versions.rows.map(r=>r.version),accounts:accounts.rows[0].value,materials:materials.rows[0].value,queued:o.queued,leased:o.leased,dead:o.dead,oldestQueuedSeconds:o.oldest_queued});
 console.log(JSON.stringify(report,null,2));
 if(!report.healthy)process.exitCode=1;
}catch(e){console.error('Operator check failed; schema or connection may be unavailable.');process.exitCode=1;}
finally{await pool.end();}
