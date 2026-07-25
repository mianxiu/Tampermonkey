// ==UserScript==
// @name         知乎全站自适应
// @namespace    http://tampermonkey.net/
// @version      1.18
// @description  桌面版网页适配手机宽度，隐藏无关元素，轻量高性能（修复双滚动条/热榜封面重叠，强制 viewport）
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
            max-width: 100% !important;
            overflow: hidden !important;
        }

        body{
        background:white!important;
        }
        /* --- 全局宽度自适应与去侧边栏 --- */
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

    // 真机诊断：双击悬浮按钮，弹出真实布局尺寸。
    // 若 innerWidth 远大于屏幕宽度（如 ~980），说明是 iOS "请求桌面网站" 强制宽布局视口导致的挤压。
    btn.addEventListener('dblclick', (e) => {
        e.preventDefault();
        const de = document.documentElement;
        const vp = document.querySelector('meta[name="viewport"]');
        alert(
            'window.innerWidth = ' + window.innerWidth + '\n' +
            'documentElement.clientWidth = ' + de.clientWidth + '\n' +
            'documentElement.scrollWidth = ' + de.scrollWidth + '\n' +
            'screen.width = ' + screen.width + '\n' +
            'devicePixelRatio = ' + window.devicePixelRatio + '\n' +
            'visualViewport.width = ' + (window.visualViewport ? Math.round(window.visualViewport.width) : 'n/a') + '\n' +
            'viewport meta = ' + (vp ? vp.getAttribute('content') : '（无）')
        );
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

    // 5. MutationObserver + 防抖（解决 SPA 跳转）
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