// ==UserScript==
// @name         知乎网页版宽度自适应
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  强制向知乎注入 CSS
// @author       mianxiu
// @match        *://*.zhihu.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 1. 在这里定义你的样式
    const css = `
        /* 强制隐藏右侧边栏（测试用，生效说明脚本跑通了） */
        .GlobalSideBar, .Question-sideColumn {
            display: none !important;
        }

        /* 强制加宽主栏 */
        #root .App-main .Topstory-container{
        display:flex!important;
padding-left: 0 !important;
    padding-right: 0 !important;
        width: 100% !important;
        }
        .Topstory-mainColumn, .Question-mainColumn {
            width: 100% !important;
        }

        /* 随便加点背景色方便肉眼确认 */
        body { background-color: #f0f2f7 !important; }

        body > div > div > div > div[class*="css-"]{
            width:100%!important;
        }
        body > div > div > div > div[class*="css-"] > div > div > div > div:nth-child(3){
        display: none !important;
        }
        div[data-za-detail-view-path-module="RightSideBar"] {
    display: none !important; /* 彻底移除右边栏 */
}

a[aria-label="知乎"]{
display: none !important;
}

#root > div >  div[class*="css-"] > header > div >  div[class*="css-"] >  div[class*="css-"] > nav{
 display: none !important;
}

#root div.Popover > label.SearchBar-input{
margin-left:0px!important;
}

    `;

    // 2. 注入函数
    function injectStyles() {
        if (document.head) {
            const style = document.createElement('style');
            style.id = 'custom-css-injection';
            style.textContent = css;
            document.head.appendChild(style);
            console.log('✅ CSS 注入成功');
        }
    }

    // 3. 策略：立即注入 + DOM 变化时检查（防止知乎单页面应用切换后失效）
    injectStyles();

    // 针对知乎这种 SPA (单页应用) 的补丁
    const observer = new MutationObserver(() => {
        if (!document.getElementById('custom-css-injection')) {
            injectStyles();
        }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

})();