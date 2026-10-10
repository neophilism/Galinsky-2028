import {activityDecision} from './activity.mjs';
export const starterTasks=[
 {id:'read-principle',title:'Read the campaign principle',description:'Explore Justice for All and the debt of injustice. Note one question to research.',role:'network',restricted:false,url:'/issues/'},
 {id:'choose-role',title:'Choose a first role',description:'Match a manageable action to your time, interests and willingness to train.',role:'network',restricted:false,url:'/roles'},
 {id:'practice-conversation',title:'Practice one conversation',description:'Use the worksheet to explain an approved idea in your own words. Do not record another person\'s private information.',role:'network',restricted:false,url:'/forms/conversation'},
 {id:'petition-training',title:'Explore petition training',description:'Training only. Signature collection is inactive until the exact current module is approved.',role:'ballot',restricted:true,url:'/materials'}
];
export function taskDecision(task,account,module,request,now){if(!account?.verified)return {allowed:false,reason:'Verify your email first.'};if(!task.restricted)return {allowed:true,reason:'A self-directed first action. No private information is collected.'};return activityDecision(module,request,now);}
