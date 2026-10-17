import {assert,exactKeys} from './validation.mjs';

// This low-risk orientation is a self-check, NOT an activity authorization
// module, staff approval, or official legal training certification.
export const ORIENTATION_REVISION='first-hour-v1';
export const ORIENTATION_COMPLETION_ID='orientation-first-hour-v1';
const questions=[
 {id:'current-guides',prompt:'Does reading a volunteer guide authorize petition collection or another regulated activity?',
  choices:[{id:'yes',label:'Yes, any published guide is permission.'},{id:'no',label:'No. The current jurisdiction, activity, training, approvals and tools must all match.'}],correct:'no'},
 {id:'personal-details',prompt:'What should you record when practicing a conversation?',
  choices:[{id:'details',label:'Other people’s private names and contact details.'},{id:'own-notes',label:'Only my own practice notes, without another person’s private information.'}],correct:'own-notes'},
 {id:'outdated-content',prompt:'What should you do if a document or activity approval appears outdated?',
  choices:[{id:'proceed',label:'Proceed anyway because I completed the orientation.'},{id:'verify',label:'Check the current reviewed materials and activity status before acting.'}],correct:'verify'}
];
export function publicOrientation(){
 return {revision:ORIENTATION_REVISION,title:'Your first hour: responsible participation',
  introduction:'Learn the campaign principle, choose a manageable role and verify current approvals before acting. These three questions are an account-only knowledge check, not a certification.',
  questions:questions.map(q=>({id:q.id,prompt:q.prompt,choices:q.choices}))};
}
export function evaluateOrientation(body){
 const input=exactKeys(body,['revision','answers']);
 assert(input.revision===ORIENTATION_REVISION,'orientation_stale','This orientation changed. Refresh the lesson before submitting.',409);
 assert(input.answers&&typeof input.answers==='object'&&!Array.isArray(input.answers),'invalid_orientation','Answer every question.');
 assert(Object.keys(input.answers).length===questions.length&&Object.keys(input.answers).every(k=>questions.some(q=>q.id===k)),
  'invalid_orientation','Submit one answer for each question.');
 for(const q of questions)assert(q.choices.some(c=>c.id===input.answers[q.id]),'invalid_orientation','Choose one of the displayed answers.');
 const missed=questions.filter(q=>input.answers[q.id]!==q.correct).map(q=>q.id);
 return {passed:missed.length===0,missed,activityAuthorized:false,verified:false};
}
