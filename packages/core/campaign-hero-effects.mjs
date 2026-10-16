import {resolveHeroBackground} from './campaign-content.mjs';
// Only enum and bounded number values can reach the DOM/CSS below.
// No editorial string is interpolated into executable markup.
export const HERO_EFFECT_CSS_PATH='/assets/hero-effects.css';
export const HERO_EFFECT_SCRIPT_PATH='/assets/hero-effects.js';
const duration=Object.freeze({still:44,slow:44,medium:22});
export function heroBackdropMarkup(record,mode='default'){
 const config=resolveHeroBackground(record.heroBackground,mode);
 if(config.preset==='legacy')return'<canvas aria-hidden="true" class="flag-canvas"></canvas>';
 if(config.preset==='none')return'';
 const animated=config.animated&&config.speed!=='still';
 const vars=[
  '--hfx-opacity:'+(config.opacity/100).toFixed(2),
  '--hfx-intensity:'+(config.intensity/100).toFixed(2),
  '--hfx-blur:'+Math.round(config.blur*0.9)+'px',
  '--hfx-duration:'+duration[config.speed]+'s'
 ].join(';');
 return '<div class="campaign-hero-effect" aria-hidden="true" data-effect="'+config.preset+
  '" data-animated="'+animated+'" data-speed="'+config.speed+'" data-running="true" style="'+vars+'">'+
  '<span class="hfx-layer hfx-a"></span><span class="hfx-layer hfx-b"></span><span class="hfx-layer hfx-c"></span></div>';
}
export function heroEffectNeedsScript(record,mode='default'){
 const effect=resolveHeroBackground(record.heroBackground,mode);
 return effect.preset!=='none'&&effect.preset!=='legacy'&&effect.animated&&effect.speed!=='still';
}
