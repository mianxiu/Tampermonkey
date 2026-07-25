// ==UserScript==
// @name         知乎全站自适应
// @namespace    http://tampermonkey.net/
// @version      1.22
// @description  桌面版网页适配手机宽度。修复答案页 CSS-in-JS 容器宽度溢出（结构选择器拦截 hash class wrapper）
// @author       mianxiu
// @match        *://*.zhihu.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 默认隐藏 Header
    let isHeaderHidden = true;

    // 1. 核心布局 CSS
    const baseCss = `

        /* --- 全局基础 --- */
        html, body, #root {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            /* 用 clip 而非 hidden：hidden 会把 overflow-y 逼成 auto，凭空多一条纵向滚动条 */
            overflow-x: clip !important;
        }
        *, *::before, *::after {
            box-sizing: border-box !important;
        }

        /* 所有媒体元素限制最大宽度 */
        img, svg, video, iframe, canvas, figure {
            max-width: 100% !important;
            height: auto !important;
        }

        /* Header 宽度约束（即便 JS 还没隐藏） */
        header.AppHeader,
        header[role="banner"] {
            width: 100% !important;
            min-width: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
            overflow: hidden !important;
        }

        body{
        background:white!important;
        }
        /* --- 全局宽度自适应与去侧边栏 --- */
        /* ════════════════════════════════════════════════════════ */
        /*  拦截 CSS-in-JS 布局容器（知乎新架构生成的 hash class wrapper） */
        /*  这些 div 有固定宽度（1000px~1175px）、负 margin 等桌面版设置， */
        /*  由于 class 名是动态 hash，无法用类名精准选择。 */
        /*  用 #root 子级结构选择器，仅匹配最多 5-10 个元素，不影响性能。*/
        /* ════════════════════════════════════════════════════════ */
        #root > div > div {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            margin-left: auto !important;
            margin-right: auto !important;
            box-sizing: border-box !important;
        }
        #root > div > div > div {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            box-sizing: border-box !important;
        }

        /* 隐藏首页、问题页、搜索页侧边栏 */
        .GlobalSideBar,
        .Question-sideColumn,
        div[data-za-detail-view-path-module="RightSideBar"],
        .SearchSideBar {
            display: none !important;
        }

        .QuestionHeader-main{
            display: flex !important;
            flex-direction: column;
            width: 100% !important;

        }

        /* 强制主容器撑满：适配首页、问题页、搜索页 */

        /* 页面所有主要容器填满视口 */
        #root > div,
        #root > div > main,
        #root .App-main,
        #root .Topstory,
        .App,
        main[role="main"],
        .Topstory-container,
        .Topstory-mainColumn,
        .Topstory-mainColumnCard,
        .Question-main,
        .Question-mainColumn,
        .Search-container,
        .SearchResult-main,
        .SearchMain {
            width: 100% !important;
            max-width: 100% !important;
            min-width: auto !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
        }

        .Topstory-container,
        .Question-main,
        .Search-container,
        .SearchResult-main
        {
            display: flex !important;
        }
.QuestionRichText.QuestionRichText--expandable,
.QuestionHeader-title,
.QuestionHeader-topics,
.LabelContainer-wrapper{
padding-left:20px;
}
        .Question-main{
        padding:0!important;
        }
        .QuestionHeader-footer-main{
        flex-direction: row;
        min-width:100%!important;
        }
        .QuestionHeader-main{
        padding-right:20px;
        padding-left:0px!important;
        }
        .QuestionHeader{
        min-width:100%!important;
        }
        .QuestionRichText--expandable.QuestionRichText--collapsed{
        max-height:100%!important;
        padding-left:20px;
        }

        /* --- 发现页(Explore)宽度修复 --- */
        .ExploreHomePage,
        .ExploreHomePage-square,
        #guestSquare,
        #special,
        .ExploreHomePage-ContentSection,
        .ExploreHomePage-ContentSection-header,
        .ExploreHomePage-ContentSection-body,
        .ExploreHomePage-ContentSection-moreButton,
        .ExploreRoundtableCard,
        .ExploreRoundtableCard-questionItem,
        .ExploreRoundtableCard-questionTitle,
        .ExploreRoundtableCard-questionCounts,
        .ExploreRoundtableCard-headerBackgrounds,
        .ExploreSpecialCard,
        .ExploreSpecialCard-banner,
        .ExploreSpecialCard-contentItem,
        .ExploreSpecialCard-contentTitle,
        .ExploreSpecialCard-header,
        .ExploreCollectionCard,
        .ExploreCollectionCard-contentItem,
        .ExploreCollectionCard-contentTitle,
        .ExploreCollectionCard-contentExcerpt,
        .ExploreCollectionCard-contentTags,
        .ExploreFollowButton,
        .ExploreHeader,
        .ExploreColumnCard,
        .ExploreColumnCard-avatar,
        .ExploreColumnCard-title,
        .ExploreColumnCard-count,
        .ExploreColumnCard-intro,
        .ExploreColumnCard-entryButton,
        .ExploreSpecialCard-followButton {
            width: 100% !important;
            max-width: 100% !important;
            min-width: auto !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
        }

        /*搜索页*/
        .Card{
        box-shadow:none!important;
        }
        .RichContent.is-collapsed .RichContent-inner{
        max-height:100%!important;
        }
        .RichContent-inner,
        .ContentItem-title{
        margin-bottom:10px;
        }
        .RichContent-cover,
        .HotLanding-contentItemCountWithoutSub
        {
        padding-left:10px;
        }
        .HotLanding-title{
         padding:10px;
        }
        .List{
        padding:20px;
        }
        .ContentItem-time{
        margin-bottom:10px;
        }
.List-item{
padding:0px!important;
margin-bottom:20px!important;
}
.RichContent-cover-inner.RichContent-cover--normal{
left:auto!important;
}
.ContentItem-actions{
padding:0px!important;
margin:0!important;
}
.HotLanding-contentItem:not(:last-child){
padding-bottom:5px!important;
}
.HotLanding-content{
border:none!important;
padding-left:0px!important;
}
.RichContent-cover{
width:100px!important;
}
/* 热榜封面图：全局 height:auto 会让各图按原始比例高低不一，高图溢出行高盖住下一条。
   固定尺寸 + object-fit:cover 统一高度，消除重叠 */
.HotItem-img,
.HotItem-img img{
width:100px!important;
height:70px!important;
max-width:100px!important;
max-height:70px!important;
flex:none!important;
object-fit:cover!important;
}
.HotItem{
align-items:flex-start!important;
}
/* 热榜摘要冗长且与底部"热度/分享"绝对定位栏重叠，列表只保留标题+热度更清爽 */
.HotItem-excerpt{
display:none!important;
}
/* 让热度/分享栏回归正常文档流，不再绝对定位盖住上方内容 */
.HotItem-metrics.HotItem-metrics--bottom{
position:static!important;
margin-top:6px!important;
flex-wrap:nowrap!important;
white-space:nowrap!important;
}
.HotItem-metrics.HotItem-metrics--bottom>*{
flex:none!important;
white-space:nowrap!important;
}
.HotItem-content{
padding-bottom:0!important;
}

/* --- 答案/问题正文防溢出 & SPA flex 容器收缩 --- */
/* flex 子元素默认 min-width:auto 阻止收缩，改为 0 允许内容适配视口 */
.Question-mainColumn,
.Topstory-mainColumn,
.SearchResult-main,
.SearchMain,
.Question-main {
    min-width: 0 !important;
}
/* 正文内容强制换行，防止 pre/code/长链接撑破容器 */
.RichContent,
.QuestionRichText,
.AnswerItem-content,
[class*="AnswerItem"] {
    overflow-wrap: break-word !important;
    word-wrap: break-word !important;
    min-width: 0 !important;
}
.RichContent pre,
.RichContent code,
.QuestionRichText pre,
.QuestionRichText code {
    white-space: pre-wrap !important;
    word-break: break-all !important;
    max-width: 100% !important;
}
.RichContent table,
.QuestionRichText table {
    display: block !important;
    max-width: 100% !important;
    overflow-x: auto !important;
}
/* 答案项本身也要允许收缩 */
.AnswerItem,
.ContentItem {
    min-width: 0 !important;
    max-width: 100% !important;
}
        .Card.SearchResult-Card{
        margin-bottom:0!important;
        width:100%;
        }

        .Card.SearchResult-Card>.List-item,
        #SearchMain{
        width:100%!important;
        }

        /* 内容列占据全部宽度 */
        .App-main,
        .AppHeader,
        .Topstory,
        .Topstory-mainColumnCard,
        div[data-za-detail-view-path-module],
        div[style="opacity: 1; transform: none;"],
.QuestionHeader-footer-inner,
        .Topstory-mainColumn,
        .Question-mainColumn,
        .SearchResult-main,
        .Question-main,
        .QuestionHeader-content {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
        }

        /* --- 隐藏无关元素 --- */
        /* Header 相关 */
        header.AppHeader,
        header.AppHeader *,
        header[role="banner"],
        header[role="banner"] *,
        .AppHeader,
        .AppHeader *,
        /* 导航栏 */
        .AppHeader-nav, .AppHeader-tabs, .AppHeader-profile, .AppHeader-options,
        .AppHeader-inner, .AppHeader-title,
        nav[class*="AppHeader"], div[class*="AppHeader"],
        /* 写回答/文章按钮 */
        .WriteArea, .WriteArea-btn,
        [class*="WriteArea"],
        /* 侧边栏 */
        .GlobalSideBar, .GlobalSideBar *,
        .Question-sideColumn, .Question-sideColumn *,
        [class*="SideBar"], [class*="Sidebar"],
        div[data-za-detail-view-path-module="RightSideBar"],
        /* 关注/收藏/喜欢/更多按钮 */
        button[aria-label="关注"], button[aria-label="收藏"],
        button[aria-label="喜欢"], button[aria-label="更多"],
        button[aria-label="分享"], button[aria-label="举报"],
        button[data-tooltip="解释这篇内容"],
        /* 问题页无关 */
        .GoodQuestionAction, .QuestionHeader-Comment,
        .QuestionHeader-side, .QuestionHeader-footer>*:not(.QuestionHeader-footer-inner),
        #root .QuestionHeader-footer button,
        /* 热榜无关 */
        .HotLanding-ListTitle, .HotLanding-contentItemCountWithoutSub,
        .HotLanding-contentItem:not(:last-child),
        /* 搜索页无关 */
        .SearchTabs, .SearchTabs-link,
        /* Link card 等 */
        [class*="RichContent-collapsedText"],
        [class*="OpenInApp"], [class*="open-in-app"],
        [class*="AppBanner"], [class*="app-banner"],
        [class*="DownloadApp"], [class*="download-app"],
        /* 底部推荐/广告 */
        [class*="RelatedCommodity"], [class*="Advert"],
        [class*="CardLink"], [class*="GoodsCard"],
        /* 运营位 */
        [class*="Operation"], [class*="Banner"], [class*="Promotion"] {
            display: none !important;
        }
        /* 保留点赞/评论/收藏等基本操作 */
        .ContentItem-action {
            display: inline-flex !important;
        }

        .ContentItem-action{
        margin-left:12px!important;
        }

        #root a[data-draft-type="link-card"]{
        width:100%!important;
        }

        /* --- 修正作者信息勋章超出 body 的问题 --- */
        .AuthorInfo-badge,
        .AuthorInfo-content,
        .AuthorInfo {
            max-width: 100% !important;
            box-sizing: border-box !important;
            overflow: hidden !important; /* 防止内容溢出 */

        }
        .AnswerItem-authorInfo{
        padding:10px 0px;
        }

        .AuthorInfo-badge {
            display: inline-flex !important;
            align-items: center;
            white-space: nowrap; /* 强制不换行，配合 ellipsis 使用 */
            text-overflow: ellipsis; /* 超出部分显示省略号 */
        }

        /* 作者名、用户链接等 span 溢出修复 */
        .AuthorInfo-name,
        .UserLink,
        .UserLink-link,
        [class*="AuthorInfo"] span {
            display: inline-block !important;
            max-width: 100% !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            vertical-align: middle !important;
        }

        /* 针对勋章内部文字的限制 */
        .AuthorInfo-badgeText {
            max-width: 200px !important; /* 限制勋章文字最大宽度，防止撑开 */
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
        }

        /* 确保父容器也具有响应式宽度 */
        .AuthorInfo-main {
            flex: 1 !important;
            min-width: 0 !important; /* 关键：允许 flex 子元素缩小至小于其内容宽度 */
        }

        /* 搜索框修正 */
        #root div.Popover label.SearchBar-input,
        #root div.Popover > label.SearchBar-input {
            margin-left: 0px !important;
            width: 100% !important;
        }

        #root > div > div[class*="css-"] > header > div {
            margin-left: 0px !important;
        }

        /* --- 隐藏变动的 Placeholder --- */
        input::-webkit-input-placeholder,
        input::placeholder {
            color: transparent !important;
        }

        /* --- 悬浮按钮样式 --- */
        #toggle-header-btn {
            position: fixed;
            top: 10px;
            right: 30px;
            width: 44px;
            height: 44px;
            background: #8590a6;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 2147483647;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            font-size: 18px;
            opacity: 0.2;
            transition: all 0.3s;
            user-select: none;
        }
    `;

    // 2. 强力修改 Header 显示属性
    function applyHeaderDisplay() {
        const header = document.querySelector('header.AppHeader') || document.querySelector('header[role="banner"]');
        if (header) {
            if (isHeaderHidden) {
                header.style.setProperty('display', 'none', 'important');
            } else {
                header.style.setProperty('display', 'block', 'important');
                header.style.setProperty('width', '100%', 'important');
            }
        }

        // 隐藏搜索框占位符文字的 JS 补丁（针对动态赋值）
        const input = document.querySelector('.SearchBar-input input');
        if (input && input.placeholder !== "") {
            input.placeholder = "";
        }
    }

    // 3. 强制 viewport meta：让布局视口 = 设备宽度，配合 CSS 的 width:100%
    //    （SPA 切换或桌面版模板可能没有/替换此 meta，需要持续兜底）
    const VIEWPORT_CONTENT = 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover';
    const enforceViewport = () => {
        let vp = document.querySelector('meta[name="viewport"]');
        if (!vp) {
            vp = document.createElement('meta');
            vp.setAttribute('name', 'viewport');
            (document.head || document.documentElement).appendChild(vp);
        }
        if (vp.getAttribute('content') !== VIEWPORT_CONTENT) {
            vp.setAttribute('content', VIEWPORT_CONTENT);
        }
    };

    // 3b. 注入 CSS（强制覆盖，应对 SPA 切换时 <head> 被替换）
    const injectCss = () => {
        // 先移除旧的（可能已被 SPA 清理但残留）
        const old = document.getElementById('custom-layout-css');
        if (old) old.remove();

        const style = document.createElement('style');
        style.id = 'custom-layout-css';
        style.textContent = baseCss;
        (document.head || document.documentElement).appendChild(style);
        enforceViewport();
    };

    // 4. 创建按钮
    const btn = document.createElement('div');
    btn.id = 'toggle-header-btn';
    btn.innerHTML = 'H';

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        isHeaderHidden = !isHeaderHidden;
        btn.innerHTML = isHeaderHidden ? '💊' : 'H';
        btn.style.background = isHeaderHidden ? '#8590a6' : '#0084ff';
        applyHeaderDisplay();
    });

    // 真机诊断：双击悬浮按钮，直接在当前页面显示诊断面板（无需外接 Mac/Safari）
    btn.addEventListener('dblclick', (e) => {
        e.preventDefault();
        showDiagnosticPanel();
    });

    // 初始化执行
    injectCss();

    const init = () => {
        if (!document.body.contains(btn)) {
            document.body.appendChild(btn);
        }
        enforceViewport();
        applyHeaderDisplay();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 5. 溢出诊断（双击悬浮按钮弹出面板 + 可下载 JSON / 复制）
    const showDiagnosticPanel = () => {
        // 如果面板已存在，切换显示
        const existing = document.getElementById('zhihu-diag-panel');
        if (existing) {
            existing.style.display = existing.style.display === 'none' ? 'block' : 'none';
            return;
        }

        const vw = window.innerWidth;
        const de = document.documentElement;
        const vp = document.querySelector('meta[name="viewport"]');

        // ── 扫描溢出元素（完整 CSS 属性，用于 JSON 导出） ──
        const found = [];
        for (const el of document.querySelectorAll('*')) {
            const r = el.getBoundingClientRect();
            if (r.width > 30 && r.right > vw + 1) {
                const s = getComputedStyle(el);
                found.push({
                    sel: el.tagName.toLowerCase()
                        + (el.id ? '#' + el.id : '')
                        + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 6).join('.') : ''),
                    tag: el.tagName.toLowerCase(),
                    id: el.id || null,
                    classes: typeof el.className === 'string' ? el.className.trim() : '',
                    rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) },
                    overflow: Math.round(r.right - vw),
                    css: {
                        display: s.display, position: s.position, float: s.float,
                        width: s.width, minWidth: s.minWidth, maxWidth: s.maxWidth,
                        height: s.height, minHeight: s.minHeight, maxHeight: s.maxHeight,
                        margin: s.margin, padding: s.padding,
                        boxSizing: s.boxSizing,
                        overflowX: s.overflowX, overflowY: s.overflowY,
                        overflowWrap: s.overflowWrap, wordBreak: s.wordBreak, whiteSpace: s.whiteSpace,
                        flex: s.flex, flexShrink: s.flexShrink, flexGrow: s.flexGrow, flexBasis: s.flexBasis,
                        textOverflow: s.textOverflow,
                        visibility: s.visibility,
                        transform: s.transform,
                    },
                    text: (el.textContent || '').trim().slice(0, 80),
                });
            }
        }
        found.sort((a, b) => b.overflow - a.overflow);

        // ── 诊断数据 ──
        const data = {
            timestamp: new Date().toISOString(),
            version: '1.20',
            url: location.href,
            pathname: location.pathname,
            hasRoot: !!document.getElementById('root'),
            viewport: {
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight,
                documentElement_clientWidth: de.clientWidth,
                documentElement_scrollWidth: de.scrollWidth,
                screen: { width: screen.width, height: screen.height, dpr: window.devicePixelRatio },
                visualViewport: window.visualViewport ? { width: Math.round(window.visualViewport.width), height: Math.round(window.visualViewport.height), scale: window.visualViewport.scale } : null,
                viewportMeta: vp ? vp.getAttribute('content') : null,
            },
            overview: {
                totalElements: document.querySelectorAll('*').length,
                overflowingElements: found.length,
                maxOverflow: found.length > 0 ? found[0].overflow : 0,
            },
            overflowing: found,
        };

        const jsonStr = JSON.stringify(data, null, 2);

        // ── 辅助函数：触发下载（iOS Safari 会打开新标签页预览） ──
        const downloadBlob = (content, filename, mimeType) => {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.target = '_blank';
            a.style.cssText = 'display:inline-block;padding:8px 16px;background:#0084ff;color:white;border-radius:6px;text-decoration:none;font-size:12px;font-weight:bold;margin:4px;text-align:center;';
            a.textContent = '⬇ ' + filename;
            document.body.appendChild(a);
            a.click();
            // 延迟清理（给浏览器时间打开）
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 2000);
        };

        const copyText = (text, label) => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                    alert('✅ 已复制到剪贴板（' + label + '）');
                }).catch(() => {
                    alert('❌ 复制失败，请用下方的"下载"按钮');
                });
            } else {
                // fallback：创建 textarea 手动复制
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:200px;z-index:999999999;font-size:10px;';
                document.body.appendChild(ta);
                ta.select();
                ta.focus();
                alert('iOS 限制自动复制。请手动全选 → 拷贝，然后粘贴发送给我。');
                setTimeout(() => { document.body.removeChild(ta); }, 60000);
            }
        };

        // ── 构建面板 HTML ──
        let html = '';
        // 顶部操作栏（sticky）
        html += '<div style="padding:8px 10px;background:#222;position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:6px;flex-wrap:wrap;border-bottom:1px solid #444;">';
        html += '<b style="color:#fff;font-size:12px;margin-right:auto;">🔍 诊断 ' + data.overview.overflowingElements + ' 个溢出</b>';
        html += '<button id="diag-btn-json" style="padding:6px 12px;background:#0084ff;color:#fff;border:none;border-radius:5px;font-size:11px;font-weight:bold;">⬇ JSON</button>';
        html += '<button id="diag-btn-txt" style="padding:6px 12px;background:#0084ff;color:#fff;border:none;border-radius:5px;font-size:11px;font-weight:bold;">⬇ TXT</button>';
        html += '<button id="diag-btn-copy" style="padding:6px 12px;background:#555;color:#fff;border:none;border-radius:5px;font-size:11px;">📋 复制</button>';
        html += '<button id="diag-btn-close" style="padding:6px 12px;background:#c33;color:#fff;border:none;border-radius:5px;font-size:11px;font-weight:bold;margin-left:4px;">✕ 关</button>';
        html += '</div>';

        // 视图信息
        html += '<table style="width:100%;border-collapse:collapse;font-size:10px;font-family:monospace;">';
        html += '<tr style="background:#1a1a1a;"><td style="padding:4px 8px;color:#888;width:40%;">URL</td><td style="padding:4px 8px;">' + data.pathname.replace(/</g,'&lt;') + '</td></tr>';
        html += '<tr><td style="padding:4px 8px;color:#888;">innerWidth</td><td style="padding:4px 8px;"><b>' + data.viewport.innerWidth + '</b></td></tr>';
        html += '<tr style="background:#1a1a1a;"><td style="padding:4px 8px;color:#888;">scrollWidth</td><td style="padding:4px 8px;">' + data.viewport.documentElement_scrollWidth + (data.viewport.documentElement_scrollWidth > data.viewport.innerWidth ? ' <span style="color:#f66;">⚠️ 溢出</span>' : ' <span style="color:#0f0;">✅</span>') + '</td></tr>';
        html += '<tr><td style="padding:4px 8px;color:#888;">screen / dpr</td><td style="padding:4px 8px;">' + data.viewport.screen.width + '×' + data.viewport.screen.height + ' / @' + data.viewport.screen.dpr + 'x</td></tr>';
        html += '<tr style="background:#1a1a1a;"><td style="padding:4px 8px;color:#888;">visualViewport</td><td style="padding:4px 8px;">' + (data.viewport.visualViewport ? data.viewport.visualViewport.width + '×' + data.viewport.visualViewport.height + ' scale:' + data.viewport.visualViewport.scale : 'n/a') + '</td></tr>';
        html += '<tr><td style="padding:4px 8px;color:#888;">viewport meta</td><td style="padding:4px 8px;">' + (data.viewport.viewportMeta || '<span style="color:#f66;">（无）</span>') + '</td></tr>';
        html += '<tr style="background:#1a1a1a;"><td style="padding:4px 8px;color:#888;">hasRoot / 总元素数</td><td style="padding:4px 8px;">' + data.hasRoot + ' / ' + data.overview.totalElements + ' 个</td></tr>';
        html += '</table>';

        // 溢出元素表格
        html += '<div style="padding:8px 10px;font-size:11px;background:#333;color:#ccc;position:sticky;top:42px;z-index:2;">';
        html += '<b>溢出元素</b> — 按超出程度排序（共 ' + data.overview.overflowingElements + ' 个）';
        html += '</div>';

        if (found.length === 0) {
            html += '<div style="padding:40px 20px;color:#0f0;text-align:center;font-size:14px;">✅ 所有元素都在视口宽度内，没有溢出</div>';
        } else {
            html += '<table style="width:100%;border-collapse:collapse;font-size:9px;font-family:monospace;table-layout:fixed;">';
            html += '<thead style="background:#222;position:sticky;top:72px;z-index:2;">';
            html += '<tr>';
            html += '<th style="text-align:left;padding:3px 4px;width:4%;">#</th>';
            html += '<th style="text-align:left;padding:3px 4px;width:30%;">选择器 (CSS)</th>';
            html += '<th style="text-align:right;padding:3px 4px;width:8%;">宽</th>';
            html += '<th style="text-align:right;padding:3px 4px;width:7%;">超出</th>';
            html += '<th style="text-align:left;padding:3px 4px;width:18%;">minW/ow/ws/flex</th>';
            html += '<th style="text-align:left;padding:3px 4px;width:8%;">pos</th>';
            html += '<th style="text-align:left;padding:3px 4px;width:25%;">内容预览</th>';
            html += '</tr></thead><tbody>';

            for (let i = 0; i < Math.min(found.length, 50); i++) {
                const f = found[i];
                const bg = i % 2 === 0 ? '#141414' : '#0a0a0a';
                const color = f.overflow > 100 ? '#f66' : f.overflow > 30 ? '#fa0' : '#ff6';
                html += '<tr style="background:' + bg + ';">';
                html += '<td style="padding:2px 4px;color:' + color + ';font-weight:bold;">' + (i + 1) + '</td>';
                html += '<td style="padding:2px 4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#88f;" title="' + f.sel.replace(/"/g, '&quot;') + '">' + f.sel + '</td>';
                html += '<td style="padding:2px 4px;text-align:right;">' + f.rect.w + '</td>';
                html += '<td style="padding:2px 4px;text-align:right;color:' + color + ';font-weight:bold;">+' + f.overflow + '</td>';
                html += '<td style="padding:2px 4px;font-size:8px;color:#aaa;">' + f.css.minWidth + '/' + f.css.overflowWrap + '/' + f.css.whiteSpace.slice(0,8) + '/' + (f.css.flexShrink !== '1' ? 'shrink:'+f.css.flexShrink : '') + '</td>';
                html += '<td style="padding:2px 4px;font-size:8px;color:#aaa;">' + f.css.position + '</td>';
                html += '<td style="padding:2px 4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:8px;color:#666;">' + f.text.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</td>';
                html += '</tr>';
            }
            html += '</tbody></table>';
            if (found.length > 50) {
                html += '<div style="padding:10px;color:#888;text-align:center;font-size:10px;">...还有 ' + (found.length - 50) + ' 个溢出元素（面板显示前 50，JSON 中包含全部 ' + found.length + ' 个）</div>';
            }
        }

        // ── 创建面板 ──
        const panel = document.createElement('div');
        panel.id = 'zhihu-diag-panel';
        panel.innerHTML = html;
        panel.style.cssText = 'position:fixed;top:8px;left:5px;right:5px;bottom:8px;background:#080808;color:#ccc;z-index:2147483646;border-radius:8px;overflow:auto;-webkit-overflow-scrolling:touch;font-size:11px;box-shadow:0 0 50px rgba(0,0,0,0.95);border:1px solid #555;';
        document.body.appendChild(panel);

        // ── 绑定按钮事件 ──
        panel.querySelector('#diag-btn-json').addEventListener('click', () => {
            downloadBlob(jsonStr, 'zhihu-diag-' + Date.now() + '.json', 'application/json');
        });
        panel.querySelector('#diag-btn-txt').addEventListener('click', () => {
            // TXT 格式更易读——只输出溢出元素摘要
            let txt = '=== 知乎诊断报告 ===\n';
            txt += '时间: ' + data.timestamp + '\n';
            txt += 'URL: ' + data.url + '\n';
            txt += 'pathname: ' + data.pathname + '\n';
            txt += 'innerWidth: ' + data.viewport.innerWidth + '  scrollWidth: ' + data.viewport.documentElement_scrollWidth + '\n';
            txt += 'screen: ' + data.viewport.screen.width + 'x' + data.viewport.screen.height + ' @' + data.viewport.screen.dpr + 'x\n';
            txt += 'viewport meta: ' + (data.viewport.viewportMeta || '(none)') + '\n';
            txt += 'hasRoot: ' + data.hasRoot + '  total elements: ' + data.overview.totalElements + '\n';
            txt += 'overflowing: ' + data.overview.overflowingElements + '\n\n';
            txt += '=== 溢出元素（按超出排序） ===\n';
            for (let i = 0; i < found.length; i++) {
                const f = found[i];
                txt += '\n[' + (i + 1) + '] +' + f.overflow + 'px  width=' + f.rect.w + '  left=' + f.rect.l + '  right=' + f.rect.r + '\n';
                txt += '    selector: ' + f.sel + '\n';
                txt += '    CSS: display=' + f.css.display + ' position=' + f.css.position + ' minW=' + f.css.minWidth + ' maxW=' + f.css.maxWidth + '\n';
                txt += '         ow=' + f.css.overflowWrap + ' wb=' + f.css.wordBreak + ' ws=' + f.css.whiteSpace + ' flex=' + f.css.flex + ' shrink=' + f.css.flexShrink + '\n';
                txt += '         padding=' + f.css.padding + ' margin=' + f.css.margin + ' boxSizing=' + f.css.boxSizing + '\n';
                txt += '    text: ' + f.text + '\n';
            }
            downloadBlob(txt, 'zhihu-diag-' + Date.now() + '.txt', 'text/plain');
        });
        panel.querySelector('#diag-btn-copy').addEventListener('click', () => {
            copyText(jsonStr, JSON.stringify({ n: found.length, maxOverflow: found.length > 0 ? found[0].overflow : 0 }));
        });
        panel.querySelector('#diag-btn-close').addEventListener('click', () => {
            panel.remove();
        });
        // 点面板空白区域也可关闭
        panel.addEventListener('click', (ev) => {
            if (ev.target === panel) { panel.style.display = 'none'; }
        });
    };

    window.__diagnoseOverflow = showDiagnosticPanel;

    // 6. MutationObserver + 防抖（解决 SPA 跳转）
    let debounceTimer;
    const observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            applyHeaderDisplay();
            enforceViewport();
            if (!document.getElementById('custom-layout-css')) {
                injectCss();
            }
            if (document.body && !document.body.contains(btn)) {
                document.body.appendChild(btn);
            }
        }, 100);
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
    });

})();