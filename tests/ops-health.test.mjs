import test from 'node:test';import assert from 'node:assert/strict';
import {assessOperations} from '../packages/core/ops-health.mjs';
const versions=['001_foundation','002_self_reported_task_progress','003_material_reading','004_fundraising_reconciliation'];
test('no donor, account or mail personally identifying information in ops report',()=>{
 const r=assessOperations({versions,accounts:12,materials:4,queued:1,oldestQueuedSeconds:5});
 assert.equal(r.healthy,true);assert.equal(r.schemaReady,true);
 assert.deepEqual(Object.keys(r.metrics).sort(),['accounts','approvedMaterials','deadJobs','leasedJobs','oldestQueuedSeconds','queuedJobs'].sort());
 assert.ok(!JSON.stringify(r).includes('email'));
});
test('detect missing migrations, dead jobs and stale queue separately',()=>{
 const r=assessOperations({versions:['001_foundation'],queued:2,dead:1,oldestQueuedSeconds:1001});
 assert.equal(r.schemaReady,false);assert.equal(r.healthy,false);
 assert.deepEqual(r.warnings,['missing_migrations','failed_delivery_jobs','mail_backlog_over_15_minutes']);
 assert.equal(r.missingMigrations.length,3);
});
test('reject malformed counts rather than publishing misleading healthy result',()=>{
 for(const queued of [NaN,-1,1.2,Infinity])assert.throws(()=>assessOperations({versions,queued}));
});
