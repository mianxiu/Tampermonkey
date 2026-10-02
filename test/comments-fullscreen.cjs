const {chromium}=require('playwright');
const fs=require('fs');const path=require('path');const assert=require('node:assert/strict');
const out=path.join(__dirname,'screenshots','comments-fullscreen');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:false});
 const context=await browser.newContext({storageState:path.join(__dirname,'auth-state.json'),viewport:{width:393,height:852}});
 await context.route('**/*',r=>['GET','HEAD','OPTIONS'].includes(r.request().method())?r.continue():r.abort('blockedbyclient'));
 const script=fs.readFileSync(path.join(__dirname,'../for_ios_zhihu_desktop_mode.user.js'),'utf8');
 await context.addInitScript({content:`(()=>{const run=()=>{${script}\n};if(document.documentElement)run();else{const o=new MutationObserver(()=>{if(document.documentElement){o.disconnect();run();}});o.observe(document,{childList:true});}})();`});
 const page=await context.newPage();const report=[];
 async function record(label){await page.waitForTimeout(800);const state=await page.locator('.CommentContent:visible').first().evaluate(el=>{const chain=[];for(let p=el,n=0;p&&n<12;p=p.parentElement,n++){const c=getComputedStyle(p);chain.push({tag:p.tagName,cls:p.className,role:p.getAttribute('role'),rect:p.getBoundingClientRect().toJSON(),position:c.position,overflowY:c.overflowY,transform:c.transform,display:c.display});}return {width:innerWidth,height:innerHeight,chain};});report.push({label,...state});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));await page.screenshot({path:path.join(out,label+'.png')});
  const shell=await page.locator('[data-zhihu-comment-shell]').boundingBox();assert(shell&&Math.abs(shell.x)<1&&Math.abs(shell.y)<1&&Math.abs(shell.width-state.width)<1&&Math.abs(shell.height-state.height)<1,'Comment shell must fill viewport');
  assert.equal(await page.locator('[data-zhihu-comment-close] svg').evaluate(el=>getComputedStyle(el).fill),'rgb(102, 102, 102)','Close icon must contrast with white background');
  assert(await page.locator('[data-zhihu-comment-close]').isVisible(),'Close remains visible');assert(!await page.locator('#toggle-header-btn').isVisible());
  assert.equal(await page.locator('[data-zhihu-comment-composer]:visible').count(),0);console.log(JSON.stringify({label,shell}));return state;}
 try{
  await page.goto('https://www.zhihu.com/question/646058976/answer/2047828361179931746',{waitUntil:'domcontentloaded'});await page.waitForTimeout(1800);
  await page.locator('button.ContentItem-action').filter({hasText:/\d+\s*条评论/}).first().click();await page.waitForTimeout(1500);await record('root-393');
  await page.getByRole('button',{name:/查看.*回复|展开.*回复|\d+\s*条回复/}).first().click();await page.waitForTimeout(1000);await record('replies-393');
  const scroller=page.locator('[data-zhihu-comment-scroll]:visible').first();const movement=await scroller.evaluate(el=>{el.scrollTop=300;return {top:el.scrollTop,height:el.clientHeight,total:el.scrollHeight};});assert(movement.top>0,'Reply list must scroll');
  await page.getByText('评论回复',{exact:true}).click();await record('back-root-393');
  for(const width of [768,1024]){await page.setViewportSize({width,height:852});await record('root-'+width);}
  await page.locator('[data-zhihu-comment-close]').click();await page.waitForTimeout(600);
  assert.equal(await page.locator('[data-zhihu-comment-overlay]:visible').count(),0);assert(await page.locator('#toggle-header-btn').isVisible());assert(!await page.evaluate(()=>document.documentElement.hasAttribute('data-zhihu-comments-open')));
  await page.setViewportSize({width:393,height:852});await page.locator('button.ContentItem-action').filter({hasText:/\d+\s*条评论/}).first().click();await record('reopened-393');
  console.log('PASS: root and replies fill viewport; scrolling, back, resize, close and reopen work; composers stay hidden');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
