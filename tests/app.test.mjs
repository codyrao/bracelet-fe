import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  addBraceletItem,
  applyProductDrop,
  buildBeadBackgroundImage,
  calculateBeadFlightFrame,
  calculateDragGhostFrame,
  createInteractionSoundPlan,
  createOrderSummary,
  createInitialState,
  createClearedBraceletState,
  estimateBraceletWristCm,
  calculateBeadPositions,
  calculateBracelet3DScene,
  calculateBraceletTrackFrame,
  calculateSummary,
  filterProducts,
  getBraceletPreviewItems,
  replaceBraceletItem,
  removeBraceletItem,
  rollBraceletItem,
} from "../app.js";

// 验证页面品牌名已切换为面向小店的命名，不再显示旧的养石头文案。
test("index.html 使用链小店作为页面品牌名", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /<title>链小店 · DIY 手链<\/title>/);
  assert.match(html, /<h1>链小店<\/h1>/);
  assert.doesNotMatch(html, /养个石头/);
});

// 验证使用须知是可点击按钮，并有对应弹窗承载说明内容。
test("index.html 提供可打开的使用须知弹窗结构", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /<button[^>]+id="notice-button"/);
  assert.match(html, /<dialog[^>]+id="usage-dialog"/);
  assert.match(html, /aria-labelledby="usage-title"/);
});

// 验证移动端关闭双击放大，并保留安全区域适配。
test("index.html 关闭移动端双击放大并提示 20 颗上限", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /maximum-scale=1/);
  assert.match(html, /user-scalable=no/);
  assert.match(html, /珠子数量不足（0\/20）/);
  assert.match(html, /最多 20 颗/);
});

// 验证首页和 3D 展示弹窗都能进入确认订单流程。
test("index.html 在首页和 3D 展示中提供确认订单入口", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /<button[^>]+id="checkout-button"/);
  assert.match(html, /<button[^>]+id="inspector-checkout-button"/);
  assert.match(html, /<dialog[^>]+id="order-dialog"/);
  assert.match(html, /id="order-preview"/);
  assert.match(html, /id="order-summary"/);
});

// 验证页面保留手围和音效状态，但不再暴露试戴预览入口，避免 3D 弹窗主路径分叉。
test("index.html 提供手围和音效状态且移除试戴预览入口", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /id="wrist-status"/);
  assert.match(html, /手围/);
  assert.match(html, /id="sound-button"/);
  assert.match(html, /aria-pressed="true"/);
  assert.doesNotMatch(html, /id="tryon-toggle-button"/);
  assert.doesNotMatch(html, /试戴预览/);
});

// 验证 PC 顶部不再显示无业务意义的小程序模拟控制，避免遮挡使用须知按钮。
test("index.html 移除顶部模拟窗口控制按钮", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.doesNotMatch(html, /topbar-actions/);
  assert.doesNotMatch(html, /round-action/);
  assert.match(css, /\.topbar\s*\{[^}]*grid-template-columns: 44px 1fr;/s);
  assert.match(css, /@media \(min-width: 900px\)[\s\S]*\.status-row\s*\{[^}]*justify-content: flex-start;/);
});

// 验证订单平面图复用首页珠子样式，并避免额外深棕背景线。
test("styles.css 订单平面图复用首页珠子且不绘制背景线", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(css, /\.order-preview-bead \.selected-bead-core/);
  assert.doesNotMatch(css, /\.order-preview::before/);
});

// 验证宽屏电脑端会切换为左右分栏，而不是继续套用窄手机壳布局。
test("styles.css 提供手机优先和电脑端双栏自适应布局", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(css, /grid-template-areas:\s*"topbar"\s*"status"\s*"stage"\s*"actions"\s*"picker"/);
  assert.match(css, /@media \(min-width: 900px\)/);
  assert.match(css, /grid-template-areas:\s*"topbar status"\s*"stage picker"\s*"actions picker"/);
  assert.match(css, /\.picker\s*\{[^}]*grid-area: picker;/s);
  assert.match(css, /\.bracelet-stage\s*\{[^}]*grid-area: stage;/s);
});

// 验证 PC 端使用整屏工作台，而不是被固定最大宽度限制成左侧小卡片。
test("styles.css 电脑端工作台铺满可用屏幕", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const desktopCss = css.match(/@media \(min-width: 900px\) \{[\s\S]*$/)?.[0] ?? "";

  assert.match(desktopCss, /body\s*\{[^}]*padding: 12px;/s);
  assert.match(desktopCss, /\.app-shell\s*\{[^}]*width: calc\(100vw - 24px\);/s);
  assert.match(desktopCss, /\.app-shell\s*\{[^}]*height: calc\(100dvh - 24px\);/s);
  assert.match(desktopCss, /grid-template-columns: minmax\(720px, 1fr\) minmax\(390px, 500px\);/);
  assert.doesNotMatch(desktopCss, /width: min\(1180px/);
  assert.doesNotMatch(desktopCss, /height: min\(860px/);
});

// 验证移动端布局不会被 600px 断点强行限制高度，也禁用触控双击缩放。
test("styles.css 移动端全屏展示且关闭触控缩放手势", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(css, /html\s*\{[^}]*touch-action: manipulation;/s);
  assert.match(css, /body\s*\{[^}]*overscroll-behavior: none;/s);
  assert.match(css, /button, input\s*\{[^}]*touch-action: manipulation;/s);
  assert.match(css, /@media \(min-width: 600px\) and \(max-width: 899px\)/);
});

// 验证手机端页面和商品抽屉都允许纵向滚动，不会被外层 overflow hidden 锁死。
test("styles.css 手机端允许商品抽屉顺畅下滑", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(css, /\.app-shell\s*\{[^}]*overflow-x: hidden;[^}]*overflow-y: auto;/s);
  assert.match(css, /\.picker\s*\{[^}]*display: grid;[^}]*grid-template-rows: auto minmax\(0, 1fr\);/s);
  assert.match(css, /\.picker-content\s*\{[^}]*min-height: 0;/s);
  assert.match(css, /\.category-list,\s*\.catalog-panel\s*\{[^}]*min-height: 0;[^}]*-webkit-overflow-scrolling: touch;/s);
});

// 验证每个弹窗都具备进入和退出动效，关闭时不直接瞬间消失。
test("styles.css 为每个弹窗提供高性能进入和退出过渡", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const js = readFileSync(new URL("../app.js", import.meta.url), "utf8");

  assert.match(css, /\.bead-inspector\[open\], \.order-dialog\[open\], \.usage-dialog\[open\]/);
  assert.match(css, /\.bead-inspector\.is-closing, \.order-dialog\.is-closing, \.usage-dialog\.is-closing/);
  assert.match(css, /\.bead-inspector\[open\] \.inspector-card, \.order-dialog\[open\] \.order-card, \.usage-dialog\[open\] \.usage-card/);
  assert.match(css, /@keyframes modal-card-enter/);
  assert.match(css, /@keyframes modal-card-exit/);
  assert.match(css, /@keyframes modal-enter/);
  assert.match(css, /@keyframes modal-exit/);
  assert.match(css, /will-change: transform, opacity/);
  assert.match(js, /function closeModalDialog/);
  assert.match(js, /classList\.add\("is-closing"\)/);
  assert.match(html, /class="inspector-close" type="button"/);
  assert.match(html, /class="order-close" type="button"/);
  assert.match(html, /class="usage-close" type="button"/);
});

// 验证 3D 弹窗先展示轻量 loading UI，再异步绘制 canvas，避免打开瞬间卡顿。
test("index.html 和 app.js 为 3D 弹窗提供轻量 loading 过渡", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const js = readFileSync(new URL("../app.js", import.meta.url), "utf8");

  assert.match(html, /id="inspector-loading"/);
  assert.match(html, /role="status"/);
  assert.match(css, /\.inspector-loading/);
  assert.match(css, /@keyframes loading-spin/);
  assert.doesNotMatch(css, /backdrop-filter:\s*blur/);
  assert.match(js, /function showInspectorLoading/);
  assert.match(js, /window\.requestAnimationFrame\(\(\) => \{/);
  assert.match(js, /showInspectorLoading\(elements, false\)/);
});

// 验证点击和拖拽添加珠子都走同一套飞入绳圈动效，保证添加反馈一致。
test("app.js 点击和拖拽添加珠子都会播放放到绳子上的动效", () => {
  const js = readFileSync(new URL("../app.js", import.meta.url), "utf8");

  assert.match(js, /playBeadPlacementAnimation\(product, sourceRect, elements\.selectedItems\.querySelector/);
  assert.match(js, /playBeadPlacementAnimation\(\s*dragSession\.product,\s*dragSession\.sourceRect,\s*elements\.selectedItems\.querySelector/s);
});

// 验证首页绳圈使用多层麻绳纹理，而不是光滑的单根 SVG 线。
test("index.html 和 styles.css 使用有纹理的深棕麻绳轨道", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(html, /id="rope-fiber"/);
  assert.match(html, /class="rope-circle rope-core"/);
  assert.match(html, /class="rope-circle rope-fiber"/);
  assert.match(css, /stroke:\s*url\(#rope-gradient\)/);
  assert.match(css, /stroke:\s*url\(#rope-fiber\)/);
  assert.match(css, /stroke-dasharray/);
});

// 验证珠子和麻绳具备更接近实物的立体材质层，避免 PC 大屏下显得扁平。
test("styles.css 为珠子和麻绳提供实物质感层", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(css, /\.selected-bead\s*\{[^}]*filter: drop-shadow\(0 16px 16px/s);
  assert.match(css, /\.selected-bead-core\s*\{[^}]*filter: saturate\(1\.08\) contrast\(1\.06\);/s);
  assert.match(css, /\.selected-bead-core::after, \.product-bead::after\s*\{[^}]*box-shadow: inset 0 0 0 1px/s);
  assert.match(css, /\.selected-bead-core.has-photo::after, \.product-bead.has-photo::after\s*\{[^}]*mix-blend-mode: soft-light;/s);
  assert.match(css, /\.bracelet-track \.rope-fiber\s*\{[^}]*stroke-dasharray: 6 4 2 5;/s);
});

// 验证视频模板里的轻盈呼吸感和弹性入环节奏通过 CSS token 固化下来。
test("styles.css 提供手链呼吸、弹性飞入和音效按钮状态", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(css, /\.bracelet-stage\.has-beads::before\s*\{[^}]*animation: stage-breathe/s);
  assert.match(css, /\.bracelet-track\.has-beads\s*\{[^}]*animation: bracelet-float/s);
  assert.match(css, /\.sound-button\.is-muted/);
  assert.match(css, /@keyframes stage-breathe/);
  assert.match(css, /@keyframes bracelet-float/);
  assert.match(css, /cubic-bezier\(\.16, 1\.08, \.24, 1\)/);
});

// 验证点击商品卡时有视频模板里的灰色圆形按压涟漪，并配合飞珠动画。
test("styles.css 和 app.js 提供商品卡灰色涟漪装珠动画", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const js = readFileSync(new URL("../app.js", import.meta.url), "utf8");

  assert.match(css, /\.product-card::after/);
  assert.match(css, /\.product-card\.is-placing::after/);
  assert.match(css, /@keyframes product-place-ripple/);
  assert.match(css, /rgb\(80 80 80 \/ 18%\)/);
  assert.match(css, /@keyframes bead-flight[\s\S]*scale\(1\.24\)/);
  assert.match(js, /function playProductPlacementFeedback/);
  assert.match(js, /productButton\.classList\.add\("is-placing"\)/);
  assert.match(js, /playProductPlacementFeedback\(productButton\)/);
});

// 验证商品库同时支持分类和关键词筛选。
test("filterProducts 按分类和关键词返回有效商品", () => {
  const products = [
    { id: "clear-8", category: "clear", name: "净体白水晶", diameterMm: 8, priceCents: 500 },
    { id: "milk-10", category: "milk", name: "奶白晶", diameterMm: 10, priceCents: 800 },
  ];

  assert.deepEqual(filterProducts(products, "clear", "8mm"), [products[0]]);
});

// 验证商品图片来源字段会被保留，方便用真实图片替代卡通珠子。
test("filterProducts 保留真实珠子图片来源字段", () => {
  const product = {
    id: "rose-8",
    category: "rose",
    name: "粉水晶",
    diameterMm: 8,
    priceCents: 600,
    imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Rose_Quartz_Bracelet.jpg?width=320",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Rose_Quartz_Bracelet.jpg",
  };

  const [matchedProduct] = filterProducts([product], "rose", "粉");

  assert.equal(matchedProduct.imageUrl, product.imageUrl);
  assert.equal(matchedProduct.sourceUrl, product.sourceUrl);
});

// 验证真实图片加载失败时不会把珠子退化成统一白底。
test("buildBeadBackgroundImage 始终保留本地材质兜底", () => {
  const product = {
    id: "black-8",
    category: "black",
    name: "黑曜石",
    diameterMm: 8,
    priceCents: 500,
    imageUrl: "https://example.invalid/bead.jpg",
    tone: "black",
  };

  const backgroundImage = buildBeadBackgroundImage(product);

  assert.match(backgroundImage, /url\("https:\/\/example\.invalid\/bead\.jpg"\)/);
  assert.match(backgroundImage, /conic-gradient/);
  assert.match(backgroundImage, /#07080b/);
});

// 验证拖拽浮层按真实尺寸和触点偏移对齐，而不是固定减 24px。
test("calculateDragGhostFrame 按触点相对位置对齐拖拽浮层", () => {
  const frame = calculateDragGhostFrame(
    { clientX: 120, clientY: 90 },
    { left: 96, top: 70, width: 40, height: 40 },
    { width: 52, height: 52 },
  );

  assert.deepEqual(frame, { height: 52, offsetX: 30, offsetY: 26, width: 52, x: 90, y: 64 });
});

// 验证点击添加时能计算从商品珠飞到手链绳位的动画坐标。
test("calculateBeadFlightFrame 生成珠子放到绳子上的过渡动画坐标", () => {
  const frame = calculateBeadFlightFrame(
    { left: 20, top: 80, width: 40, height: 44 },
    { left: 140, top: 180, width: 52, height: 48 },
  );

  assert.deepEqual(frame, {
    arcX: 103,
    arcY: 119,
    endX: 166,
    endY: 204,
    easing: "cubic-bezier(.16, 1.08, .24, 1)",
    size: 44,
    startX: 40,
    startY: 102,
    durationMs: 980,
  });
});

// 验证电脑端横向距离更长时，点击添加动画会自动放慢并抬高弧线，避免显得突兀。
test("calculateBeadFlightFrame 在电脑端长距离移动时保持平滑过渡", () => {
  const frame = calculateBeadFlightFrame(
    { left: 880, top: 620, width: 58, height: 58 },
    { left: 240, top: 280, width: 52, height: 52 },
  );

  assert.ok(frame.durationMs >= 1100);
  assert.ok(frame.durationMs <= 1280);
  assert.ok(frame.arcY < 348);
});

// 验证手围按珠子直径和绳结余量估算，空值和坏数据不会污染展示。
test("estimateBraceletWristCm 估算手围并安全处理边界", () => {
  const items = [
    { id: "bead-1", diameterMm: 10, priceCents: 500 },
    { id: "bead-2", diameterMm: 8, priceCents: 500 },
    { id: "bead-3", diameterMm: 8, priceCents: 500 },
  ];

  assert.equal(estimateBraceletWristCm(items), 2.8);
  assert.equal(estimateBraceletWristCm([]), 0);
  assert.equal(estimateBraceletWristCm([{ id: "broken", diameterMm: 0, priceCents: 0 }]), 0);
});

// 验证音效不依赖外部音频资源，且能给添加、滚动、弹窗提供不同的轻反馈。
test("createInteractionSoundPlan 生成轻量 WebAudio 音效计划", () => {
  const addPlan = createInteractionSoundPlan("add");
  const rollPlan = createInteractionSoundPlan("roll");
  const modalPlan = createInteractionSoundPlan("modal");
  const mutedPlan = createInteractionSoundPlan("add", { muted: true });

  assert.equal(addPlan.muted, false);
  assert.deepEqual(addPlan.frequencies, [520, 760]);
  assert.ok(addPlan.durationMs <= 180);
  assert.notDeepEqual(rollPlan.frequencies, addPlan.frequencies);
  assert.notDeepEqual(modalPlan.frequencies, addPlan.frequencies);
  assert.equal(mutedPlan.muted, true);
  assert.deepEqual(mutedPlan.frequencies, []);
});

// 验证空白、未知分类和不完整商品不会破坏商品筛选结果。
test("filterProducts 安全处理边界筛选条件", () => {
  const validProduct = { id: "milk-8", category: "milk", name: "奶白晶", diameterMm: 8, priceCents: 400 };
  const invalidProduct = { id: "broken", category: "milk", name: "损坏珠子", diameterMm: 0, priceCents: 0 };

  assert.deepEqual(filterProducts([validProduct, invalidProduct], "all", "  "), [validProduct]);
  assert.deepEqual(filterProducts([validProduct], "unknown", ""), []);
  assert.deepEqual(filterProducts(null, "all", ""), []);
});

// 验证点击商品会生成一个独立的已选珠子状态。
test("addBraceletItem 添加商品并允许重复选择", () => {
  const product = { id: "clear-8", category: "clear", name: "净体白水晶", diameterMm: 8, priceCents: 500 };
  const firstResult = addBraceletItem(createInitialState(), product);
  const secondResult = addBraceletItem(firstResult.state, product);

  assert.equal(firstResult.error, null);
  assert.equal(secondResult.state.items.length, 2);
  assert.notEqual(secondResult.state.items[0].id, secondResult.state.items[1].id);
  assert.equal(secondResult.state.lastAddedItemId, secondResult.state.items[1].id);
});

// 验证不完整商品不会改变用户当前的手链选择。
test("addBraceletItem 拒绝不完整商品并保留状态", () => {
  const state = createInitialState();
  const result = addBraceletItem(state, { id: "broken", name: "损坏珠子" });

  assert.equal(result.state, state);
  assert.match(result.error.message, /商品信息不完整/);
});

// 验证达到配置上限时不会继续向手链中添加珠子。
test("addBraceletItem 在达到上限时返回错误且保持状态", () => {
  const product = { id: "clear-8", category: "clear", name: "净体白水晶", diameterMm: 8, priceCents: 500 };
  const fullState = addBraceletItem(createInitialState(), product, 1).state;
  const result = addBraceletItem(fullState, product, 1);

  assert.equal(result.state, fullState);
  assert.match(result.error.message, /不能再加/);
});

// 验证 DIY 手链最多只能加入 20 颗珠子。
test("addBraceletItem 默认最多添加 20 颗珠子", () => {
  const product = { id: "clear-8", category: "clear", name: "净体白水晶", diameterMm: 8, priceCents: 500 };
  const fullState = Array.from({ length: 20 }).reduce(
    (currentState) => addBraceletItem(currentState, product).state,
    createInitialState(),
  );
  const result = addBraceletItem(fullState, product);

  assert.equal(fullState.items.length, 20);
  assert.equal(result.state, fullState);
  assert.match(result.error.message, /20颗/);
});

// 验证用户可通过已选珠子按钮删除指定的珠子。
test("removeBraceletItem 仅删除目标珠子", () => {
  const product = { id: "clear-8", category: "clear", name: "净体白水晶", diameterMm: 8, priceCents: 500 };
  const first = addBraceletItem(createInitialState(), product).state;
  const second = addBraceletItem(first, product).state;
  const result = removeBraceletItem(second, first.items[0].id);

  assert.equal(result.error, null);
  assert.deepEqual(result.state.items.map((item) => item.id), [second.items[1].id]);
});

// 验证失效删除请求不会意外清空或修改手链。
test("removeBraceletItem 对不存在的珠子返回错误且保持状态", () => {
  const state = createInitialState();
  const result = removeBraceletItem(state, "bead-missing");

  assert.equal(result.state, state);
  assert.match(result.error.message, /没有找到/);
});

// 验证清空手链时所有编辑态都会一起复位，避免残留动画或选中状态。
test("createClearedBraceletState 清空珠子并复位编辑标记", () => {
  const product = { id: "clear-8", category: "clear", name: "净体白水晶", diameterMm: 8, priceCents: 500 };
  const state = rollBraceletItem(addBraceletItem(createInitialState(), product).state, "bead-1").state;
  const clearedState = createClearedBraceletState(state);

  assert.deepEqual(clearedState.items, []);
  assert.equal(clearedState.lastAddedItemId, null);
  assert.equal(clearedState.rollingItemId, null);
  assert.equal(clearedState.selectedItemId, null);
  assert.equal(clearedState.nextItemNumber, state.nextItemNumber);
});

// 验证轻点珠子只触发滚动状态，不会误删当前选择。
test("rollBraceletItem 标记指定珠子为滚动目标", () => {
  const product = { id: "clear-8", category: "clear", name: "净体白水晶", diameterMm: 8, priceCents: 500 };
  const state = addBraceletItem(createInitialState(), product).state;
  const result = rollBraceletItem(state, state.items[0].id);

  assert.equal(result.error, null);
  assert.equal(result.state.items.length, 1);
  assert.equal(result.state.rollingItemId, state.items[0].id);
});

// 验证拖入一个新商品时替换目标位置，而不是额外新增珠子。
test("replaceBraceletItem 保留位置并替换目标珠子", () => {
  const clear = { id: "clear-8", category: "clear", name: "净体白水晶", diameterMm: 8, priceCents: 500 };
  const rose = { id: "rose-8", category: "rose", name: "粉水晶", diameterMm: 8, priceCents: 600 };
  const state = addBraceletItem(createInitialState(), clear).state;
  const result = replaceBraceletItem(state, state.items[0].id, rose);

  assert.equal(result.error, null);
  assert.equal(result.state.items.length, 1);
  assert.deepEqual(result.state.items[0], {
    id: state.items[0].id,
    productId: "rose-8",
    name: "粉水晶",
    diameterMm: 8,
    priceCents: 600,
  });
});

// 验证商品拖到手链舞台空白区域时会添加新珠子。
test("applyProductDrop 拖到手链舞台时添加商品", () => {
  const product = { id: "clear-8", category: "clear", name: "净体白水晶", diameterMm: 8, priceCents: 500 };
  const result = applyProductDrop(createInitialState(), product, { type: "stage" });

  assert.equal(result.error, null);
  assert.equal(result.state.items.length, 1);
  assert.equal(result.state.items[0].productId, "clear-8");
});

// 验证 3D 展示使用整条手链，而不是单颗珠子。
test("getBraceletPreviewItems 返回整条手链并支持拖入商品预览", () => {
  const product = { id: "clear-8", category: "clear", name: "净体白水晶", diameterMm: 8, priceCents: 500 };
  const first = addBraceletItem(createInitialState(), product).state;
  const second = addBraceletItem(first, { ...product, id: "clear-10", diameterMm: 10 }).state;
  const previewProduct = { id: "rose-8", category: "rose", name: "粉水晶", diameterMm: 8, priceCents: 600 };
  const currentPreview = getBraceletPreviewItems(second);
  const draggedPreview = getBraceletPreviewItems(second, previewProduct);

  assert.equal(currentPreview.error, null);
  assert.deepEqual(currentPreview.items.map((item) => item.id), second.items.map((item) => item.id));
  assert.equal(draggedPreview.error, null);
  assert.equal(draggedPreview.items.length, 3);
  assert.equal(draggedPreview.items[2].productId, "rose-8");
  assert.deepEqual(getBraceletPreviewItems(createInitialState()).items, []);
});

// 验证 3D 手链预览具备深度排序和近大远小的空间关系。
test("calculateBracelet3DScene 生成近大远小的深度排序珠子", () => {
  const items = [
    { id: "bead-1", productId: "clear-8", name: "净体白水晶", diameterMm: 8, priceCents: 500 },
    { id: "bead-2", productId: "rose-8", name: "粉水晶", diameterMm: 8, priceCents: 600 },
    { id: "bead-3", productId: "tea-10", name: "茶水晶", diameterMm: 10, priceCents: 700 },
    { id: "bead-4", productId: "black-8", name: "黑曜石", diameterMm: 8, priceCents: 500 },
  ];
  const scene = calculateBracelet3DScene(items, 320, 240, 0);

  assert.equal(scene.error, null);
  assert.equal(scene.beads.length, 4);
  assert.ok(scene.beads.every((bead, index, beads) => index === 0 || bead.depth >= beads[index - 1].depth));
  assert.ok(scene.beads.at(-1).radius > scene.beads[0].radius);
  assert.ok(scene.beads.every((bead) => bead.materialOpacity === 1 && bead.shadowOpacity === 0));
});

// 验证 3D 展示使用实体珠子，不再生成背面底部落地阴影。
test("calculateBracelet3DScene 生成不透明实体珠且无底部阴影", () => {
  const items = Array.from({ length: 8 }, (_, index) => ({
    id: `bead-${index + 1}`,
    productId: index % 2 === 0 ? "black-8" : "rose-8",
    name: "测试珠",
    diameterMm: 8,
    priceCents: 500,
  }));
  const scene = calculateBracelet3DScene(items, 320, 240, 0.2);

  assert.equal(scene.error, null);
  assert.ok(scene.beads.every((bead) => bead.materialOpacity === 1));
  assert.ok(scene.beads.every((bead) => bead.shadowOpacity === 0));
  assert.ok(scene.beads.every((bead) => bead.internalLineOpacity === 0));
  assert.equal(scene.cordSegments.length, items.length);
});

// 验证 3D 场景会把真实商品图片与色调交给 canvas，避免只渲染统一的卡通渐变珠。
test("calculateBracelet3DScene 为珠子提供真实图片材质信息", () => {
  const items = [
    { id: "bead-1", productId: "rose-8", name: "粉水晶", diameterMm: 8, priceCents: 600 },
    { id: "bead-2", productId: "black-8", name: "黑曜石", diameterMm: 8, priceCents: 500 },
  ];
  const scene = calculateBracelet3DScene(items, 320, 240, 0.2);

  assert.equal(scene.error, null);
  assert.ok(scene.beads.every((bead) => bead.textureImageUrl?.startsWith("https://commons.wikimedia.org/")));
  assert.deepEqual(
    new Set(scene.beads.map((bead) => bead.tone)),
    new Set(["rose", "black"]),
  );
});

// 验证 3D 预览图片不启用匿名 CORS，否则 file:// 演示页会被远程图片响应头拦截而退回假色珠。
test("app.js 3D 真实珠子图片加载不设置匿名 CORS", () => {
  const js = readFileSync(new URL("../app.js", import.meta.url), "utf8");

  assert.doesNotMatch(js, /crossOrigin\s*=\s*["']anonymous["']/);
});

// 验证真实珠子图片异步加载完成后会补绘一次，兼容系统减少动态效果时只渲染首帧的场景。
test("app.js 3D 图片加载完成后会触发轻量补绘", () => {
  const js = readFileSync(new URL("../app.js", import.meta.url), "utf8");

  assert.match(js, /function getProductImage\(imageUrl, onLoad = null\)/);
  assert.match(js, /addEventListener\("load", onLoad, \{ once: true \}\)/);
  assert.match(js, /drawPreviewBead\(context, bead, rotation, onImageLoad\)/);
  assert.match(js, /renderInspectorBracelet\(elements, items, rotation, \{ skipImageLoadRedraw: true \}\)/);
});

// 验证订单弹窗展示整条手链的数量、总价和珠子明细，空手链直接返回用户提示。
test("createOrderSummary 生成确认订单展示信息并拒绝空手链", () => {
  const product = { id: "clear-8", category: "clear", name: "净体白水晶", diameterMm: 8, priceCents: 500 };
  const secondProduct = { ...product, id: "rose-10", name: "粉水晶", diameterMm: 10, priceCents: 900 };
  const state = addBraceletItem(addBraceletItem(addBraceletItem(createInitialState(), product).state, product).state, secondProduct).state;
  const summary = createOrderSummary(state.items);
  const emptySummary = createOrderSummary([]);

  assert.equal(summary.error, null);
  assert.equal(summary.count, 3);
  assert.equal(summary.totalCents, 1900);
  assert.deepEqual(summary.lines.map((line) => line.label), ["净体白水晶 8mm", "粉水晶 10mm"]);
  assert.deepEqual(summary.lines.map((line) => line.priceFormula), ["2 × ¥ 5.0", "1 × ¥ 9.0"]);
  assert.deepEqual(summary.lines.map((line) => line.subtotalCents), [1000, 900]);
  assert.equal(summary.preview.beads.length, 3);
  assert.ok(summary.preview.beads.every((bead) => Number.isFinite(bead.x) && Number.isFinite(bead.y) && bead.size > 0));
  assert.match(emptySummary.error.message, /请先添加珠子/);
});

// 验证 3D 展示采用无辅助线的斜向环绕，只靠珠子深度表达空间关系。
test("calculateBracelet3DScene 生成无线条的斜向环绕视角", () => {
  const items = Array.from({ length: 8 }, (_, index) => ({
    id: `bead-${index + 1}`,
    productId: "clear-8",
    name: "净体白水晶",
    diameterMm: 8,
    priceCents: 500,
  }));
  const scene = calculateBracelet3DScene(items, 320, 240, 0);
  const beadYValues = scene.beads.map((bead) => bead.y);

  assert.equal(scene.error, null);
  assert.deepEqual(scene.orbitPath, []);
  assert.equal(scene.axis, null);
  assert.ok(Math.max(...beadYValues) - Math.min(...beadYValues) > 90);
});

// 验证 3D 展示只生成珠子之间的麻绳段，不生成辅助轴线或轨道线。
test("calculateBracelet3DScene 生成珠间麻绳且不生成辅助线", () => {
  const items = Array.from({ length: 6 }, (_, index) => ({
    id: `bead-${index + 1}`,
    productId: "clear-8",
    name: "净体白水晶",
    diameterMm: 8,
    priceCents: 500,
  }));
  const scene = calculateBracelet3DScene(items, 320, 240, 0.5);

  assert.equal(scene.error, null);
  assert.equal(scene.axis, null);
  assert.deepEqual(scene.orbitPath, []);
  assert.equal(scene.cordSegments.length, items.length);
  assert.ok(scene.cordSegments.every((segment) => segment.kind === "hemp-cord"));
  assert.ok(scene.cordSegments.every((segment) => [segment.x1, segment.y1, segment.x2, segment.y2, segment.lineWidth].every(Number.isFinite)));
});

// 验证 3D 珠间麻绳使用弧线控制点，少量珠子时不呈现生硬多边形折线。
test("calculateBracelet3DScene 为珠间麻绳生成弧线控制点", () => {
  const items = Array.from({ length: 8 }, (_, index) => ({
    id: `bead-${index + 1}`,
    productId: "clear-8",
    name: "净体白水晶",
    diameterMm: 8,
    priceCents: 500,
  }));
  const scene = calculateBracelet3DScene(items, 390, 282, 0.4);

  assert.equal(scene.error, null);
  assert.ok(scene.cordSegments.every((segment) => Number.isFinite(segment.cx) && Number.isFinite(segment.cy)));
  assert.ok(scene.cordSegments.some((segment) => Math.abs(segment.cy - (segment.y1 + segment.y2) / 2) > 1));
});

// 验证 3D 手链视觉包围盒居中，避免弹窗里整圈珠子偏左或偏右。
test("calculateBracelet3DScene 居中整条 3D 手链", () => {
  const items = Array.from({ length: 20 }, (_, index) => ({
    id: `bead-${index + 1}`,
    productId: "rose-8",
    name: "粉水晶",
    diameterMm: 8,
    priceCents: 600,
  }));

  [0, 0.3, 0.8, 1.2].forEach((rotation) => {
    const width = 672;
    const height = 505;
    const scene = calculateBracelet3DScene(items, width, height, rotation);
    const minX = Math.min(...scene.beads.map((bead) => bead.x - bead.radiusX));
    const maxX = Math.max(...scene.beads.map((bead) => bead.x + bead.radiusX));
    const minY = Math.min(...scene.beads.map((bead) => bead.y - bead.radiusY));
    const maxY = Math.max(...scene.beads.map((bead) => bead.y + bead.radiusY));

    assert.ok(Math.abs((minX + maxX) / 2 - width / 2) <= 1.2);
    assert.ok(Math.abs((minY + maxY) / 2 - height / 2) <= 1.2);
  });
});

// 验证 3D 环绕保持产品展示视角，不会转成几乎一条竖线的纯侧视。
test("calculateBracelet3DScene 保持足够正的环绕视角", () => {
  const items = Array.from({ length: 20 }, (_, index) => ({
    id: `bead-${index + 1}`,
    productId: "rose-8",
    name: "粉水晶",
    diameterMm: 8,
    priceCents: 600,
  }));

  [0, 0.8, 1.6, 2.4].forEach((rotation) => {
    const width = 672;
    const scene = calculateBracelet3DScene(items, width, 505, rotation);
    const minX = Math.min(...scene.beads.map((bead) => bead.x - bead.radiusX));
    const maxX = Math.max(...scene.beads.map((bead) => bead.x + bead.radiusX));

    assert.ok(maxX - minX >= width * 0.22);
  });
});

// 验证 3D 后半圈珠子不会因为透视缩小过度而显得间隔过大。
test("calculateBracelet3DScene 控制后半圈珠子视觉间隔", () => {
  const items = Array.from({ length: 20 }, (_, index) => ({
    id: `bead-${index + 1}`,
    productId: "clear-8",
    name: "净体白水晶",
    diameterMm: 8,
    priceCents: 500,
  }));

  [0, 0.3, 0.8, 1.2].forEach((rotation) => {
    const scene = calculateBracelet3DScene(items, 390, 282, rotation);
    const orderedBeads = [...scene.beads].sort((left, right) => Number(left.id.split("-")[1]) - Number(right.id.split("-")[1]));
    const backGapRatios = orderedBeads
      .map((bead, index) => {
        const nextBead = orderedBeads[(index + 1) % orderedBeads.length];
        const averageDepth = (bead.depth + nextBead.depth) / 2;
        const averageRadius = (bead.radius + nextBead.radius) / 2;
        return { averageDepth, ratio: Math.hypot(nextBead.x - bead.x, nextBead.y - bead.y) / averageRadius };
      })
      .filter((gap) => gap.averageDepth < 0.45)
      .map((gap) => gap.ratio);

    assert.ok(Math.max(...backGapRatios) <= 2.65);
  });
});

// 验证 PC 尺寸下 20 颗珠子的 3D 环绕不会因为环半径过大显得前后都松散。
test("calculateBracelet3DScene 在 PC 展示压紧 20 颗珠子的视觉间隔", () => {
  const items = Array.from({ length: 20 }, (_, index) => ({
    id: `bead-${index + 1}`,
    productId: "clear-8",
    name: "净体白水晶",
    diameterMm: 8,
    priceCents: 500,
  }));
  const scene = calculateBracelet3DScene(items, 690, 520, 0.3);
  const orderedBeads = [...scene.beads].sort((left, right) => Number(left.id.split("-")[1]) - Number(right.id.split("-")[1]));
  const gapRatios = orderedBeads.map((bead, index) => {
    const nextBead = orderedBeads[(index + 1) % orderedBeads.length];
    const averageRadius = (bead.radius + nextBead.radius) / 2;

    return Math.hypot(nextBead.x - bead.x, nextBead.y - bead.y) / averageRadius;
  });

  assert.ok(Math.max(...gapRatios) <= 3.15);
});

// 验证 PC 尺寸下 20 颗珠子的首页顶视图不会松散到像散开的圆。
test("calculateBeadPositions 在 PC 首页压紧 20 颗珠子的视觉间隔", () => {
  const items = Array.from({ length: 20 }, (_, index) => ({
    id: `bead-${index + 1}`,
    diameterMm: 8,
    priceCents: 500,
  }));
  const { positions } = calculateBeadPositions(items, 690, 642);
  const gapRatios = positions.map((position, index) => {
    const nextPosition = positions[(index + 1) % positions.length];
    const averageSize = (position.size + nextPosition.size) / 2;

    return Math.hypot(nextPosition.x - position.x, nextPosition.y - position.y) / averageSize;
  });

  assert.ok(Math.max(...gapRatios) <= 1.72);
});

// 验证 PC 满珠时珠子自身足够大，视觉上能填满整条绳子。
test("calculateBeadPositions 在 PC 满 20 颗时放大珠子填满绳圈", () => {
  const items = Array.from({ length: 20 }, (_, index) => ({
    id: `bead-${index + 1}`,
    diameterMm: 8,
    priceCents: 500,
  }));
  const { positions } = calculateBeadPositions(items, 690, 642);
  const track = calculateBraceletTrackFrame(items, 690, 642);
  const coverageRatio = positions.reduce((total, position) => total + position.size, 0) / (Math.PI * 2 * track.radiusPx);
  const gapRatios = positions.map((position, index) => {
    const nextPosition = positions[(index + 1) % positions.length];
    const averageSize = (position.size + nextPosition.size) / 2;

    return Math.hypot(nextPosition.x - position.x, nextPosition.y - position.y) / averageSize;
  });

  assert.ok(Math.min(...positions.map((position) => position.size)) >= 44);
  assert.ok(coverageRatio >= 0.86);
  assert.ok(Math.max(...gapRatios) <= 1.18);
});

// 验证 PC 满珠时即使选择 6mm 小珠，也不会显得稀疏断裂。
test("calculateBeadPositions 在 PC 满 20 颗小珠时保留最低视觉填充", () => {
  const items = Array.from({ length: 20 }, (_, index) => ({
    id: `bead-${index + 1}`,
    diameterMm: 6,
    priceCents: 300,
  }));
  const { positions } = calculateBeadPositions(items, 690, 642);
  const track = calculateBraceletTrackFrame(items, 690, 642);
  const coverageRatio = positions.reduce((total, position) => total + position.size, 0) / (Math.PI * 2 * track.radiusPx);

  assert.ok(Math.min(...positions.map((position) => position.size)) >= 46);
  assert.ok(coverageRatio >= 0.84);
});

// 验证满珠时珠子坐标和 SVG 绳圈使用同一个动态半径，避免珠子落在线内侧。
test("calculateBraceletTrackFrame 与 calculateBeadPositions 使用同一条绳圈半径", () => {
  const items = Array.from({ length: 20 }, (_, index) => ({
    id: `bead-${index + 1}`,
    diameterMm: 8,
    priceCents: 500,
  }));
  const width = 690;
  const height = 642;
  const { positions } = calculateBeadPositions(items, width, height);
  const track = calculateBraceletTrackFrame(items, width, height);
  const distances = positions.map((position) => Math.hypot(position.x - width / 2, position.y - height / 2));

  assert.equal(track.error, null);
  assert.ok(track.viewBoxRadius < 320);
  assert.ok(distances.every((distance) => Math.abs(distance - track.radiusPx) < 0.001));
});

// 验证 3D 手链包含真实珠孔、前后麻绳遮挡和天然尺寸差异。
test("calculateBracelet3DScene 生成更真实的珠孔和麻绳层次", () => {
  const items = Array.from({ length: 12 }, (_, index) => ({
    id: `bead-${index + 1}`,
    productId: "clear-8",
    name: "净体白水晶",
    diameterMm: 8,
    priceCents: 500,
  }));
  const scene = calculateBracelet3DScene(items, 320, 240, 0.3);
  const radiusValues = scene.beads.map((bead) => bead.radius.toFixed(2));

  assert.equal(scene.error, null);
  assert.ok(scene.beads.every((bead) => bead.hole && bead.hole.radius > 0 && Number.isFinite(bead.hole.angle)));
  assert.ok(scene.beads.every((bead) => bead.radiusX > 0 && bead.radiusY > 0 && bead.textureSeed >= 0));
  assert.ok(new Set(radiusValues).size > 4);
  assert.equal(scene.cordSegments.length, items.length);
});

// 验证 3D 展示只输出整条手链本身，即使旧调用传入 tryOn 也不会再生成手腕背景层。
test("calculateBracelet3DScene 移除试戴手腕背景层", () => {
  const items = Array.from({ length: 12 }, (_, index) => ({
    id: `bead-${index + 1}`,
    productId: index % 2 === 0 ? "rose-8" : "black-8",
    name: "测试珠",
    diameterMm: 8,
    priceCents: 500,
  }));
  const normalScene = calculateBracelet3DScene(items, 390, 282, 0.3);
  const legacyTryOnScene = calculateBracelet3DScene(items, 390, 282, 0.3, { tryOn: true });

  assert.equal(normalScene.wrist, null);
  assert.equal(legacyTryOnScene.error, null);
  assert.equal(legacyTryOnScene.wrist, null);
  assert.equal(legacyTryOnScene.cordSegments.length, items.length);
});

// 验证已选珠子会生成实时价格、数量提示和环形预览坐标。
test("calculateSummary 与 calculateBeadPositions 计算手链预览数据", () => {
  const items = [
    { id: "bead-1", priceCents: 500, diameterMm: 8 },
    { id: "bead-2", priceCents: 800, diameterMm: 10 },
  ];
  const summary = calculateSummary(items);
  const layout = calculateBeadPositions(items, 1000, 600);

  assert.deepEqual(summary, { count: 2, totalCents: 1300, isInsufficient: true, error: null });
  assert.equal(layout.positions.length, 2);
  assert.equal(layout.error, null);
  assert.ok(layout.positions.every((position) => Number.isFinite(position.x) && Number.isFinite(position.y)));
});

// 验证数量阈值、空手链和无效预览尺寸均有确定结果。
test("calculateSummary 与 calculateBeadPositions 处理空值和边界", () => {
  assert.deepEqual(calculateSummary([], 1), { count: 0, totalCents: 0, isInsufficient: true, error: null });
  assert.equal(calculateSummary([{ id: "bead-1", priceCents: 300, diameterMm: 8 }], 1).isInsufficient, false);
  assert.equal(calculateSummary(null).error instanceof Error, true);
  assert.deepEqual(calculateBeadPositions([], 1000, 600), { positions: [], error: null });
  assert.equal(calculateBeadPositions([], 0, 600).error instanceof Error, true);
});

// 验证顶视预览中的每颗珠子到中心距离一致，形成圆形手链而不是扁椭圆。
test("calculateBeadPositions 按顶视圆环排列珠子", () => {
  const items = [
    { id: "bead-1", priceCents: 300, diameterMm: 8 },
    { id: "bead-2", priceCents: 300, diameterMm: 8 },
    { id: "bead-3", priceCents: 300, diameterMm: 8 },
  ];
  const { positions } = calculateBeadPositions(items, 600, 600);
  const distances = positions.map((position) => Math.hypot(position.x - 300, position.y - 300));

  assert.ok(distances.every((distance) => Math.abs(distance - distances[0]) < 0.001));
});
