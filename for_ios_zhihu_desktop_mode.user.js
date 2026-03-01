// ==UserScript==
// @name         知乎全站自适应
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  支持全站(首页、问题页等)宽度自适应，隐藏右边栏，搜索框占位符隐藏，悬浮按钮切换导航。
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
        /* --- 全局宽度自适应与去侧边栏 --- */
        /* 隐藏首页、问题页、搜索页侧边栏 */
        .GlobalSideBar,
        .Question-sideColumn,
        div[data-za-detail-view-path-module="RightSideBar"],
        .SearchSideBar {
            display: none !important;
        }

        /* 强制主容器撑满：适配首页、问题页、搜索页 */
        #root .App-main .Topstory-container,
        .Question-main,
        .Search-container,
        .SearchResult-main {
            display: flex !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
        }

        /* 内容列占据全部宽度 */
        .Topstory-mainColumn,
        .Question-mainColumn,
        .SearchResult-main,
        .QuestionHeader-content {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
        }

        /* --- 导航栏元素清理 --- */
        #TopstoryContent button.Button.FollowButton,
        a[aria-label="知乎"],
        button[aria-label="收藏"],
        button[aria-label="喜欢"],
        button[aria-label="更多"],
        nav.AppHeader-nav,
        .AppHeader-profile,
        .AppHeader-options,
        #root > div > main > div > div.Topstory-container > div.Topstory-mainColumn > div.WriteArea,
        #root > div > div[class*="css-"] > header > div > div[class*="css-"] > div[class*="css-"] > nav {
            display: none !important;
        }

        /* --- 修正作者信息勋章超出 body 的问题 --- */
.AuthorInfo-badge,
.AuthorInfo-content,
.AuthorInfo {
    max-width: 100% !important;
    box-sizing: border-box !important;
    overflow: hidden !important; /* 防止内容溢出 */
}

.AuthorInfo-badge {
    display: inline-flex !important;
    align-items: center;
    white-space: nowrap; /* 强制不换行，配合 ellipsis 使用 */
    text-overflow: ellipsis; /* 超出部分显示省略号 */
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

    // 3. 注入 CSS
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
    btn.innerHTML = 'H';

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        isHeaderHidden = !isHeaderHidden;
        btn.innerHTML = isHeaderHidden ? '' : '💊';
        btn.style.background = isHeaderHidden ? '#8590a6' : '#0084ff';
        applyHeaderDisplay();
    });

    // 初始化执行
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

    // 5. 持续监听（解决 SPA 跳转和动态 Placeholder）
    const observer = new MutationObserver(() => {
        injectCss();
        applyHeaderDisplay();
        if (document.body && !document.body.contains(btn)) {
            document.body.appendChild(btn);
        }
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'placeholder']
    });

})();