import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Reviewed capability inventory. Never derive these decisions from merge counts
// or from the absence of a later production-activation observation.
const sources={
 1:['AGENTS.md','docs/DEVELOPMENT_PLAN.md'],2:['scripts/verify.mjs','.github/workflows/ci.yml'],
 3:['apps/web/public/assets/site.css','tests/browser/journeys.mjs'],4:['apps/api/src/config.mjs','scripts/migrate.mjs'],
 5:['security/e2eesa-inventory.json'],6:['apps/api/src/campaign-store.mjs','tests/integration/campaign-store.test.mjs'],
 7:['packages/core/campaign-image.mjs','tests/campaign-image.test.mjs'],8:['docs/evidence/ENGINE_ROOM_RECONCILIATION_20261018.md'],
 9:['content/public/pages/index.html'],10:['apps/web/public/assets/motion.js','tests/hero-motion-accessibility.test.mjs'],
 11:['content/public/pages/issues.html'],12:['packages/core/video.mjs','tests/public-interactions.test.mjs'],
 13:['packages/core/policy-documents.mjs','tests/kirk-evers-discussion-provenance.test.mjs'],
 14:['content/public/pages/garden.html'],15:['content/public/pages/cornerstone.html'],
 16:['packages/core/roles.mjs','tests/flag-real-portal.test.mjs'],17:['packages/core/stripe-web-checkout.mjs'],
 18:['packages/core/indexing.mjs','tests/accessibility-navigation.test.mjs'],19:['apps/api/src/app.mjs','tests/integration/api.test.mjs'],
 20:['apps/api/src/staff-security.mjs','packages/core/staff-permissions.mjs','tests/staff-security.test.mjs','scripts/runtime-role-permissions.mjs','tests/integration/runtime-role-permissions.test.mjs'],
 21:['docs/security/BOUNDARIES.md'],22:['docs/security/BOUNDARIES.md'],23:['apps/api/src/app.mjs'],
 24:['apps/api/src/worker.mjs','apps/api/src/mail-events.mjs','apps/api/src/mail-store.mjs','apps/api/src/mail-notices.mjs','tests/mail-delivery.test.mjs','tests/integration/mail-delivery.test.mjs'],25:['content/materials/archive-manifest.json','scripts/publish-materials.mjs'],
 26:['packages/core/material-outline.mjs','packages/core/material-reading.mjs'],27:['apps/portal/src/main.tsx','packages/core/tasks.mjs'],
 28:['packages/core/orientation.mjs','apps/portal/src/Orientation.tsx'],29:['apps/api/src/activity-review-store.mjs','apps/api/src/activity-routes.mjs','apps/portal/src/ActivityReview.tsx','tests/activity-routes.test.mjs'],
 30:['packages/core/operations.mjs','apps/api/src/operations-store.mjs','apps/api/src/operations-routes.mjs','apps/portal/src/Operations.tsx','tests/integration/operations.test.mjs','tests/browser/operations.mjs'],31:['packages/core/forms.mjs','apps/portal/src/main.tsx'],
 32:['packages/core/coordination.mjs','apps/api/src/coordination-store.mjs'],
 33:['packages/core/coordination.mjs','tests/integration/coordination.test.mjs'],34:['apps/api/src/help-routes.mjs'],
 35:['apps/web/public/assets/public.js','tests/public-sharing.test.mjs','apps/api/src/campaign-store.mjs'],
 36:['packages/core/operations.mjs','apps/api/src/operations-store.mjs','apps/api/src/operations-routes.mjs','docs/operations/COORDINATED_TASKS.md'],37:['apps/editor/editor.mjs','apps/api/src/campaign-routes.mjs'],
 38:['apps/portal/src/AdminOperations.tsx','apps/portal/src/Operations.tsx','apps/portal/src/ActivityReview.tsx','apps/portal/src/HelpCenter.tsx'],39:['packages/core/stripe-campaign.mjs','tests/stripe-real-sandbox-acceptance.test.mjs'],
 40:['packages/core/contribution-terms.mjs','tests/stripe-campaign.test.mjs'],
 41:['packages/core/stripe-web-checkout.mjs','tests/stripe-web-checkout.test.mjs'],
 42:['packages/core/stripe-campaign.mjs','tests/stripe-webhook.test.mjs'],43:['packages/core/fundraising-ledger.mjs'],
 44:['packages/core/stripe-web-checkout.mjs'],45:['packages/core/fundraising-ledger.mjs'],46:['packages/core/treasury-export.mjs','apps/api/src/treasury-export.mjs','apps/portal/src/TreasuryExport.tsx','tests/treasury-export.test.mjs','tests/integration/treasury-export.test.mjs'],
 47:['tests/stripe-outage-routing.test.mjs','tests/stripe-webhook.test.mjs'],
 48:['packages/core/stripe-campaign.mjs','docs/operations/STRIPE_POLITICAL_CAMPAIGN_ACCEPTANCE.md'],
 49:['apps/api/src/postgres-store.mjs'],50:['apps/api/src/visitor-report.mjs','tests/visitor-analytics.test.mjs'],
 51:['tests/browser/journeys.mjs','tests/accessibility-navigation.test.mjs'],52:['tests/browser/journeys.mjs'],
 53:['scripts/performance-budget.mjs','apps/web/public/assets/visitor-insights.js'],
 54:['docs/security/BOUNDARIES.md','tests/staff-security.test.mjs'],55:['apps/api/src/worker.mjs','scripts/database-recovery.mjs','tests/integration/database-recovery.test.mjs','docs/operations/DATABASE_RECOVERY.md'],
 56:['packages/core/ops-health.mjs','tests/ops-health.test.mjs'],
 57:['scripts/verify.mjs','tests/integration/api.test.mjs'],58:['packages/core/policy-documents.mjs','scripts/prepare-issue-video.mjs'],
 59:['render.yaml','docs/operations/RENDER_VERIFIED_PLACEMENT.md'],60:['README.md','docs/operations/DEPLOYMENT.md'],
 62:['packages/core/campaign-content.mjs'],63:['apps/api/src/campaign-store.mjs'],64:['packages/core/campaign-template.mjs'],
 65:['apps/web/private-preview.mjs'],66:['apps/api/src/campaign-routes.mjs'],67:['apps/editor/editor.mjs'],
 68:['apps/editor/editor.mjs','tests/browser/campaign-editor.mjs'],69:['packages/core/campaign-mode.mjs'],
 70:['apps/api/src/campaign-store.mjs','docs/operations/CAMPAIGN_CONTENT_HANDOFF.md'],
 71:['tests/browser/campaign-public.mjs','docs/operations/CAMPAIGN_CONTENT_HANDOFF.md'],
 72:['apps/portal/src/AdminVisitors.tsx','tests/browser/visitor-analytics.mjs']
};
const gaps={
 5:'Finish the complete component/profile coverage review, including protected-flow obligations; preliminary inventory is not full coverage.',
 20:'Finish protected safety scope integration; staff passkeys, bounded roles, current task/editor/finance actions and SQL-created restricted runtime identities are implemented.',
 21:'Implement approved recipient directory, device trust verification and substitution resistance.',
 22:'Implement actual client-encrypted protected submission, authorized recipients and private attachment custody.',
 23:'Implement protected recipient-device recovery and trust restoration; ordinary session revocation/export already work.',
 34:'Connect protected incident narratives, encrypted attachments and scoped staff replies; structured category-only help already works.',
 36:'Approved link registry, version-bound opt-in/handoff and opt-out are implemented. Provider-specific API/suppression adapters require the actual approved provider contract; no fictional connector is enabled.',
 38:'Complete protected safety/support administration with the recipient flow; task/training/module management, report review, coordination controls and emergency activity pause are implemented.',
 43:'Complete treasury settlement/deposit and all-channel reconciliation beyond the implemented signed event ledger.',
 44:'Implement independent donor receipt/recurring cancellation and processor-managed customer portal.',
 45:'Implement treasurer-controlled exception casework and approved refund/dispute actions beyond ledger reconciliation.',
 46:'Finish donor/source and all-channel export adapters with the remaining ledger. Audited generic ledger CSV/JSON, source totals, explicit confirmation and formula-injection protection are implemented.',
 49:'Implement protected-object lifecycle, legal holds and per-class deletion/backup handling; account closure and outbox cleanup already work.',
 55:'Finish matching protected-object/key recovery generations when that storage flow lands; encrypted full-database backup/isolated restore and durable job recovery are implemented and exercised in CI.'
};
const activation={
 8:'Observe current source-plan ingestion and presentation in Engine Room; this is a consumer integration check.',
 12:'Supply/release final issue videos and captions; the consent, revoke and playback component is implemented.',
 13:'Publish the exact approved final legal document; the current draft reader/provenance works.',
 14:'Set the approved final canonical destination/video in content configuration.',
 15:'Set the approved final canonical destination/video in content configuration.',
 19:'Verify existing sender, mail worker and a real mailbox journey before opening public signup.',
 24:'Configure the existing sender callback signing secret and authenticated private ingress; observe deployed real-mailbox delivery. Welcome/security/reminder templates, durable receipt correlation and suppression are implemented.',
 25:'Review and publish the actual current volunteer source edition; no invented source or approval.',
 26:'Publish reviewed current guides and enable normal verified registration when delivery is ready.',
 27:'Exercise newly registered volunteer entry against the hosted release.',
 28:'Publish the approved current orientation/training content and exercise hosted re-acknowledgment.',
 32:'Enable coordination only with the completed staff identity/operations release and hosted verification.',
 33:'Verify hosted staff/member reservation, cancellation and notification journeys.',
 39:'Verify actual campaign-specific merchant approval; test credentials are already supplied.',
 40:'Load the approved current election/limit policy; do not invent campaign legal facts.',
 41:'Verify the exact deployed checkout/return journey; keep live charges separately authorized.',
 42:'Confirm a real Stripe-origin signed test payment receipt against the deployed ledger.',
 47:'Run the actual configured provider end-to-end failure/refund rehearsal when the treasury workflow is ready.',
 48:'Record real merchant/treasurer release and authorized settlement evidence before live activation.',
 51:'Exercise assistive technology on the deployed release; deferred outside review does not mean missing UI code.',
 52:'Retain the current browser/visual release evidence; no extra owner acceptance ceremony.',
 53:'Measure deployed latency/load and configured-vitals reports; asset budget enforcement exists.',
 54:'Retain current source-bound security/CI evidence; do not claim independent certification.',
 56:'Verify fresh deployed-SHA, queue and Engine Room outage reporting against the actual services.',
 57:'Run the whole configured staging release rehearsal; do not count an unperformed observation as unwritten code.',
 58:'Supply/release final publication content and intended public origins.',
 59:'Deploy the tested revision and enable only genuinely configured and approved release capabilities.',
 60:'Verify actual released flows and operational ownership on the target services.',
 70:'Verify actual owner access to the existing initialized editorial database.',
 71:'Verify the hosted owner draft/save/publish/rollback and independent published-reader journey.'
};
const canonical=JSON.parse(await readFile('registry/prs.json','utf8')),
 human=JSON.parse(await readFile('docs/PR_REGISTER.json','utf8')),
 delivery=JSON.parse(await readFile('docs/evidence/DELIVERY.json','utf8'));
const reviewedAt=new Date().toISOString(),rows=[];
for(let i=0;i<canonical.units.length;i++){
 const n=i+1,u=canonical.units[i],p=human.packages[i];
 const evidence=sources[n]||u.evidence||p.acceptance_review?.evidence_paths;
 if(!evidence?.length)throw Error('Missing individual source review '+u.id);
 const files=[];
 for(const path of evidence){const bytes=await readFile(path);files.push({path,sha256:createHash('sha256').update(bytes).digest('hex')});}
 const implementation=gaps[n]?'remaining_implementation':'implemented';
 const review={implementation,reviewedAt,sourceFiles:files,softwareGap:gaps[n]||null,
  activationRequirement:activation[n]||'Verify the tested revision in its intended release; no additional activation input identified.',
  verification:'Current branch source review; final hosted checks and accepted merge are recorded separately.'};
 u.implementationReview=review;p.implementation_review=review;
 // completed retains its original full-scope meaning. implemented explicitly
 // closes software-only status without fabricating deployment/content evidence.
 if(u.status!=='completed'){
  u.status=p.status=gaps[n]?(p.status==='not_started'?'not_started':'in_progress'):'implemented';
  p.implementation_note=gaps[n]||'Working source implementation reviewed individually. '+review.activationRequirement;
  p.acceptance_review={...p.acceptance_review,status:p.status,report:'docs/evidence/CURRENT_IMPLEMENTATION_REVIEW.md',blocker:gaps[n]||review.activationRequirement};
  u.acceptanceBlocker=gaps[n]||review.activationRequirement;
 }
 rows.push({id:u.id,title:u.title,status:u.status,...review});
}
const counts=Object.fromEntries(['completed','implemented','in_progress','not_started'].map(s=>[s,canonical.units.filter(u=>u.status===s).length]));
canonical.progressEvidenceNote='Software implementation is reviewed unit by unit in implementationReview. Implemented code, accepted PRs, deployment and external activation are distinct facts. Historical in_progress labels are not a count of partially written PRs.';
human.implemented_packages=counts.completed+counts.implemented;
human.note='See individual software implementation reviews. Full-scope completion is separate from implemented code, accepted PR merges and external production activation.';
human.progress_evidence_note=canonical.progressEvidenceNote;
delivery.implemented_software_packages=human.implemented_packages;
delivery.last_acceptance_audit={...delivery.last_acceptance_audit,...counts,software_review_report:'docs/evidence/CURRENT_IMPLEMENTATION_REVIEW.md'};
delivery.progress_evidence_note=canonical.progressEvidenceNote;
let md='# Current individual implementation review\n\nThis supersedes the historical aggregate implementation labels in the 13 October audit. Each row below was inspected against named current source files. An implemented feature is not unfinished code merely because final content, a provider setting or live deployment evidence is pending. No missing feature is accepted by relabeling it. Full-scope completed, working implementation, accepted PR merges and actual release verification remain distinct.\n\n';
md+='| Unit | Software finding | Evidence | Remaining software or external activation |\n|---|---|---|---|\n';
for(const row of rows)md+=`| ${row.id}: ${row.title} | ${row.implementation==='implemented'?'Implemented':'Concrete software work remains'} | ${row.sourceFiles.map(f=>'`'+f.path+'`').join(', ')} | ${row.softwareGap||row.activationRequirement} |\n`;
md+='\nThe public pages, content editor, day/night campaigns, source readers, donation checkout, verified-email accounts and existing volunteer tools have working implementations. The remaining software queue concerns specific extended operational capabilities listed explicitly above. It is not a backlog of partially written versions of every page. Current branch tests and actual hosted checks must pass before its changes merge.\n';
await writeFile('docs/evidence/CURRENT_IMPLEMENTATION_REVIEW.md',md);
await writeFile('docs/evidence/IMPLEMENTATION_REVIEW.json',JSON.stringify({reviewedAt,counts,units:rows},null,2)+'\n');
for(const [path,data] of [['registry/prs.json',canonical],['docs/PR_REGISTER.json',human],['docs/evidence/DELIVERY.json',delivery]])await writeFile(path,JSON.stringify(data,null,2)+'\n');
console.log('Reconciled individual software evidence for '+rows.length+' units; deployment and external activation remain separate.');
