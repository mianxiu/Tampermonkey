const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const script = fs.readFileSync(path.join(__dirname, '../for_ios_zhihu_desktop_mode.user.js'), 'utf8');
const output = path.join(__dirname, 'screenshots', process.argv.includes('--fixed') ? 'audit-fixed' : 'audit');
fs.mkdirSync(output, { recursive: true });
const pages = [
  ['home', 'https://www.zhihu.com/'],
  ['search', 'https://www.zhihu.com/search?type=content&q=前端开发'],
  ['explore', 'https://www.zhihu.com/explore'],
  ['hot', 'https://www.zhihu.com/hot'],
  ['question', 'https://www.zhihu.com/question/266633366'],
];
async function inspect(page) {
  return page.evaluate(() => {
    const vw = innerWidth;
    const overflow = [...document.querySelectorAll('div,section,main,article,table,ul,ol')].map(el => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return { selector: el.tagName + '.' + el.className, left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), height: Math.round(r.height), overflow: Math.round(r.right - vw), position: s.position, text: el.innerText?.slice(0, 100) };
    }).filter(r => r.width > 30 && r.height > 0 && r.overflow > 5).sort((a,b) => b.overflow - a.overflow);
    const selectors = ['.Topstory-mainColumn', '.SearchResult-main', '.ExploreHomePage', '.HotItem', '.QuestionHeader', '.AnswerItem', '.RichContent-collapsedText', '.ContentItem-action'];
    const elements = Object.fromEntries(selectors.map(sel => [sel, {total: document.querySelectorAll(sel).length, visible: [...document.querySelectorAll(sel)].filter(el => el.getBoundingClientRect().height > 0).length}]));
    return { url: location.href, title: document.title, vw, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, css: !!document.getElementById('custom-layout-css'), button: !!document.getElementById('toggle-header-btn'), viewport: document.querySelector('meta[name=viewport]')?.content, bodyText: document.body?.innerText.slice(0, 1200), overflowCount: overflow.length, overflow: overflow.slice(0, 12), elements, links: [...document.querySelectorAll('a[href*="/question/"]')].map(a=>a.href).slice(0, 8) };
  });
}
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: !process.argv.includes('--headed') });
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36', hasTouch: true });
  const cookieFile = path.join(__dirname, 'cookies.json');
  if (fs.existsSync(cookieFile)) await context.addCookies(JSON.parse(fs.readFileSync(cookieFile, 'utf8')));
  // At init-script time Chromium can have no documentElement yet. Run at the
  // first root insertion, retaining document-start timing before page content.
  await context.addInitScript({ content: `(() => { const run = () => { ${script}\n }; if(document.documentElement) run(); else { const o = new MutationObserver(() => { if(document.documentElement) { o.disconnect(); run(); } }); o.observe(document, {childList:true}); } })();` });
  const results = [];
  const page = await context.newPage();
  let errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    for (const width of (process.argv.includes('--interactions') ? [] : [393, 768, 1024])) {
      await page.setViewportSize({width, height:852});
      for (const [name, url] of pages) {
        errors = [];
        const row = {name, width};
        try {
          const response = await page.goto(url, {waitUntil:'domcontentloaded', timeout:25000});
          row.status = response?.status();
          await page.waitForTimeout(3500);
          row.initial = await inspect(page);
          await page.screenshot({path:path.join(output, `${name}-${width}.png`)});
          if (width === 393 && row.initial.button) {
            await page.locator('#toggle-header-btn').click();
            await page.waitForTimeout(650);
            row.headerAfterToggle = await page.evaluate(() => {
              const h = document.querySelector('header.AppHeader,header[role=banner]');
              return h ? { display:getComputedStyle(h).display, height:h.getBoundingClientRect().height, visibleChildren:[...h.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().height>0).length, childCount:h.querySelectorAll('*').length } : null;
            });
            await page.screenshot({path:path.join(output, `${name}-${width}-header.png`)});
            await page.locator('#toggle-header-btn').click();
            await page.waitForTimeout(650);
            await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.65));
            await page.waitForTimeout(1200);
            row.scrolled = await inspect(page);
            await page.screenshot({path:path.join(output, `${name}-${width}-scroll.png`)});
            await page.evaluate(() => window.scrollTo(0, 0));
          }
        } catch(e) { row.error=e.message; }
        row.errors = errors.slice(0, 8);
        results.push(row);
        fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results,null,2));
        console.log(JSON.stringify({name,width,status:row.status,url:row.initial?.url,title:row.initial?.title,sw:row.initial?.scrollWidth,overflow:row.initial?.overflowCount,css:row.initial?.css,button:row.initial?.button,header:row.headerAfterToggle,error:row.error,errors:row.errors}));
      }
    }
    if (process.argv.includes('--interactions')) {
      await page.setViewportSize({width:393,height:852});
      await page.goto(pages[0][1], {waitUntil:'domcontentloaded'});
      await page.waitForTimeout(3500);
      const interaction = {home:await inspect(page)};
      const expand = page.getByText('阅读全文', {exact:false}).first();
      try { await expand.click({timeout:4000}); await page.waitForTimeout(1000); interaction.expanded = await inspect(page); } catch(e) {interaction.expandError=e.message;}
      const link = page.locator('a[href*="/question/"]').first();
      interaction.target = await link.getAttribute('href');
      try { await link.click({timeout:5000}); await page.waitForTimeout(4000); interaction.afterClick=await inspect(page); await page.screenshot({path:path.join(output,'answer-click-393.png')}); } catch(e) {interaction.clickError=e.message;}
      interaction.openedTabs = [];
      for (const tab of context.pages().filter(tab => tab !== page)) {
        await tab.waitForLoadState('domcontentloaded', {timeout:10000}).catch(()=>{});
        interaction.openedTabs.push(await inspect(tab));
        await tab.screenshot({path:path.join(output,`answer-popup-${interaction.openedTabs.length}.png`)});
      }
      if (interaction.afterClick?.url === interaction.home.url && interaction.target) {
        await page.goto(new URL(interaction.target, 'https://www.zhihu.com').href, {waitUntil:'domcontentloaded'});
        await page.waitForTimeout(2500);
        interaction.directAnswer=await inspect(page);
      }
      await page.goto(pages[2][1], {waitUntil:'domcontentloaded'});
      await page.waitForTimeout(2500);
      await page.locator('.ExploreSpecialCard-header').first().scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(output,'explore-special-393.png')});
      interaction.special = await page.locator('.ExploreSpecialCard-header').first().evaluate(el => ({html:el.outerHTML.slice(0,5000), rect:el.getBoundingClientRect().toJSON(), followRect:el.querySelector('.ExploreSpecialCard-followButton')?.getBoundingClientRect().toJSON()}));
      await page.evaluate(() => window.__diagnoseOverflow());
      interaction.diagnostic = await page.locator('#zhihu-diag-panel').innerText();
      await page.evaluate(() => window.__diagnoseOverflow());
      interaction.diagnosticPanels = await page.locator('#zhihu-diag-panel').count();
      await page.locator('#diag-btn-close').click();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(400);
      await page.locator('#toggle-header-btn').click();
      await page.waitForTimeout(700);
      interaction.header = await page.evaluate(() => {
        const h=document.querySelector('header.AppHeader, header[role=banner]');
        const input=h?.querySelector('input');
        return {height:h?.getBoundingClientRect().height, input:input?.getBoundingClientRect().toJSON()};
      });
      await page.screenshot({path:path.join(output,'header-search-393.png')});
      const state = await page.evaluate(() => document.documentElement.hasAttribute('data-zhihu-header-visible'));
      await page.locator('#toggle-header-btn').dblclick();
      await page.waitForTimeout(700);
      interaction.doubleClickPreservesHeader = state === await page.evaluate(() => document.documentElement.hasAttribute('data-zhihu-header-visible'));
      fs.writeFileSync(path.join(output,'interactions.json'),JSON.stringify(interaction,null,2));
      console.log(JSON.stringify({home:interaction.home.url,afterClick:interaction.afterClick?.url,openedTabs:interaction.openedTabs.map(t=>({url:t.url,title:t.title,question:t.elements['.QuestionHeader'],text:t.bodyText?.slice(0,120)})),directAnswer:interaction.directAnswer?.bodyText?.slice(0,120),special:interaction.special.rect,follow:interaction.special.followRect,header:interaction.header,diagnosticPanels:interaction.diagnosticPanels,doubleClickPreservesHeader:interaction.doubleClickPreservesHeader}));
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
