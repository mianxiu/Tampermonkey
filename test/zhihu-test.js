/**
 * 知乎 Tampermonkey 脚本 — Playwright 自动化测试
 *
 * 模拟 iPhone Safari 环境访问知乎页面，注入脚本后检测宽度溢出。
 * 支持 Cookie 持久化登录态 + 视频录制 + SPA 导航流程 + 多分辨率测试。
 *
 * 用法：
 *   node test/zhihu-test.js              # 多分辨率响应式测试（393/768/1024）
 *   node test/zhihu-test.js --spa        # SPA 导航流程测试
 *   node test/zhihu-test.js --video      # 录屏
 *   node test/zhihu-test.js --login      # 手动登录，保存 cookie
 *   组合: node test/zhihu-test.js --spa --video
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// ─── 配置 ────────────────────────────────────────────────
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const VIDEO_DIR     = path.join(__dirname, 'videos');
const COOKIE_FILE   = path.join(__dirname, 'cookies.json');
const USERSCRIPT_PATH = path.join(__dirname, '..', 'for_ios_zhihu_desktop_mode.user.js');

// 核心：用桌面版 UA 获取桌面版网页 → CSS 适配到手机宽度 → 没有"打开App"等干扰
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// 多分辨率测试（验证页面是否真的随视口缩放）
const RESOLUTIONS = [
  { name: 'iPhone',  width: 393, height: 852, scale: 3 },
  { name: 'iPad',    width: 768, height: 1024, scale: 2 },
  { name: 'Desktop', width: 1024, height: 768, scale: 1 },
];

const TEST_PAGES = [
  { name: 'homepage', url: 'https://www.zhihu.com' },
  { name: 'search',   url: 'https://www.zhihu.com/search?type=content&q=test' },
  { name: 'explore',  url: 'https://www.zhihu.com/explore' },
  { name: 'hot',      url: 'https://www.zhihu.com/hot' },
];
const LOGIN_PATTERNS = ['/signin', '/login', 'unable-to-sign-in'];

// ─── 反检测 ──────────────────────────────────────────────
const STEALTH_SCRIPT = `
  Object.defineProperty(navigator, 'webdriver', { get: () => false });
  window.chrome = { runtime: {}, loadTimes: function() {}, csi: function() {} };
  const orig = window.navigator.permissions.query;
  window.navigator.permissions.query = (p) =>
    p.name === 'notifications' ? Promise.resolve({ state: Notification.permission }) : orig(p);
  Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5].map(() => ({})) });
  Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN','zh','en'] });
`;

// ─── Cookie ──────────────────────────────────────────────
function loadCookies() {
  try {
    if (fs.existsSync(COOKIE_FILE)) {
      const data = fs.readFileSync(COOKIE_FILE, 'utf8');
      const arr = JSON.parse(data);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
  } catch (e) {}
  return null;
}
function saveCookies(c) {
  fs.writeFileSync(COOKIE_FILE, JSON.stringify(c, null, 2), 'utf8');
}

// ─── 工具 ────────────────────────────────────────────────
function readUserscript() {
  const raw = fs.readFileSync(USERSCRIPT_PATH, 'utf8');
  const m = raw.match(/baseCss\s*=\s*`([\s\S]*?)`;/);
  if (!m) throw new Error('无法提取 baseCss');
  return { css: m[1], full: raw };
}

async function detectOverflow(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const docSW = document.documentElement.scrollWidth;
    const has = docSW > vw;
    const overflowing = [];
    for (const el of document.querySelectorAll('*')) {
      try {
        const r = el.getBoundingClientRect();
        if (r.width < 10) continue;
        const s = window.getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden') continue;
        const over = r.right - vw;
        if (over > 5) {
          overflowing.push({
            sel: el.id ? '#'+el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.'+el.className.trim().split(/\s+/).slice(0,3).join('.') : ''),
            right: Math.round(r.right), width: Math.round(r.width),
            overflow: Math.round(over), pos: s.position,
            text: (el.textContent||'').trim().slice(0,60),
          });
        }
      } catch(e) {}
    }
    overflowing.sort((a,b) => b.overflow - a.overflow);
    return { vw, docSW, has, n: overflowing.length, top: overflowing.slice(0,10) };
  });
}

// ─── 浏览器 ──────────────────────────────────────────────
async function createBrowser(video = false, resolution = RESOLUTIONS[0]) {
  const browser = await chromium.launch({
    channel: 'msedge', headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--disable-features=IsolateOrigins,site-per-process'],
  });
  const opts = {
    viewport: { width: resolution.width, height: resolution.height },
    deviceScaleFactor: resolution.scale,
    userAgent: DESKTOP_UA, isMobile: false, hasTouch: true,
  };
  if (video) {
    fs.mkdirSync(VIDEO_DIR, { recursive: true });
    opts.recordVideo = { dir: VIDEO_DIR, size: { width: resolution.width, height: resolution.height } };
  }
  const context = await browser.newContext(opts);
  await context.addInitScript(STEALTH_SCRIPT);
  const saved = loadCookies();
  if (saved) await context.addCookies(saved);
  return { browser, context };
}

async function closeBrowser(browser, context, page, video, label) {
  let vp = '';
  if (video) {
    await context.close();
    vp = page.video() ? await page.video().path() : '';
  }
  await browser.close();
  if (vp && fs.existsSync(vp)) {
    const dest = path.join(VIDEO_DIR, label + '.webm');
    try { if (fs.existsSync(dest)) fs.unlinkSync(dest); } catch(e) {}
    try { fs.copyFileSync(vp, dest); fs.unlinkSync(vp); } catch(e) { /* keep raw */ }
    console.log('🎬 %s', dest);
  }
  // 清理任何残留的临时视频文件
  const files = fs.readdirSync(VIDEO_DIR);
  for (const f of files) {
    if (f.startsWith('page@') && f.endsWith('.webm')) {
      try { fs.unlinkSync(path.join(VIDEO_DIR, f)); } catch(e) {}
    }
  }
}

// ─── 登录 ────────────────────────────────────────────────
async function interactiveLogin() {
  console.log('\n🔐 请在浏览器窗口中登录知乎…\n');
  const browser = await chromium.launch({
    channel: 'msedge', headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });
  await context.addInitScript(STEALTH_SCRIPT);
  const page = await context.newPage();

  await page.goto('https://www.zhihu.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);
  const btn = await page.$('a[href*="signin"], button:has-text("登录")');
  if (btn) { await btn.click(); await page.waitForTimeout(2000); }
  else { await page.goto('https://www.zhihu.com/signin', { waitUntil: 'domcontentloaded', timeout: 30000 }); }

  console.log('⏳ 等待登录完成（最多3分钟）…');
  for (let i=0; i<180; i++) {
    await page.waitForTimeout(1000);
    if (!LOGIN_PATTERNS.some(p => page.url().includes(p))) {
      const ok = await page.$('.AppHeader-profile, .AppHeader-nav, [aria-label="个人中心"]').catch(()=>false);
      if (ok) break;
    }
    if (i%15===14) process.stdout.write(`  ...${i+1}s\n`);
  }
  saveCookies(await context.cookies());
  await browser.close();
  console.log('✅ 登录完成\n');
}

// ─── 多分辨率静态测试 ─────────────────────────────────────
async function runMultiRes(video = false) {
  const { css } = readUserscript();
  console.log('✅ CSS 长度: %d\n', css.length);
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  // 单一浏览器上下文，复用 → 只有1个视频
  const firstRes = RESOLUTIONS[0];
  const { browser, context } = await createBrowser(video, firstRes);
  const page = await context.newPage();
  const allResults = [];

  // 注入 JS 隐藏 Header（模拟 Tampermonkey 真实行为）
  await page.addInitScript(() => {
    window._hideZhihuHeader = () => {
      const h = document.querySelector('header.AppHeader') || document.querySelector('header[role="banner"]');
      if (h) h.style.setProperty('display', 'none', 'important');
    };
  });

  for (const res of RESOLUTIONS) {
    console.log('═══════════════════════════════════════════');
    console.log('📐 分辨率: %s (%dx%d @%dx)', res.name, res.width, res.height, res.scale);
    console.log('═══════════════════════════════════════════');

    await page.setViewportSize({ width: res.width, height: res.height });

    for (const entry of TEST_PAGES) {
      console.log('🧪 %s', entry.name);
      try {
        await page.goto(entry.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);
        await page.evaluate(() => {
          const old = document.getElementById('custom-layout-css');
          if (old) old.remove();
          if (window._hideZhihuHeader) window._hideZhihuHeader();
        });
        await page.addStyleTag({ content: css });
        await page.waitForTimeout(1000);

        const r = await detectOverflow(page);
        const icon = r.has ? '❌' : '✅';
        console.log('  %s scrollWidth=%d / viewport=%d', icon, r.docSW, r.vw);
        if (r.has && r.n > 0) {
          for (const el of r.top.slice(0, 5))
            console.log('    %s 溢出:%dpx', el.sel, el.overflow);
        }

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${entry.name}-${res.name.toLowerCase()}.png`), fullPage: false });
        allResults.push({ page: entry.name, res: res.name, overflow: r.has, n: r.n, scrollW: r.docSW, vw: r.vw });
      } catch (err) {
        console.error('  ❌ %s', err.message);
        allResults.push({ page: entry.name, res: res.name, error: err.message });
      }
      console.log('');
    }
  }

  await closeBrowser(browser, context, page, video, 'test');

  // 汇总
  console.log('\n═══════════════════════════════════════════');
  console.log('📊 多分辨率测试汇总');
  console.log('═══════════════════════════════════════════');
  const bad = allResults.filter(r => r.overflow);
  if (bad.length === 0) console.log('✅ 所有分辨率 × 所有页面 全部通过！');
  else { console.log('❌ 失败:'); for (const r of bad) console.log('  %s @ %s: scrollWidth=%d > viewport=%d', r.page, r.res, r.scrollW, r.vw); }
  process.exit(bad.length > 0 ? 1 : 0);
}

// ─── SPA 导航流程测试 ─────────────────────────────────────
async function runSPA(video = false) {
  const { css } = readUserscript();
  console.log('✅ CSS 长度: %d\n', css.length);
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  if (!loadCookies()) {
    console.log('⚠️  请先登录: node test/zhihu-test.js --login\n');
    process.exit(1);
  }

  const { browser, context } = await createBrowser(video, RESOLUTIONS[0]);
  const page = await context.newPage();
  let step = 0, failures = [];

  async function check(label, screenshot) {
    console.log('── Step %d: %s ──', ++step, label);
    // 模拟 Tampermonkey 完整注入：CSS + 隐藏 Header
    await page.evaluate((c) => {
      const old = document.getElementById('custom-layout-css');
      if (old) old.remove();
      const style = document.createElement('style');
      style.id = 'custom-layout-css';
      style.textContent = c;
      (document.head || document.documentElement).appendChild(style);
      const h = document.querySelector('header.AppHeader') || document.querySelector('header[role="banner"]');
      if (h) h.style.setProperty('display', 'none', 'important');
    }, css);
    await page.waitForTimeout(1000);
    const r = await detectOverflow(page);
    const icon = r.has ? '❌' : '✅';
    console.log('  %s scrollWidth=%d / viewport=%d', icon, r.docSW, r.vw);
    if (r.has && r.n > 0) {
      for (const el of r.top.slice(0, 3))
        console.log('     %s 溢出:%dpx', el.sel, el.overflow);
      failures.push(label);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, screenshot + '.png'), fullPage: false });
    return r;
  }

  // Step 1: 首页
  await page.goto('https://www.zhihu.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  await check('首页加载', 'spa-0-home');

  // Step 2: 点击问题
  const q = await page.$('a[href*="/question/"]');
  if (q) {
    console.log('  点击: %s', await q.getAttribute('href'));
    await q.click();
    await page.waitForTimeout(4000);
  } else {
    await page.goto('https://www.zhihu.com/question/266633366', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);
  }
  await check('问题详情页', 'spa-1-question');

  // Step 3: 展开折叠内容
  const btns = await page.$$('.RichContent-collapsedText, button:has-text("展开"), button:has-text("阅读全文"), span:has-text("展开")');
  let n = 0;
  for (const b of btns.slice(0, 5)) {
    try { if (await b.isVisible()) { await b.click(); n++; await page.waitForTimeout(800); } } catch(e) {}
  }
  console.log('  展开了 %d 个', n);
  await check('展开折叠内容', 'spa-2-expanded');

  // Step 4: 滚动到评论区
  for (const pct of [0.3, 0.6, 0.8]) {
    await page.evaluate(y => window.scrollTo(0, document.body.scrollHeight * y), pct);
    await page.waitForTimeout(1000);
  }
  await check('滚动到评论区', 'spa-3-scroll');

  // Step 5: 展开评论
  const commentBtns = await page.$$('a:has-text("评论"), a:has-text("条回复"), button:has-text("查看全部")');
  let cn = 0;
  for (const b of commentBtns.slice(0, 5)) {
    try { if (await b.isVisible()) { await b.click(); cn++; await page.waitForTimeout(1000); } } catch(e) {}
  }
  console.log('  展开了 %d 个评论入口', cn);
  await check('展开评论', 'spa-4-comments');

  // Step 6: 底部
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  await check('页面底部', 'spa-5-bottom');

  // Step 7: 返回
  await page.goBack({ timeout: 10000 }).catch(() => page.goto('https://www.zhihu.com'));
  await page.waitForTimeout(4000);
  await check('返回首页', 'spa-6-back');

  // Step 8: 搜索
  await page.goto('https://www.zhihu.com/search?type=content&q=前端开发', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);
  await check('搜索页', 'spa-7-search');

  // 汇总
  console.log('\n═══════════════════════════════════════════');
  console.log(failures.length === 0 ? '✅ SPA 流程全部通过！' : `❌ ${failures.length} 个步骤溢出`);
  console.log('═══════════════════════════════════════════\n');

  await closeBrowser(browser, context, page, video, 'spa-test');
  process.exit(failures.length > 0 ? 1 : 0);
}

// ─── 入口 ────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const video = args.includes('--video');
  if (args.includes('--login')) return interactiveLogin();
  if (args.includes('--spa'))   return runSPA(video);
  return runMultiRes(video);
}

main().catch(err => { console.error('Fatal:', err); process.exit(2); });
