// ==UserScript==
// @name         知乎网页版宽度自适应 & 强力导航切换
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  向知乎注入布局 CSS
// @author       mianxiu
// @match        *://*.zhihu.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 记录 Header 的显示状态（true 表示我们想要它是隐藏的）
    let isHeaderHidden = true;

    // 1. 定义布局 CSS (始终生效，负责全屏)
    const baseCss = `
        /* 强制隐藏右侧边栏 */
        .GlobalSideBar, .Question-sideColumn, div[data-za-detail-view-path-module="RightSideBar"] {
            display: none !important;
        }

        /* 强制加宽主栏 */
        #root .App-main .Topstory-container {
            display: flex !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            width: 100% !important;
        }

        .Topstory-mainColumn, .Question-mainColumn {
            width: 100% !important;
        }

        /* 隐藏 Logo 和部分导航组件 */
        a[aria-label="知乎"],
        nav.AppHeader-nav,
        .AppHeader-profile,
        .AppHeader-options {
            display: none !important;
        }

        #root > div > div[class*="css-"] > header > div > div[class*="css-"] > div[class*="css-"] > nav{
         display: none !important;
        }

        #root div.Popover label.SearchBar-input{
         margin-left:0px!important;
}

        /* 搜索框居左 */
        #root div.Popover > label.SearchBar-input {
            margin-left: 0px !important;
        }

        #root > div > div[class*="css-"] > header > div{
        margin-left: 0px !important;
        }

        /* 悬浮按钮样式 */
        #toggle-header-btn {
            position: fixed;
            top: 10px;
            right: 30px;
            width: 44px;
            height: 44px;
            background: #0084ff;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 2147483647; /* 保证在最上层 */
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            font-size: 18px;
            opacity: 0.8;
            transition: all 0.3s;
            user-select: none;
        }

        #root > div >  div[class*="css-"] > header > div >  div[class*="css-"] >  div[class*="css-"] > nav{
            display: none !important;
}



        #root div.Popover > label.SearchBar-input{
            margin-left:0px!important;
}
    `;

    // 2. 强力修改 Header 显示属性的函数
    function applyHeaderDisplay() {
        const header = document.querySelector('header.AppHeader');
        if (header) {
            if (isHeaderHidden) {
                // 直接修改内联 style，强制隐藏
                header.style.setProperty('display', 'none', 'important');
            } else {
                // 强制显示并让其撑满
                header.style.setProperty('display', 'block', 'important');
                header.style.setProperty('width', '100%', 'important');
            }
        }
    }

    // 3. 注入基础布局样式
    const injectCss = () => {
        if (!document.getElementById('custom-layout-css')) {
            const style = document.createElement('style');
            style.id = 'custom-layout-css';
            style.textContent = baseCss;
            (document.head || document.documentElement).appendChild(style);
        }
    };

    // 4. 创建按钮
    const btn = document.createElement('div');
    btn.id = 'toggle-header-btn';
    btn.innerHTML = 'H'; // 初始为 H

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        isHeaderHidden = !isHeaderHidden;
        btn.innerHTML = isHeaderHidden ? 'H' : '💊';
        btn.style.background = isHeaderHidden ? '#8590a6' : '#0084ff';
        applyHeaderDisplay();
    });

    // 初始化
    injectCss();

    const init = () => {
        if (!document.body.contains(btn)) {
            document.body.appendChild(btn);
        }
        applyHeaderDisplay();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 5. 使用 Observer 持续锁定状态（防止知乎脚本自动改回 display: block）
    const observer = new MutationObserver(() => {
        applyHeaderDisplay();
        if (document.body && !document.body.contains(btn)) {
            document.body.appendChild(btn);
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
    });

})();