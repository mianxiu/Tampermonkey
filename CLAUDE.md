# Zhihu Desktop Mode - Tampermonkey 脚本

## 项目概述

一个 Tampermonkey 用户脚本，让 iPhone Safari 访问知乎时：
1. **用桌面版 UA 请求桌面版网页**（避免手机版的"打开 App"等干扰）
2. **CSS 注入**把桌面版布局适配到手机宽度（393px）
3. **隐藏无关元素**：导航栏、侧边栏、广告、App 提示等
4. **SPA 导航兼容**：MutationObserver + 防抖，应对页面切换

## 文件结构

```
for_ios_zhihu_desktop_mode.user.js   ← 主脚本（Tampermonkey 直接使用）
test/
  package.json                       ← Playwright 测试依赖
  zhihu-test.js                      ← 自动化测试脚本
  cookies.json                       ← 知乎登录 Cookie（gitignore）
  screenshots/                       ← 测试截图（gitignore）
  videos/                            ← 测试录屏（gitignore）
.gitignore
CLAUDE.md
```

## 脚本关键设计

### CSS 策略
- `html, body, #root` 全宽 + `overflow-x: hidden` 防溢出
- 全局 `box-sizing: border-box`
- `img, svg, video` 限制 `max-width: 100%`
- 针对性隐藏 Header、侧边栏、App 提示、广告等
- Explore 页各种卡片（RoundtableCard, SpecialCard, CollectionCard, ColumnCard）宽度适配

### JS 策略
- `@run-at document-start`：尽早注入 CSS
- `injectCss()`：强制覆盖（先 remove 旧标签再 append），应对 SPA 切换时 `<head>` 被替换
- `applyHeaderDisplay()`：默认隐藏 Header，悬浮按钮切换
- MutationObserver 100ms 防抖：SPA 导航后重新应用 Header 状态和 CSS

### 性能注意事项
- ❌ 不要用 `div, span, a, p { ... }` 全局选择器 — 会匹配几千个元素导致卡死
- ❌ 不要用 `setInterval` 高频轮询 — 会导致持续重排
- ✅ 只用特定 class/id 选择器
- ✅ MutationObserver 只看 `childList`，不监听 attributes

## 测试

### 环境
- Playwright + Edge (Chromium)，无需额外安装浏览器
- 桌面版 UA（模拟脚本行为）
- 多分辨率：iPhone 393px / iPad 768px / Desktop 1024px

### 命令
```bash
cd test && npm install           # 首次安装
node test/zhihu-test.js --login  # 手动登录（保存 Cookie）
node test/zhihu-test.js          # 多分辨率静态测试
node test/zhihu-test.js --spa    # SPA 导航流程测试
node test/zhihu-test.js --spa --video  # 录屏
```

### 测试覆盖
- 4 页面：首页 / 搜索 / 发现 / 热榜
- SPA 8 步：首页 → 问题详情 → 展开内容 → 滚动评论区 → 展开评论 → 底部 → 返回 → 搜索
- 溢出检测：`scrollWidth <= viewport`

### 已知局限
- 测试中 `scrollWidth` 比 `viewport` 少 15px = 桌面浏览器垂直滚动条宽度。iOS Safari 悬浮滚动条不占空间，实机上无此问题
- 部分页面需要登录才能正常显示（搜索、热榜）
- 知乎 CSS 类名变化频繁，脚本中的 class 选择器可能需要更新

## 版本历史

- v1.22：修复答案页横向溢出（JSON 诊断定位`div.css-1gl8cva`等 CSS-in-JS hash wrapper 有 1032px 固定宽度+负 margin，脚本现有选择器无法命中 → 加 `#root>div>div` 结构选择器强制 max-width:100%）
- v1.21：诊断面板支持可视化面板内下载 JSON/TXT + 一键复制，不依赖 Mac/Safari 远程调试
- v1.20：真机可视化诊断面板（双击悬浮按钮），无需 Mac
- v1.18：修复双滚动条（overflow-x:clip）、热榜封面图重叠（固定尺寸+object-fit）、强制 viewport meta + 真机双击诊断按钮
- v1.17：回归轻量，修复性能问题（去掉全局选择器和高频轮询）
- v1.14-16：修复 CSS 注入失效、SPA 溢出、按钮反转
- v1.11-13：加全局 box-sizing + overflow-x:hidden + Explore 卡片宽度修复
- v1.10：初始版本
