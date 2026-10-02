const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const assert=require('node:assert/strict');const {execFileSync}=require('node:child_process');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const out=path.join(__dirname,'screenshots','answer-stability');fs.mkdirSync(out,{recursive:true});
 const current=fs.readFileSync(path.join(__dirname,'../for_ios_zhihu_desktop_mode.user.js'),'utf8');
 const baseline=execFileSync('git',['show','ac3a09f:for_ios_zhihu_desktop_mode.user.js'],{cwd:path.join(__dirname,'..'),encoding:'utf8'});
 const report=[];
 try{
  for(const [name,script] of [['baseline',baseline],['current',current]]){
   const context=await browser.newContext({viewport:{width:393,height:852},storageState:path.join(__dirname,'auth-state.json')});
   await context.route('**/*',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():r.abort('blockedbyclient'));
   await context.addInitScript({content:`(()=>{const run=()=>{${script}\n};if(document.documentElement)run();else{const o=new MutationObserver(()=>{if(document.documentElement){o.disconnect();run();}});o.observe(document,{childList:true});}})();`});
   const page=await context.newPage();
   // Delayed insertion of an unknown desktop wrapper reproduces the wide-first paint.
   await page.route('https://www.zhihu.com/question/stability-fixture',r=>r.fulfill({contentType:'text/html',body:'<html><head></head><body><div id="root"><div><section id="host"></section></div></div></body></html>'}));
   await page.goto('https://www.zhihu.com/question/stability-fixture');await page.waitForTimeout(400);
   const widths=await page.evaluate(async()=>{
    const wrapper=document.createElement('div');wrapper.id='answer-wrapper';wrapper.style.cssText='width:1032px;max-width:1175px;margin-right:-630px';wrapper.innerHTML='<div class="AnswerItem"><div class="RichContent"><p>'+('答案正文需要稳定排版。'.repeat(20))+'</p></div></div>';document.getElementById('host').appendChild(wrapper);
    const result=[];for(let i=0;i<60;i++){await new Promise(requestAnimationFrame);result.push({time:performance.now(),width:wrapper.getBoundingClientRect().width,textWidth:wrapper.querySelector('p').getBoundingClientRect().width});}return result;
   });
   report.push({name,fixture:widths});await page.screenshot({path:path.join(out,name+'-fixture.png')});
   if(name==='current'&&!process.argv.includes('--probe'))assert(widths.every(s=>s.width<=393&&Math.abs(s.width-widths[0].width)<1),'Answer layout must be narrow on every painted frame');
   if(process.argv.includes('--live')){
    await page.addInitScript(()=>{window.answerFrames=[];const start=performance.now();function frame(){const el=document.querySelector('.AnswerItem');if(el&&el.getBoundingClientRect().height>0){const r=el.getBoundingClientRect();const p=el.querySelector('.RichText p');window.answerFrames.push({time:Math.round(performance.now()),width:r.width,left:r.left,textWidth:p?.getBoundingClientRect().width});}if(performance.now()-start<7000)requestAnimationFrame(frame);}requestAnimationFrame(frame);});
    await page.goto('https://www.zhihu.com/question/646058976/answer/2047828361179931746',{waitUntil:'domcontentloaded'});await page.waitForTimeout(7000);
    const frames=await page.evaluate(()=>window.answerFrames);report[report.length-1].live=frames.filter((s,i)=>!i||s.width!==frames[i-1].width||s.textWidth!==frames[i-1].textWidth);
    assert(frames.length>0,'Live answer must load');await page.screenshot({path:path.join(out,name+'-live.png')});
    if(name==='current')assert(frames.every(s=>s.width<=393&&Math.abs(s.width-frames[0].width)<1&&Math.abs((s.textWidth||0)-(frames[0].textWidth||0))<1),'Live answer text must keep its first visible line width');
   }
   await context.close();
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.map(r=>({name:r.name,first:r.fixture[0],last:r.fixture.at(-1),live:r.live}))));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
