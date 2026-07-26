# Zhihu Desktop Mode - Tampermonkey 脚本

## 项目概述

一个 Tampermonkey 用户脚本，让 iPhone Safari 访问知乎时：
1. **Safari "请求桌面网站" 获取桌面版网页**（避免手机版的"打开 App"等干扰）
2. **CSS 注入**把桌面版布局适配到手机宽度（402px）
3. **JS 端实时溢出修复**：CSS-in-JS hash class wrapper（`css-1gl8cva` 等）固定像素宽度（1000~1175px），CSS 选择器无法命中 → 扫描 `rect.right > viewport` 的容器并 `style.setProperty` 强制适配
4. **隐藏无关元素**：导航栏、侧边栏、广告、App 提示等
5. **SPA 导航兼容**：MutationObserver + 防抖，应对页面切换
6. **真机诊断面板**：双击浮动按钮弹出可视面板，可下载 JSON/TXT，无需 Mac/Safari 远程调试

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

### 架构：CSS 层 + JS 扫描层 两层修复

**第一层：CSS**
- `html, body, #root` 全宽 + `overflow-x: clip`（用 clip 而非 hidden，避免把 overflow-y 逼成 auto 产生双滚动条）
- 全局 `box-sizing: border-box`
- `img, svg, video` 限制 `max-width: 100%`
- 针对性隐藏 Header、侧边栏、App 提示、广告等
- Home/Explore/Hot/Search 等已知页面的 class 选择器宽度适配
- 热榜封面图固定尺寸 + `object-fit:cover`，隐藏多余摘要，元信息栏回归文档流

**第二层：JS 扫描修复 `fixOverflowingContainers()`**
- 扫描所有块级元素（div/section/header/main/nav/article/footer/table）
- `getBoundingClientRect().right > innerWidth` 的超宽容器 → `style.setProperty('max-width')` 直接限制
- 按溢出程度排序，外层先修内层随动，只修溢出 >20px 的前 15 个
- 延迟 300~500ms 执行（等 CSS-in-JS 渲染完成），SPA 导航后重新触发

### JS 策略
- `@run-at document-start`：尽早注入 CSS
- `injectCss()`：强制覆盖（先 remove 旧标签再 append），应对 SPA 切换时 `<head>` 被替换
- `enforceViewport()`：强制维持 `viewport meta`（`width=device-width`），应对 SPA 切换或桌面版模板替换/缺失此 meta
- `applyHeaderDisplay()`：默认隐藏 Header，悬浮按钮切换
- `fixOverflowingContainers()`：JS 端实时修复 CSS-in-JS hash wrapper 溢出（见上文）
- `showDiagnosticPanel()`：双击悬浮按钮弹出诊断面板（可视化表格 + 下载 JSON/TXT + 复制）
- MutationObserver 100ms 防抖：SPA 导航后重新执行上述全部维护

### 性能注意事项
- ❌ 不要用 `div, span, a, p { ... }` 全局选择器 — 会匹配几千个元素导致卡死
- ❌ 不要用 `setInterval` 高频轮询 — 会导致持续重排
- ✅ 只用特定 class/id 选择器
- ✅ JS 扫描只查块级元素且限制数量（前 15 个），不遍历所有 `*`
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
- **Playwright 无法触发 React Router SPA 导航**（`<a>` 点击后 URL 不变、pushState 只改地址栏不渲染），因此测试无法覆盖答案详情页的 CSS-in-JS hash wrapper 溢出问题。答案页适配需真机诊断 JSON 数据驱动修复
- 知乎 CSS 类名变化频繁，脚本中的 class 选择器可能需要更新
- 知乎使用 CSS-in-JS（动态 hash class），**无法通过纯 CSS 选择器命中布局 wrapper**（`div.css-1gl8cva` 每次构建 hash 都变，DOM 层级不可预测 → v1.23 起改为 JS 扫描修复）

## 版本历史

- v1.23：关键突破 — 放弃 CSS 选择器对抗，新增 `fixOverflowingContainers()` JS 扫描修复。注入后延迟扫描所有块级元素 `rect.right > viewport` 的直接 `setProperty('max-width')` 强制限制，SPA 导航后重新触发
- v1.22：JSON 诊断定位 `div.css-1gl8cva` 1032px 固定宽度+margin-right:-630px → 尝试 `#root>div>div` 结构选择器（但 DOM 层级更深 → 未命中，失败）
- v1.21：诊断面板支持页面内下载 JSON/TXT + 一键复制，不依赖 Mac/Safari
- v1.20：真机可视化诊断面板（双击悬浮按钮），无需 Mac
- v1.19：修复答案页右侧文字被裁（flex min-width:0）+ 正文换行 + pre/code/table 防溢出
- v1.18：修复双滚动条（overflow-x:clip）、热榜封面图重叠（固定尺寸+object-fit）、强制 viewport meta + 真机双击诊断按钮
- v1.17：回归轻量，修复性能问题（去掉全局选择器和高频轮询）
- v1.14-16：修复 CSS 注入失效、SPA 溢出、按钮反转
- v1.11-13：加全局 box-sizing + overflow-x:hidden + Explore 卡片宽度修复
- v1.10：初始版本
