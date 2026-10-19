'use strict';
(()=>{
 const target=document.querySelector('[data-card-qr]');
 if(target&&typeof window.QRCode==='function')new window.QRCode(target,{text:target.dataset.cardQr,width:224,height:224,useSVG:true,colorDark:'#082653',colorLight:'#ffffff',correctLevel:window.QRCode.CorrectLevel.M});
 document.querySelector('[data-print-card]')?.addEventListener('click',()=>window.print());
})();
