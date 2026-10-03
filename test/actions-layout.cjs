const {chromium}=require('playwright');const fs=require('fs');const path=require('path');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:false});const context=await browser.newContext({storageState:path.join(__dirname,'auth-state.json'),viewport:{width:393,height:852}});
 const out=path.join(__dirname,'screenshots','actions-layout');fs.mkdirSync(out,{recursive:true});const report=[];
 await context.route('**/*',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():r.abort('blockedbyclient'));
 const script=fs.readFileSync(path.join(__dirname,'../for_ios_zhihu_desktop_mode.user.js'),'utf8');
 await context.addInitScript({content:`(()=>{const run=()=>{${script}\n};if(document.documentElement)run();else{const o=new MutationObserver(()=>{if(document.documentElement){o.disconnect();run();}});o.observe(document,{childList:true});}})();`});
 const page=await context.newPage();
 async function record(label){await page.waitForTimeout(600);const state=await page.evaluate(()=>({scrollY,iconOpacity:getComputedStyle(document.getElementById('toggle-header-btn')).opacity,bars:[...document.querySelectorAll('.ContentItem-actions,.RichContent-actions')].map(el=>{const chain=[];for(let p=el,n=0;p&&n<5;p=p.parentElement,n++){const s=getComputedStyle(p);chain.push({cls:p.className,position:s.position,rect:p.getBoundingClientRect().toJSON(),html:p.outerHTML.slice(0,500)});}return chain;})}));report.push({label,...state});console.log(JSON.stringify({label,scrollY:state.scrollY,iconOpacity:state.iconOpacity,bars:state.bars.map(chain=>chain[0].position)}));fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));await page.screenshot({path:path.join(out,label+'.png')});return state;}
 try{
  await page.goto('https://www.zhihu.com/question/646058976/answer/2047828361179931746',{waitUntil:'domcontentloaded'});await page.waitForTimeout(1800);const top=await record('answer-top');
  assert.equal(top.iconOpacity,'0.2');assert(top.bars.length>0,'Answer actions must load');assert(top.bars.every(chain=>chain[0].position==='static'),'Actions must remain in normal flow');assert(top.bars[0][0].rect.top>852,'Long answer actions must not float in viewport');
  await page.evaluate(()=>window.scrollTo(0,500));const scrolled=await record('answer-scrolled');assert(Math.abs(scrolled.bars[0][0].rect.top-(top.bars[0][0].rect.top-scrolled.scrollY))<2,'Actions must move with document scroll');
  await page.locator('.ContentItem-actions').first().scrollIntoViewIfNeeded();const bottom=await record('answer-actions-visible');assert(bottom.bars[0][0].rect.top>=0&&bottom.bars[0][0].rect.bottom<=852,'Actions remain accessible below answer');
  for(const width of [393,375]){
   await page.setViewportSize({width,height:852});await page.waitForTimeout(500);await page.locator('.ContentItem-actions').first().scrollIntoViewIfNeeded();
   const row=await page.locator('.ContentItem-actions').first().evaluate(el=>{const vote=el.querySelector('.VoteButton').getBoundingClientRect();const collapse=el.querySelector('.ContentItem-rightButton:not(.ContentItem-expandButton)').getBoundingClientRect();const rect=el.getBoundingClientRect();return {vote:vote.toJSON(),collapse:collapse.toJSON(),rect:rect.toJSON()};});
   console.log(JSON.stringify({width,voteWidth:row.vote.width,collapseWidth:row.collapse.width,rowWidth:row.rect.width}));
   assert(Math.abs((row.vote.y+row.vote.height/2)-(row.collapse.y+row.collapse.height/2))<2,'Vote and collapse must stay on one line');assert(row.collapse.right<=row.rect.right+1,'Collapse must fit action row');await record('single-row-'+width);
  }
  await page.locator('#toggle-header-btn').click();await page.waitForTimeout(650);assert(await page.locator('.SearchBar input').first().isVisible(),'Faint search button stays usable');
  console.log('PASS: faint search button; nonfloating actions move with scroll and remain accessible; no votes sent');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
