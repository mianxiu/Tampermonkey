const {chromium}=require('playwright');
const fs=require('fs');
const path=require('path');
const dir=path.join(__dirname,'screenshots','full-flow');
const videos=path.join(__dirname,'videos');
const authFile=path.join(__dirname,'auth-state.json');
fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(videos,{recursive:true});
const userscript=fs.readFileSync(path.join(__dirname,'../for_ios_zhihu_desktop_mode.user.js'),'utf8');
async function authenticated(page){
 return page.evaluate(async()=>{
  try{const r=await fetch('/api/v4/me',{credentials:'include'});const d=await r.json();return {status:r.status,loggedIn:r.ok&&!!d.id&&!d.error};}
  catch{return {status:null,loggedIn:false};}
 });
}
(async()=>{
 const channel=process.argv.includes('--chrome')?'chrome':'msedge';
 const browserName=channel==='chrome'?'Chrome':'Edge';
 const browser=await chromium.launch({channel,headless:false});
 let setup=await browser.newContext(fs.existsSync(authFile)?{storageState:authFile}:{});
 if(!fs.existsSync(authFile)&&fs.existsSync(path.join(__dirname,'cookies.json')))await setup.addCookies(JSON.parse(fs.readFileSync(path.join(__dirname,'cookies.json'),'utf8')));
 const loginPage=await setup.newPage();
 await loginPage.goto('https://www.zhihu.com/',{waitUntil:'domcontentloaded',timeout:30000});
 await loginPage.waitForTimeout(2500);
 let auth=await authenticated(loginPage);
 console.log('AUTH: '+JSON.stringify(auth));
 if(!auth.loggedIn){
  await loginPage.goto('https://www.zhihu.com/signin',{waitUntil:'domcontentloaded',timeout:30000});
  console.log(`LOGIN_REQUIRED: 请在打开的 ${browserName} 窗口登录；登录过程不录制。`);
  const deadline=Date.now()+240000;
  while(Date.now()<deadline){
   await loginPage.waitForTimeout(5000);
   if(!loginPage.url().includes('/signin')){auth=await authenticated(loginPage);if(auth.loggedIn)break;}
  }
 }
 if(!auth.loggedIn){await browser.close();throw new Error('未确认登录，未生成冒充已登录的流程视频。');}
 await setup.storageState({path:authFile,indexedDB:true});
 console.log('AUTH_CONFIRMED: 登录态已验证，开始录制完整流程。');
 await setup.close();
 const context=await browser.newContext({storageState:authFile,viewport:{width:393,height:852},hasTouch:true,recordVideo:{dir:videos,size:{width:393,height:852}}});
 const report={browser:browserName,auth,steps:[],blockedWrites:[],allowedAiReads:[],commentReads:[]};
 await context.route('**/*',async route=>{
  const req=route.request();
  // 搜索总结以 POST 流式读取；只放行该确切端点，不放行评论写入。
  const url=new URL(req.url());
  if(req.method()==='POST'&&url.origin==='https://zhida.zhihu.com'&&url.pathname==='/ai_ingress/stream/completion'){
   report.allowedAiReads.push({method:req.method(),url:url.origin+url.pathname});
   return route.continue();
  }
  if(!['GET','HEAD','OPTIONS'].includes(req.method())){report.blockedWrites.push({method:req.method(),url:req.url().split('?')[0]});return route.abort('blockedbyclient');}
  return route.continue();
 });
 context.on('response',r=>{if(/\/comment_v5\//.test(r.url()))report.commentReads.push({url:r.url(),status:r.status()});});
 await context.addInitScript({content:`(()=>{const run=()=>{${userscript}\nconst s=document.createElement('style');s.textContent='textarea,[contenteditable],[role="textbox"],.Editable,.CommentEditor,.CommentEditorV2,.CommentInput,[data-comment-test-composer]{display:none!important;pointer-events:none!important}';(document.head||document.documentElement).appendChild(s);
 const shield=()=>{for(const editor of document.querySelectorAll('textarea,[contenteditable],[role="textbox"],.Editable')){for(let el=editor.parentElement,n=0;el&&n<5;el=el.parentElement,n++){if([...el.querySelectorAll('button')].some(b=>/^(发布|发送)$/.test(b.textContent.trim()))){el.setAttribute('data-comment-test-composer','');break;}}}for(const b of document.querySelectorAll('button'))if(/^(发布|发送)$/.test(b.textContent.trim())){b.disabled=true;b.style.setProperty('display','none','important');}};
 new MutationObserver(shield).observe(document.documentElement,{childList:true,subtree:true});shield();};if(document.documentElement)run();else{const o=new MutationObserver(()=>{if(document.documentElement){o.disconnect();run();}});o.observe(document,{childList:true});}})();`});
 const page=await context.newPage();
 async function record(label){
  await page.waitForTimeout(1200);
  const state=await page.evaluate(()=>({url:location.href,title:document.title,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,loginGate:location.pathname.includes('/signin')||!!document.querySelector('.SignContainer'),error:/40362|似乎出了点问题|网络故障/.test(document.body.innerText),commentCount:document.querySelectorAll('.CommentContent').length,body:document.body.innerText.slice(0,180)}));
  report.steps.push({label,...state});await page.screenshot({path:path.join(dir,label+'.png')});
  console.log('STEP: '+JSON.stringify({label,...state}));
  fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(report,null,2));
  return state;
 }
 async function navigate(url,label){await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(1800);await record(label);}
 try{
  await navigate('https://www.zhihu.com/','01-home');
  const homeLinks=await page.locator('a[href*="/question/"]').evaluateAll(els=>els.map(a=>a.href).slice(0,5));
  const header=page.locator('#toggle-header-btn');await header.click();await page.waitForTimeout(650);await record('02-header-search');await header.click();await page.waitForTimeout(650);
  await page.evaluate(()=>window.scrollBy({top:650,behavior:'smooth'}));await record('03-home-scroll');
  await navigate('https://www.zhihu.com/search?type=content&q=前端开发','04-search');
  await page.evaluate(()=>window.scrollBy({top:650,behavior:'smooth'}));await record('05-search-scroll');
  await navigate('https://www.zhihu.com/explore','06-explore');
  const special=page.locator('.ExploreSpecialCard-header').first();if(await special.count()){await special.scrollIntoViewIfNeeded();await record('07-explore-special');}
  await navigate('https://www.zhihu.com/hot','08-hot');await page.evaluate(()=>window.scrollBy({top:650,behavior:'smooth'}));await record('09-hot-scroll');
  const answerArg=process.argv.indexOf('--answer-url');
  const detail=(answerArg>=0?process.argv[answerArg+1]:null)||homeLinks[0]||'https://www.zhihu.com/question/264101948/answer/3596981236';await navigate(detail,'10-answer');
  if(!await page.locator('.AnswerItem').count())await navigate('https://www.zhihu.com/question/264101948/answer/3596981236','10b-public-answer');
  const expand=page.getByText('阅读全文',{exact:false}).first();if(await expand.isVisible().catch(()=>false)){await expand.click({timeout:4000});await record('11-answer-expanded');}
  const comments=page.locator('button.ContentItem-action').filter({hasText:/\d+\s*条评论/}).first();
  if(await comments.count()){
   await comments.click({timeout:5000});await page.waitForTimeout(1800);const commentState=await record('12-comments');
   if(commentState.error||commentState.commentCount===0)throw new Error('评论列表未实际加载，停止后续流程，避免把错误页当作成功。');
   const child=page.getByRole('button',{name:/查看.*回复|展开.*回复|\d+\s*条回复/}).first();if(await child.count()){await child.click({timeout:4000});await page.waitForTimeout(1000);await record('13-replies');}
   await page.evaluate(()=>{const candidates=[...document.querySelectorAll('div')].filter(el=>el.querySelector('.CommentContent')&&el.clientHeight>100&&el.scrollHeight>el.clientHeight+20&&/auto|scroll/.test(getComputedStyle(el).overflowY));const el=candidates.sort((a,b)=>b.scrollHeight-a.scrollHeight)[0];if(el)el.scrollTo({top:el.scrollHeight*.65,behavior:'smooth'});});await page.waitForTimeout(1800);await record('14-comment-scroll');
   const back=page.getByText('评论回复',{exact:true}).first();if(await back.isVisible().catch(()=>false)){await back.click();await page.waitForTimeout(700);}
   const latest=page.getByText('最新',{exact:true}).first();if(await latest.isVisible().catch(()=>false)){await latest.click({timeout:3000});await page.waitForTimeout(1000);await record('15-latest');}
  }
  await navigate('https://www.zhihu.com/','16-return-home');
 }catch(e){report.error=e.message;console.log('ERROR: '+e.message);process.exitCode=1;}
 finally{
  const video=page.video();await context.close();const original=await video.path();const target=path.join(videos,`full-flow-authenticated-${Date.now()}.webm`);fs.renameSync(original,target);report.video=target;fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(report,null,2));console.log('VIDEO: '+target);await browser.close();
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
