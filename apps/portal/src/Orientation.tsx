import React,{useEffect,useState,FormEvent} from 'react';
import {request} from './api';

type Question={id:string;prompt:string;choices:{id:string;label:string}[]};
type Lesson={revision:string;title:string;introduction:string;questions:Question[];completed:boolean;verification:string};
type Result={passed:boolean;missed:string[];completed:boolean;activityAuthorized:boolean;verified:boolean};
export function Orientation({csrf}:{csrf:string}){
 const[data,setData]=useState<Lesson|null>(null),[answers,setAnswers]=useState<Record<string,string>>({}),
  [feedback,setFeedback]=useState(''),[error,setError]=useState(''),[saving,setSaving]=useState(false);
 useEffect(()=>{let cancelled=false;request<Lesson>('/api/orientation').then(x=>{if(!cancelled)setData(x);}).catch(e=>{if(!cancelled)setError((e as Error).message);});return()=>{cancelled=true;};},[]);
 async function submit(e:FormEvent){e.preventDefault();if(!data||saving)return;setError('');setFeedback('');setSaving(true);
  try{const r=await request<Result>('/api/orientation/complete',{revision:data.revision,answers},csrf);
   if(r.passed){setData({...data,completed:true});setFeedback('Saved to your account as a first-hour knowledge check. This does not authorize petitioning or any regulated activity.');}
   else setFeedback('Review the answers and try again. Questions to revisit: '+r.missed.join(', ')+'.');
  }catch(e){setError((e as Error).message);}finally{setSaving(false);}
 }
 return <div className="orientation"><span className="eyebrow">FIRST-HOUR ORIENTATION</span>
  <h1>{data?.title||'Your first hour.'}</h1>
  {error&&<p role="alert" className="service-notice">{error}</p>}
  {data?<>
   <p className="lead">{data.introduction}</p>
   <div className="panel spaced"><h2>Three foundations</h2><ol>
    <li>Read the campaign's public principle and explore the issues without collecting private information.</li>
    <li>Choose a role that fits your interests and time, then consult only the current reviewed guides.</li>
    <li>Before regulated activity, check the exact current approval, jurisdiction, training, tool and expiration. A quiz does not activate a field program.</li>
   </ol><p className="fine">{data.verification}</p></div>
   <form onSubmit={submit} className="panel spaced"><h2>Check your understanding</h2>
    {data.questions.map((q,index)=><fieldset key={q.id} style={{border:'0',margin:'20px 0',padding:0}}>
      <legend style={{fontWeight:800,marginBottom:12}}>{index+1}. {q.prompt}</legend>
      {q.choices.map(option=><label key={option.id} className="check" style={{display:'flex',marginBottom:10}}>
       <input type="radio" name={'orientation-'+q.id} value={option.id} checked={answers[q.id]===option.id}
        onChange={()=>{setAnswers(old=>({...old,[q.id]:option.id}));setFeedback('');}}/>
       <span>{option.label}</span></label>)}
     </fieldset>)}
    <button className="btn blue" type="submit" disabled={saving||Object.keys(answers).length!==data.questions.length}>{saving?'Saving...':data.completed?'Check again':'Check answers and save'}</button>
    {feedback&&<p role="status" aria-live="polite">{feedback}</p>}
    {data.completed&&<p role="status">Your current orientation revision is saved as a self-reported knowledge check. No activity permission is granted.</p>}
   </form>
  </>:!error?<p role="status">Loading the current orientation...</p>:null}
 </div>;
}
