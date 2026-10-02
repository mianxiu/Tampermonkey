const {chromium}=require('playwright');
const fs=require('fs');const path=require('path');
const dir=path.join(__dirname,'screenshots','search-comments');fs.mkdirSync(dir,{recursive:true});
const script=fs.readFileSync(path.join(__dirname,'../for_ios_zhihu_desktop_mode.user.js'),'utf8');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:false});
 const context=await browser.newContext({storageState:path.join(__dirname,'auth-state.json'),viewport:{width:393,height:852},hasTouch:true});
 const report={steps:[],reads:[],blockedWrites:[]};
 await context.route('**/*',async route=>{const req=route.request();const url=new URL(req.url());if(!['GET','HEAD','OPTIONS'].includes(req.method())&&!(req.method()==='POST'&&url.origin==='https://zhida.zhihu.com'&&url.pathname==='/ai_ingress/stream/completion')){report.blockedWrites.push({method:req.method(),url:url.origin+url.pathname});return route.abort('blockedbyclient');}return route.continue();});
 context.on('response',r=>{if(/search_v3|comment_v5/.test(r.url()))report.reads.push({url:r.url(),status:r.status()});});
 await context.addInitScript({content:`(()=>{const run=()=>{${script}\n};if(document.documentElement)run();else{const o=new MutationObserver(()=>{if(document.documentElement){o.disconnect();run();}});o.observe(document,{childList:true});}})();`});
 const page=await context.newPage();
 async function snapshot(label){
  await page.waitForTimeout(900);
  const state=await page.evaluate(()=>({url:location.href,title:document.title,q:new URL(location.href).searchParams.get('q'),scrollWidth:document.documentElement.scrollWidth,width:innerWidth,answers:document.querySelectorAll('.AnswerItem').length,results:document.querySelectorAll('.SearchResult-Card,.ContentItem').length,error:/似乎出了点问题|网络故障|40362/.test(document.body.innerText),fields:[...document.querySelectorAll('.SearchBar input')].map(el=>({value:el.value,rect:el.getBoundingClientRect().toJSON()})),visibleEditors:[...document.querySelectorAll('textarea,[contenteditable="true"],[role="textbox"],.Editable')].filter(el=>el.getBoundingClientRect().height>0&&!el.closest('.SearchBar')).map(el=>({cls:el.className,placeholder:el.getAttribute('placeholder')||el.getAttribute('data-placeholder')})),visiblePublish:[...document.querySelectorAll('button')].filter(el=>/^(发布|发送)$/.test(el.textContent.trim())&&el.getBoundingClientRect().height>0).length}));
  const headerProbe=await page.locator('.SearchBar input').first().evaluate(el=>{const chain=[];for(let p=el,n=0;p&&n<7;p=p.parentElement,n++){const c=getComputedStyle(p);chain.push({cls:p.className,rect:p.getBoundingClientRect().toJSON(),transform:c.transform,margin:c.margin,position:c.position,width:c.width,flex:c.flex,html:p.outerHTML.slice(0,500)});}return chain;});
  report.steps.push({label,...state,headerProbe});await page.screenshot({path:path.join(dir,label+'.png')});fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({label,...state}));return state;
 }
 try{
  await page.goto('https://www.zhihu.com/',{waitUntil:'domcontentloaded'});await page.waitForTimeout(1800);
  report.auth=await page.evaluate(async()=>{const r=await fetch('/api/v4/me',{credentials:'include'});const d=await r.json();return {status:r.status,loggedIn:r.ok&&!!d.id};});if(!report.auth.loggedIn)throw new Error('登录态未确认');
  await page.locator('#toggle-header-btn').click();await page.waitForTimeout(650);
  const input=page.locator('.SearchBar input').first();await input.fill('前端开发');await snapshot('01-typed');await input.press('Enter');await page.waitForTimeout(2500);const first=await snapshot('02-search-enter');
  if(first.q!=='前端开发'||first.error||first.results===0)throw new Error('回车搜索没有正常显示结果');
  await input.fill('JavaScript');await input.press('Enter');await page.waitForTimeout(2500);const second=await snapshot('03-search-replace');if(second.q!=='JavaScript')throw new Error('切换关键词失败');
  report.searchControls=await page.locator('.SearchBar').first().evaluate(el=>[...el.querySelectorAll('button')].map(b=>({cls:b.className,text:b.innerText,aria:b.getAttribute('aria-label'),title:b.getAttribute('title'),html:b.outerHTML.slice(0,700)})));
  await input.fill('CSS 布局');
  const searchButton=page.locator('.SearchBar button').filter({has:page.locator('svg[class*="Search"]')}).first();
  if(!await searchButton.count())throw new Error('找不到搜索按钮');
  await searchButton.click();await page.waitForTimeout(2500);const clicked=await snapshot('03b-search-click');if(clicked.q!=='CSS 布局'||clicked.error||clicked.results===0)throw new Error('搜索按钮没有正常显示结果');
  for(const step of [first,second,clicked]){const field=step.fields[0];if(field.rect.x<0||field.rect.right>step.width)throw new Error('搜索框被裁切');}
  await page.goto('https://www.zhihu.com/question/646058976/answer/2047828361179931746',{waitUntil:'domcontentloaded'});await page.waitForTimeout(1800);await snapshot('03c-answer-before-comments');
  const comment=page.locator('button.ContentItem-action').filter({hasText:/\d+\s*条评论/}).first();await comment.click({timeout:5000});await page.waitForTimeout(1800);await snapshot('04-comment-root');
  report.composerProbe=await page.evaluate(()=>{
   const nodes=[...document.querySelectorAll('textarea,[contenteditable],[role="textbox"],.Editable')];
   return nodes.slice(0,6).map(el=>{const chain=[];for(let p=el,n=0;p&&n<5;p=p.parentElement,n++)chain.push({tag:p.tagName,cls:p.className,attributes:[...p.attributes].filter(a=>a.name!=='style').map(a=>[a.name,a.value]),html:p.outerHTML.slice(0,4500)});return chain;});
  });
  const child=page.getByRole('button',{name:/查看.*回复|展开.*回复|\d+\s*条回复/}).first();if(!await child.count())throw new Error('没有可测试的回复列表');await child.click();await page.waitForTimeout(1500);await snapshot('05-comment-replies');
  for(const step of report.steps.filter(s=>/04-comment|05-comment/.test(s.label))){if(step.visibleEditors.length||step.visiblePublish)throw new Error('评论编辑区仍可见');}
  if(await page.locator('.CommentContent').count()===0)throw new Error('评论列表没有加载');
 }catch(e){report.error=e.message;console.log('ERROR: '+e.message);process.exitCode=1;}
 finally{fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
