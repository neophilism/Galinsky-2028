const REQUIRED=['001_foundation','002_self_reported_task_progress','003_material_reading','004_fundraising_reconciliation'];
export function assessOperations({versions=[],queued=0,leased=0,dead=0,oldestQueuedSeconds=0,accounts=0,materials=0}={}){
 if(!Array.isArray(versions)||![queued,leased,dead,oldestQueuedSeconds,accounts,materials].every(x=>Number.isSafeInteger(x)&&x>=0))throw new Error('Invalid operational counts');
 const missing=REQUIRED.filter(x=>!versions.includes(x));
 const warnings=[];
 if(missing.length)warnings.push('missing_migrations');
 if(dead>0)warnings.push('failed_delivery_jobs');
 if(queued>0&&oldestQueuedSeconds>900)warnings.push('mail_backlog_over_15_minutes');
 return {schemaReady:missing.length===0,healthy:warnings.length===0,warnings,missingMigrations:missing,metrics:{accounts,approvedMaterials:materials,queuedJobs:queued,leasedJobs:leased,deadJobs:dead,oldestQueuedSeconds},notice:'Aggregated technical counts only; this is not legal, privacy, financial or E2EE certification.'};
}
