const {chromium}=require('playwright');
const fs=require('fs');const path=require('path');const assert=require('node:assert/strict');const {execFileSync}=require('node:child_process');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const current=fs.readFileSync(path.join(__dirname,'../for_ios_zhihu_desktop_mode.user.js'),'utf8');
  const previous=execFileSync('git',['show','4826279:for_ios_zhihu_desktop_mode.user.js'],{cwd:path.join(__dirname,'..'),encoding:'utf8'});
  const report=[];
  const currentVersion=current.match(/@version\s+(\S+)/)[1];
  for(const [version,script] of [['1.27',previous],[currentVersion,current]]){
   const page=await browser.newPage({viewport:{width:393,height:852}});
   await page.setContent('<html><head><meta name="theme-color" content="#555555"></head><body><div id="root"><header class="AppHeader"><div class="SearchBar"><form class="SearchBar-tool"><label class="SearchBar-input"><input></label></form></div></header><main>'+Array.from({length:400},(_,i)=>`<section><div>Article ${i}</div></section>`).join('')+'<div id="stream"></div></main></div></body></html>');
   await page.evaluate(()=>{window.rectReads=0;const native=Element.prototype.getBoundingClientRect;Element.prototype.getBoundingClientRect=function(){window.rectReads++;return native.call(this);};});
   await page.evaluate(script);await page.waitForTimeout(800);
   if(version===currentVersion){
    assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'),'#ffffff');
    assert.equal(await page.locator('html').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 255)');
    const button=await page.locator('#toggle-header-btn').boundingBox();assert(button.x>330&&button.y===8);assert.equal(await page.locator('#toggle-header-btn svg').count(),1);
   }
   await page.evaluate(()=>{window.rectReads=0;});
   for(let i=0;i<8;i++){await page.evaluate(()=>document.getElementById('stream').appendChild(document.createTextNode(' streaming text')));await page.waitForTimeout(160);}
   await page.waitForTimeout(400);const reads=await page.evaluate(()=>window.rectReads);report.push({version,layoutReadsDuringTextStream:reads});
   // Element insertion must still trigger overflow repair after text updates are ignored.
   await page.evaluate(()=>{const el=document.createElement('div');el.id='late-wrapper';el.style.cssText='width:1100px;height:60px';document.getElementById('root').appendChild(el);});await page.waitForTimeout(500);
   assert((await page.locator('#late-wrapper').boundingBox()).width<=393);await page.close();
  }
  assert(report[1].layoutReadsDuringTextStream<report[0].layoutReadsDuringTextStream);
  console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
