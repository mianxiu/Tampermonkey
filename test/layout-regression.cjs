const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  const page = await browser.newPage({viewport:{width:393,height:852}});
  try {
    await page.setContent('<html><head></head><body><div id="root"><header class="AppHeader"><div><nav>navigation</nav><div class="SearchBar"><input placeholder="search"></div></div></header><main><section><div id="wrapper" style="width:1032px;max-width:1175px;margin-right:-630px"><div id="inner" style="width:100%;height:100px">Content</div></div></section></main></div></body></html>');
    await page.evaluate(fs.readFileSync(path.join(__dirname,'../for_ios_zhihu_desktop_mode.user.js'),'utf8'));
    await page.waitForTimeout(800);
    const layout = () => page.evaluate(() => ({outer:document.getElementById('wrapper').getBoundingClientRect().width, innerMax:document.getElementById('inner').style.maxWidth, max:document.getElementById('wrapper').style.maxWidth, margin:document.getElementById('wrapper').style.marginRight, visible:document.documentElement.hasAttribute('data-zhihu-header-visible')}));
    let state = await layout();
    assert(state.outer <=393);
    assert.equal(state.innerMax, '', 'Outer repair must avoid redundant inner mutation');
    await page.setViewportSize({width:768,height:852});
    await page.waitForTimeout(600);
    state=await layout();
    assert(state.outer>700 && state.outer<=768, 'Width must grow after rotation');
    await page.setViewportSize({width:1400,height:852});
    await page.waitForTimeout(600);
    state=await layout();
    assert.equal(state.outer,1032);
    assert.equal(state.max,'1175px');
    assert.equal(state.margin,'-630px', 'Restore original inline declarations');
    await page.evaluate(() => {
      const topics = document.createElement('div');
      topics.className = 'QuestionHeader-topics';
      topics.innerHTML = '<div class="Tag" data-za-detail-view-path-module="Topic">明星</div><div class="Tag" data-za-detail-view-path-module="Topic">演员</div>';
      document.getElementById('root').appendChild(topics);
    });
    const tags = await page.locator('.QuestionHeader-topics .Tag').evaluateAll(els=>els.map(el=>({width:el.getBoundingClientRect().width,top:el.getBoundingClientRect().top})));
    assert(tags.every(t=>t.width<100), 'Topic pills must not become full-width rows');
    assert.equal(tags[0].top,tags[1].top);
    await page.locator('#toggle-header-btn').click();
    await page.waitForTimeout(650);
    assert.equal((await layout()).visible,true);
    assert(await page.locator('.SearchBar input').isVisible());
    await page.locator('#toggle-header-btn').dblclick();
    await page.waitForTimeout(650);
    assert.equal((await layout()).visible,true, 'Double click must not toggle Header');
    assert.equal(await page.locator('#zhihu-diag-panel').count(),1);
    await page.evaluate(()=>{const el=document.createElement('div');el.id='new-overflow';el.style.cssText='position:absolute;left:1500px;width:50px;height:20px';document.body.appendChild(el);window.__diagnoseOverflow();});
    assert.equal(await page.locator('#zhihu-diag-panel').count(),1);
    assert((await page.locator('#zhihu-diag-panel').innerText()).includes('new-overflow'), 'Reopening diagnostic must refresh snapshot');
    await page.evaluate(() => {
      const fixture = document.createElement('section');
      fixture.innerHTML = '<div class="CommentContent">Existing comment remains readable</div><div id="composer"><img class="Avatar"><div><div class="InputLike Editable"><span class="public-DraftEditorPlaceholder-inner">理性发言，友善互动</span><div contenteditable="true"></div></div><button>发布</button></div></div><div id="ai-input" class="InputLike Editable"><span class="public-DraftEditorPlaceholder-inner">继续追问</span><div contenteditable="true"></div></div><textarea class="CommentInput" placeholder="回复作者"></textarea>';
      document.body.appendChild(fixture);
    });
    await page.waitForTimeout(500);
    assert.equal(await page.locator('#composer').isVisible(), false, 'SPA composer including avatar and toolbar must be hidden');
    assert.equal(await page.locator('.CommentInput').isVisible(), false);
    assert.equal(await page.locator('.CommentContent').isVisible(), true);
    assert.equal(await page.locator('#ai-input').isVisible(), true, 'AI follow-up must remain usable');
    assert.equal(await page.locator('#composer button').isDisabled(), true);
    console.log('PASS: layout, Header, diagnostics, dynamic comment composers, preserved comments and AI input');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
