const {chromium}=require('playwright');
const fs=require('fs');
const path=require('path');
const out=path.join(__dirname,'screenshots',process.argv.includes('--public')?'comments-public':'comments-audit');
fs.mkdirSync(out,{recursive:true});
const script=fs.readFileSync(path.join(__dirname,'../for_ios_zhihu_desktop_mode.user.js'),'utf8');
const harness=fs.readFileSync(path.join(__dirname,'zhihu-test.js'),'utf8');
const stealth=harness.match(/const STEALTH_SCRIPT = `([\s\S]*?)`;/)[1];
const safetyCss='textarea,[contenteditable],[role="textbox"],.Editable,.CommentEditor,.CommentEditorV2,.CommentInput,.CommentsV2-footer,input[placeholder*="评论"],input[placeholder*="回复"],[data-comment-test-composer]{display:none!important;pointer-events:none!important}';
const videoEnabled=process.argv.includes('--video');
const mobileOnly=process.argv.includes('--mobile');
const videoDir=path.join(__dirname,'videos');
const authFile=path.join(__dirname,'auth-state.json');
if(videoEnabled)fs.mkdirSync(videoDir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:false});
 const context=await browser.newContext({viewport:{width:393,height:852},userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',hasTouch:true,...(fs.existsSync(authFile)?{storageState:authFile}:{}),...(videoEnabled?{recordVideo:{dir:videoDir,size:{width:mobileOnly?393:1024,height:852}}}:{})});
 const report={blockedWrites:[],reads:[],steps:[]};
 // Fail closed: no mutation request from this test can reach any server.
 await context.route('**/*',async route=>{
   const req=route.request();
   if(!['GET','HEAD','OPTIONS'].includes(req.method())){
     report.blockedWrites.push({method:req.method(),url:req.url().split('?')[0]});
     return route.abort('blockedbyclient');
   }
   return route.continue();
 });
 context.on('response',r=>{if(/comment|reply/i.test(r.url()))report.reads.push({url:r.url(),status:r.status()});});
 if(!fs.existsSync(authFile))await context.addCookies(JSON.parse(fs.readFileSync(path.join(__dirname,'cookies.json'),'utf8')));
 await context.addInitScript({content:stealth});
 await context.addInitScript({content:`(()=>{const run=()=>{${script}\nconst s=document.createElement('style');s.id='comment-test-safety';s.textContent=${JSON.stringify(safetyCss)};(document.head||document.documentElement).appendChild(s);
 const shield=()=>{for(const editor of document.querySelectorAll('textarea,[contenteditable],[role="textbox"],.Editable')){for(let el=editor.parentElement,depth=0;el&&depth<5;el=el.parentElement,depth++){if([...el.querySelectorAll('button')].some(b=>/^(发布|发送)$/.test(b.textContent.trim()))){el.setAttribute('data-comment-test-composer','');break;}}} for(const b of document.querySelectorAll('button')){if(/^(发布|发送)$/.test(b.textContent.trim())){b.disabled=true;b.style.setProperty('display','none','important');}}};
 const protection=new MutationObserver(shield);protection.observe(document.documentElement,{childList:true,subtree:true});shield();
 };if(document.documentElement)run();else{const o=new MutationObserver(()=>{if(document.documentElement){o.disconnect();run();}});o.observe(document,{childList:true});}})();`});
 const page=await context.newPage();
 async function record(label){
   const state=await page.evaluate(()=>{
     const seen=new Set();const parts=[];
     for(const el of document.querySelectorAll('[class*="Comment"], [role="dialog"]')){
       const r=el.getBoundingClientRect();if(r.width<30||r.height<5)continue;
       const cls=typeof el.className==='string'?el.className:'';
       if(seen.has(cls))continue;seen.add(cls);
       parts.push({cls,rect:r.toJSON(),display:getComputedStyle(el).display,overflow:Math.round(r.right-innerWidth),text:el.innerText?.slice(0,180)});
     }
     const overflow=[...document.querySelectorAll('div,section,main,article,ul,ol')].map(el=>{const r=el.getBoundingClientRect();return {cls:el.className,left:r.left,right:r.right,width:r.width,height:r.height};}).filter(r=>r.width>30&&r.height>5&&r.right>innerWidth+5);
     return {url:location.href,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,parts,overflow,visibleEditors:[...document.querySelectorAll('textarea,[contenteditable],input[placeholder*="评论"],input[placeholder*="回复"]')].filter(el=>el.getBoundingClientRect().height>0).length,buttons:[...document.querySelectorAll('button')].filter(e=>e.getBoundingClientRect().height>0&&/评论|回复|最新|热门|排序/.test(e.innerText)).map(e=>({text:e.innerText,cls:e.className})).slice(0,35),body:document.body.innerText.slice(0,150)};
   });
   report.steps.push({label,...state});
   await page.screenshot({path:path.join(out,label+'.png')});
   fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));
   console.log(JSON.stringify({label,width:state.width,sw:state.scrollWidth,visibleEditors:state.visibleEditors,overflow:state.overflow.length,commentParts:state.parts.length}));
   if(videoEnabled)await page.waitForTimeout(1200);
   return state;
 }
 try{
   await page.goto(process.argv.includes('--public')?'https://www.zhihu.com/question/264101948/answer/3596981236':'https://www.zhihu.com/',{waitUntil:'domcontentloaded',timeout:30000});await page.waitForTimeout(3500);
   const initial=await record('home');
   const close=page.locator('.Modal-closeButton').first();
   if(await close.isVisible().catch(()=>false)){await close.click();await page.waitForTimeout(500);}
   if(videoEnabled)await record('answer-ready');
   const entry=page.locator('button.ContentItem-action').filter({hasText:/\d+\s*条评论/}).first();
   if(!await entry.count())throw new Error('没有找到带评论数量的入口；未将错误页判定为通过。');
   report.entry=await entry.innerText();await entry.click({timeout:5000});await page.waitForTimeout(2500);
   const opened=await record('comments-393');
   if(!opened.parts.some(p=>/CommentList|CommentItem|CommentContent|CommentsV2|Comments-container/i.test(p.cls)))throw new Error('评论列表未实际加载；可能需要重新登录。');
   const replies=page.getByRole('button',{name:/查看.*回复|展开.*回复|\d+\s*条回复/}).first();
   if(await replies.count()) {report.replyEntry=await replies.innerText();await replies.click({timeout:4000});await page.waitForTimeout(1800);await record('replies-393');}
   // Scroll the comment list itself when it owns scrolling, otherwise the page.
   report.scrolled=await page.evaluate(()=>{
     const candidates=[...document.querySelectorAll('div')].filter(el=>el.querySelector('.CommentContent')&&el.clientHeight>100&&el.scrollHeight>el.clientHeight+20&&/auto|scroll/.test(getComputedStyle(el).overflowY));
     const el=candidates.sort((a,b)=>b.scrollHeight-a.scrollHeight)[0];
     if(el){el.scrollTop=el.scrollHeight*.65;return {cls:el.className,top:el.scrollTop};}
     window.scrollBy(0,650);return {cls:'window',top:scrollY};
   });
   await page.waitForTimeout(1800);await record('comments-scrolled-393');
   for(const width of (mobileOnly?[]:[768,1024])){await page.setViewportSize({width,height:852});await page.waitForTimeout(900);await record('comments-'+width);}
   await page.setViewportSize({width:393,height:852});await page.waitForTimeout(500);
   const back=page.getByText('评论回复',{exact:true}).first();
   if(await back.isVisible().catch(()=>false)){await back.click();await page.waitForTimeout(700);}
   const latest=page.getByText('最新',{exact:true}).first();
   if(await latest.isVisible().catch(()=>false)){
     report.latestHitTarget=await latest.evaluate(el=>{const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {target:el.className,hit:hit?.id||hit?.className};});
     try{await latest.click({timeout:2500});await page.waitForTimeout(1500);await record('latest-393');}catch(e){report.latestError=e.message;console.log('Latest sorting click blocked: '+JSON.stringify(report.latestHitTarget));}
   }
 }catch(e){report.error=e.message;console.log('ERROR: '+e.message);process.exitCode=1;}
 finally{
   const video=page.video();
   await context.close();
   if(video){
     const original=await video.path();
     const target=path.join(videoDir,`comments-readonly-${Date.now()}.webm`);
     fs.renameSync(original,target);
     report.video=target;
     console.log('VIDEO: '+target);
   }
   fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));
   await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
