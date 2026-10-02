const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:false});const context=await browser.newContext({storageState:path.join(__dirname,'auth-state.json'),viewport:{width:393,height:852}});
 const out=path.join(__dirname,'screenshots','collapse-layout');fs.mkdirSync(out,{recursive:true});const report=[];
 await context.route('**/*',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():r.abort('blockedbyclient'));
 const script=fs.readFileSync(path.join(__dirname,'../for_ios_zhihu_desktop_mode.user.js'),'utf8');
 await context.addInitScript({content:`(()=>{const run=()=>{${script}\n};if(document.documentElement)run();else{const o=new MutationObserver(()=>{if(document.documentElement){o.disconnect();run();}});o.observe(document,{childList:true});}})();`});
 const page=await context.newPage();
 async function record(label){await page.waitForTimeout(700);const state=await page.evaluate(()=>({scrollY,collapsed:[...document.querySelectorAll('.RichContent.is-collapsed .RichContent-inner')].map(el=>({height:el.getBoundingClientRect().height,maxHeight:getComputedStyle(el).maxHeight})),buttons:[...document.querySelectorAll('button')].filter(el=>/收起|展开|阅读全文/.test(el.innerText)).map(el=>{const chain=[];for(let p=el,n=0;p&&n<4;p=p.parentElement,n++){const s=getComputedStyle(p);chain.push({cls:p.className,position:s.position,display:s.display,rect:p.getBoundingClientRect().toJSON(),html:p.outerHTML.slice(0,1000)});}return {text:el.innerText,chain};})}));report.push({label,...state});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));await page.screenshot({path:path.join(out,label+'.png')});console.log(JSON.stringify({label,collapsed:state.collapsed,buttons:state.buttons.map(b=>({text:b.text,cls:b.chain[0].cls,position:b.chain[0].position,rect:b.chain[0].rect}))}));return state;}
 try{
  await page.goto('https://www.zhihu.com/question/646058976/answer/2047828361179931746',{waitUntil:'domcontentloaded'});await page.waitForTimeout(1800);const top=await record('top');assert(top.collapsed.length>0&&top.collapsed.every(c=>c.height<=240));assert(!await page.locator('#zhihu-collapse-btn').isVisible());
  const expand=page.getByRole('button',{name:/阅读全文/}).first();await expand.scrollIntoViewIfNeeded();await expand.click();await record('expanded');
  await page.evaluate(()=>window.scrollBy(0,700));await record('down');assert(!await page.locator('#zhihu-collapse-btn').isVisible());await page.evaluate(()=>window.scrollBy(0,-400));await record('up');
  const floating=page.locator('#zhihu-collapse-btn');assert(await floating.isVisible());assert.equal(await floating.evaluate(el=>getComputedStyle(el).borderRadius),'999px');
  await floating.click();const folded=await record('folded');assert(folded.collapsed.length===top.collapsed.length&&folded.collapsed.every(c=>c.height<=240));assert(!await floating.isVisible());
  assert(folded.buttons.filter(b=>b.chain[0].cls.includes('ContentItem-expandButton')).length>0,'Read more remains available');
  assert(await page.locator('.ContentItem-actions').first().evaluate(el=>getComputedStyle(el).position==='static'),'Voting stays in document flow');
  console.log('PASS: 240px summaries, native expand/collapse, rounded floating collapse on upward scroll, nonfloating votes');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
