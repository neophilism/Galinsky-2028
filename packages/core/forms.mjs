const make=(id,title,fields,restricted=false)=>({id,title,restricted,fields:fields.map(([name,label,type='textarea'])=>({name,label,type})),notice:'Use this worksheet for planning and practice. It stays in this browser tab until you explicitly download or print it. Do not enter supporter contact details, payment information, private evidence or petition signatures.'});
export const forms=[
 make('action-card','First-action card',[['role','My role'],['goal','One action I can complete'],['time','Time I will set aside'],['source','Approved guide or source'],['help','What I need to check first']]),
 make('debrief','Action debrief',[['activity','Activity type'],['worked','What worked'],['learned','What I learned'],['improve','One improvement for next time'],['followup','Follow-up, without personal contact details']]),
 make('conversation','Conversation practice',[['idea','The idea in one sentence'],['source','The approved source'],['question','A question I might hear'],['answer','An honest, source-based response'],['unknown','What I would need to check']]),
 make('event-plan','Event plan',[['purpose','Purpose and format'],['date','Possible date','date'],['venue','Venue and accessibility needs'],['permission','Permissions to confirm'],['roles','Responsibilities, without a private roster'],['safety','Safety and cancellation plan']],true),
 make('call-bank','Call-bank checklist',[['module','Current activity module'],['tool','Approved campaign tool'],['training','Training to complete'],['script','Approved script reference'],['stop','Stop conditions and help channel']],true),
 make('creative-review','Creative review',[['message','Main message'],['source','Policy source'],['rights','Image and music rights'],['accessibility','Captions, description and legibility'],['review','Review needed before publication']]),
 make('research-source','Research source card',[['title','Source title'],['url','Source URL','url'],['date','Date accessed','date'],['claim','Claim supported'],['limits','Limits and uncertainty']]),
 make('correction','Correction record',[['resource','Resource and version'],['original','The statement that needs correction'],['correction','Suggested correction'],['evidence','Supporting source'],['urgency','Reason for urgency']]),
 make('state-activation','State activation worksheet',[['jurisdiction','Jurisdiction'],['election','Election and activity'],['sources','Official sources to verify'],['dates','Effective and expiration dates'],['review','Two independent verifier references'],['approval','Approval still needed']],true),
 make('petition-custody','Petition custody practice',[['module','Current module reference'],['batch','Training batch identifier - no signer names'],['count','Example sheet count','number'],['transfer','Practice custody steps'],['check','Checks required before transfer']],true),
 make('incident-response','Incident first-response card',[['safety','Immediate safety steps'],['stop','Activity to pause'],['channel','Approved private reporting channel'],['preserve','What must be preserved without uploading it here'],['followup','Next safe step']],true),
 make('weekly-plan','Weekly team plan',[['goal','One shared goal'],['actions','Approved actions'],['training','Training needs'],['time','Available time'],['checkin','Check-in plan without a private roster']])
];
export function worksheet(id,values={}){
 const form=forms.find(f=>f.id===id);if(!form)throw new Error('Unknown worksheet');
 return `# ${form.title}\n\nPLANNING / PRACTICE ONLY\n\n${form.notice}\n\n`+form.fields.map(f=>`## ${f.label}\n\n${String(values[f.name]||'').slice(0,10000)}\n`).join('\n');
}
