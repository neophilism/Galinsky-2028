(() => {
const $=(s)=>document.querySelector(s);
  // Lightweight canvas network flag. No external scripts, trackers, or WebGL.
  const canvas = $('.flag-canvas');
  if (canvas) {
    const context=canvas.getContext('2d');
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    let paused=media.matches, visible=true, frame=0, last=0, elapsed=0, width=1,height=1;
    const toggle=$('#motion-toggle');
    const cols=66, rows=39, points=[];
    const random=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
    for (let row=0;row<rows;row++) for (let col=0;col<cols;col++) {
      // Keep every other point outside the canton to create a fine open weave.
      if ((row+col)%2 && !(col<26 && row<21)) continue;
      const canton=col<26 && row<21;
      const red=Math.floor(row/3)%2===0;
      points.push({u:col/(cols-1),v:row/(rows-1),color:canton?'#0a3161':red?'#b31942':'#99aec7',seed:row*cols+col,canton,red});
    }
    function size() {
      const r=canvas.getBoundingClientRect();width=r.width;height=r.height;
      const dpr=Math.min(devicePixelRatio||1,2);
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
      context.setTransform(dpr,0,0,dpr,0,0); draw();
    }
    function draw() {
      context.clearRect(0,0,width,height);
      const time=paused?12:elapsed/1000;
      const form=Math.min(1,time/4.2);
      const eased=1-Math.pow(1-form,3);
      const fw=width*.94,fh=Math.min(height*.68,fw*.526),x0=width*.02,y0=height*.13;
      const positions=[];
      for(const p of points) {
        const wave=Math.sin(p.u*7+time*.32)*height*.021*Math.sin(p.u*Math.PI*.75);
        const x=x0+p.u*fw+(1-eased)*(random(p.seed+1)-.5)*width*.62;
        const y=y0+p.v*fh+wave+(1-eased)*(random(p.seed+6)-.5)*height*.72;
        positions.push([x,y]);
      }
      // Quiet diagonal links echo a civic network, without obscuring the person.
      context.lineWidth=.5;
      points.forEach((p,i)=>{
        const a=positions[i],b=positions[i+1];
        if (b && Math.abs(b[0]-a[0])<fw*.038 && Math.abs(b[1]-a[1])<fh*.09) {
          context.strokeStyle=p.color;context.globalAlpha=p.canton?.26:p.red?.21:.09;
          context.beginPath();context.moveTo(a[0],a[1]);context.lineTo(b[0],b[1]);context.stroke();
        }
      });
      points.forEach((p,i)=>{
        context.fillStyle=p.color;context.globalAlpha=p.canton?.88:p.red?.8:.16;
        context.beginPath();context.arc(positions[i][0],positions[i][1],p.canton?2.1:p.red?2.0:1.05,0,Math.PI*2);context.fill();
      });
      context.globalAlpha=eased*.95;
      for(let r=0;r<9;r++) {
        const count=r%2===0?6:5;
        for(let c=0;c<count;c++) {
          const u=(c+(r%2===0?.5:1))/6*.378;
          const v=(r+.65)/9*.51;
          const x=x0+u*fw;
          const y=y0+v*fh+Math.sin(u*7+time*.32)*height*.021*Math.sin(u*Math.PI*.75);
          context.fillStyle='#ffffff';context.beginPath();
          for(let k=0;k<10;k++) {
            const angle=-Math.PI/2+k*Math.PI/5, radius=k%2===0?4.2:1.8;
            const px=x+Math.cos(angle)*radius,py=y+Math.sin(angle)*radius;
            if(k===0)context.moveTo(px,py);else context.lineTo(px,py);
          }
          context.closePath();context.fill();
        }
      }
      context.globalAlpha=1;
    }
    function tick(t) {
      frame=0;
      if(paused||!visible||document.hidden){last=0;return;}
      if(last)elapsed+=Math.min(40,t-last);last=t;draw();frame=requestAnimationFrame(tick);
    }
    function sync() {
      document.body.classList.toggle('motion-paused',paused);
      toggle.textContent=paused?'Play animation \u25b6':'Pause animation \u275a\u275a';
      toggle.setAttribute('aria-pressed',String(paused));
      if(paused){if(frame)cancelAnimationFrame(frame);frame=0;draw();}
      else if(!frame && visible && !document.hidden)frame=requestAnimationFrame(tick);
    }
    toggle.addEventListener('click',()=>{paused=!paused;sync();});
    media.addEventListener('change',e=>{paused=e.matches;sync();});
    document.addEventListener('visibilitychange',sync);
    new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(canvas);
    new ResizeObserver(size).observe(canvas);size();sync();
  }
})();
