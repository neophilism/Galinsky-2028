// No per-frame work: pause compositor animation while hidden or offscreen.
(()=>{const elements=[...document.querySelectorAll('.campaign-hero-effect[data-animated="true"]')];
 if(!elements.length)return;
 const visibility=new Map(elements.map(element=>[element,true]));
 function sync(){for(const el of elements)el.dataset.running=String(!document.hidden&&visibility.get(el));}
 if('IntersectionObserver'in window){
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)visibility.set(entry.target,entry.isIntersecting);sync();});
  for(const el of elements)observer.observe(el);
 }
 document.addEventListener('visibilitychange',sync);sync();
})();
