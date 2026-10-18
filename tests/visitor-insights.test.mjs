import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {parseInteraction,parseVisitorPayload,VISITOR_ACTIONS,VISITOR_DETAILS} from '../packages/core/visitor-analytics.mjs';

const event=(kind,target='p0',detail='none',amount=0)=>({seq:1,kind,target,detail,amount});
test('all proposed opt-in experience events use server-approved bounded shapes',()=>{
 const allowed=[
  event('rage_click','s1'),event('dead_click','s1'),
  event('scroll_speed','p0','fast'),event('scroll_direction','p0','up'),
  event('navigation_attempt'),event('navigation_stall'),
  event('navigation_http_error','p0','http4'),
  event('javascript_error'),event('promise_rejection'),
  event('resource_error','p0','script'),event('resource_slow','p0','image',2500),
  event('device_class','p0','mobile'),
  event('funnel_step','p0','donate_handoff'),
  event('perf_ttfb','p0','none',103),event('perf_fcp','p0','none',211),
  event('perf_lcp','p0','none',1500),event('perf_cls','p0','none',22),
  event('perf_interaction_delay','p0','none',194),
  event('perf_longtask','p0','none',57),
  event('youtube_play','m1'),event('youtube_pause','m1'),event('youtube_end','m1'),
  event('youtube_progress','m1','q75'),event('youtube_error','m1')
 ];
 for(const candidate of allowed)assert.deepEqual(parseInteraction(candidate),candidate,candidate.kind);
 for(const kind of allowed.map(e=>e.kind))assert(VISITOR_ACTIONS.includes(kind),kind);
 assert(VISITOR_DETAILS.includes('policy_media'));
});
test('malformed, identifying and semantically inconsistent details are rejected',()=>{
 const invalid=[
  event('funnel_step','p0','voted-for-candidate-X'),
  event('funnel_step','p0','donate_view',1),
  event('device_class','p0','mozilla-user-agent'),
  event('resource_error','p0','https://cdn.site/image.png'),
  event('resource_slow','p0','image'),
  event('resource_slow','p0','script',14401),
  event('scroll_direction','p0','slow'),
  event('scroll_speed','p0','up'),
  event('navigation_http_error','p0','http418'),
  event('youtube_progress','m1','q35'),
  event('youtube_play','p0'),
  event('javascript_error','m1'),
  event('perf_fcp','p0','none',0),
  event('perf_lcp','p0','none',-1),
  event('dead_click','l1'),
  {...event('resource_error','p0','image'),url:'https://news.example'},
  {...event('javascript_error'),stack:'at email@example.com'}
 ];
 for(const candidate of invalid)assert.throws(()=>parseInteraction(candidate),JSON.stringify(candidate));
 const payload={path:'/issues/',viewId:randomUUID(),events:[event('funnel_step','p0','issues_view')]};
 assert.deepEqual(parseVisitorPayload(payload),payload);
 assert.throws(()=>parseVisitorPayload({...payload,accountId:'political-profile-id'}));
});
test('browser enhancements contain no user-content, fingerprint or input capture APIs',async()=>{
 const text=await readFile('apps/web/public/assets/visitor-insights.js','utf8');
 assert(text.includes('g28:analytics-state'));
 assert(text.includes('g28:analytics-finalize'));
 assert(text.includes('g28:youtube-mounted'));
 for(const pattern of [/\.value\b/,/\.textContent\b/,/\.outerHTML\b/,/\.innerHTML\b/,/\.getUserMedia\(/,
   /navigator\.userAgent\b/,/document\.cookie\b/,/localStorage\b/,/sessionStorage\b/,/\.stack\b/])
  assert(!pattern.test(text),'No raw content/ID collection: '+pattern);
});
