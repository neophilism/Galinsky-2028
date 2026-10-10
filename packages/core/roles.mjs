export const roles = [
 {id:'network',title:'Personal Network Organizer',time:'15-30 minutes',training:false,restricted:false,description:'Start a respectful conversation with someone you know. Share an approved idea, listen, and leave room for their own decision.'},
 {id:'digital',title:'Digital Ambassador',time:'15-30 minutes',training:false,restricted:false,description:'Share accurate campaign information in your own voice. Use approved sources, accessible captions, and images you have permission to use.'},
 {id:'issue',title:'Issue Ambassador',time:'1-2 hours',training:true,restricted:false,description:'Learn one of the three launch proposals and help people find the sources behind it. Say when an answer needs research.'},
 {id:'canvass',title:'Canvassing and Tabling',time:'2-4 hours',training:true,restricted:true,description:'Meet people through an approved activity. Check the location, instructions, permissions and current materials before starting.'},
 {id:'phone',title:'Phone and Text',time:'1-2 hours',training:true,restricted:true,description:'Work only in the approved campaign tool with the current training, consent and contact rules. Never build your own contact list.'},
 {id:'host',title:'Event Host',time:'2-4 hours',training:true,restricted:true,description:'Plan a welcoming, accessible gathering with the approved event checklist and any required venue permissions.'},
 {id:'recruit',title:'Recruiter and Onboarder',time:'1-2 hours',training:true,restricted:false,description:'Help a new volunteer choose a manageable first step, find current materials and understand where to ask questions.'},
 {id:'captain',title:'Local Team Captain',time:'Regular commitment',training:true,restricted:true,description:'Coordinate approved work with a clearly scoped team. Keep assignments, safety information and training current.'},
 {id:'ballot',title:'Ballot-Access Petition Volunteer',time:'2-4 hours',training:true,restricted:true,description:'Begin with training. Signature collection requires the exact active jurisdiction, election and activity module, with its custody rules.'},
 {id:'voter',title:'Voter Registration, GOTV and Election Day',time:'2-4 hours',training:true,restricted:true,description:'Use current official election sources and the approved module for the exact activity. Do not improvise legal advice.'},
 {id:'fundraising',title:'Small-Dollar Fundraising',time:'1-2 hours',training:true,restricted:true,description:'Direct eligible supporters to the approved fundraising flow. Do not collect card details or promise that a contribution is permitted.'},
 {id:'skills',title:'Skills and Operations',time:'Flexible',training:true,restricted:false,description:'Offer a practical skill for an approved task: design, writing, research, accessibility, organization or technical support.'}
];
export function recommendRole({interest='network',minutes=30,willingToTrain=true}={}){
 let selected=roles.find(r=>r.id===interest)||roles[0];
 let reason='Matches the kind of work you chose.';
 if(selected.training&&!willingToTrain){selected=roles[0];reason='A conversation is a useful first action while you decide about training.';}
 return {role:selected,reason,firstStep:minutes<=30?'Choose one manageable first action.':'Read the playbook, then choose an action.',alternatives:roles.filter(r=>r.id!==selected.id).map(r=>r.id)};
}
