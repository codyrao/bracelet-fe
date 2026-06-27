import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  addBraceletItem,
  applyProductDrop,
  buildBeadBackgroundImage,
  calculateBeadFlightFrame,
  calculateDragGhostFrame,
  createOrderSummary,
  createInitialState,
  createClearedBraceletState,
  calculateBeadPositions,
  calculateBracelet3DScene,
  calculateSummary,
  filterProducts,
  getBraceletPreviewItems,
  replaceBraceletItem,
  removeBraceletItem,
  rollBraceletItem,
} from "../app.js";

// 验证使用须知是可点击按钮，并有对应弹窗承载说明内容。
test("index.html 提供可打开的使用须知弹窗结构", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /<button[^>]+id="notice-button"/);
  assert.match(html, /<dialog[^>]+id="usage-dialog"/);
  assert.match(html, /aria-labelledby="usage-title"/);
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
    easing: "cubic-bezier(.18, .82, .18, 1)",
    size: 44,
    startX: 40,
    startY: 102,
    durationMs: 920,
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

// 验证 DIY 手链最多只能加入 16 颗珠子。
test("addBraceletItem 默认最多添加 16 颗珠子", () => {
  const product = { id: "clear-8", category: "clear", name: "净体白水晶", diameterMm: 8, priceCents: 500 };
  const fullState = Array.from({ length: 16 }).reduce(
    (currentState) => addBraceletItem(currentState, product).state,
    createInitialState(),
  );
  const result = addBraceletItem(fullState, product);

  assert.equal(fullState.items.length, 16);
  assert.equal(result.state, fullState);
  assert.match(result.error.message, /16颗/);
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
  assert.equal(scene.cordSegments.length, 0);
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

// 验证 3D 展示不再生成珠子之间的连接线。
test("calculateBracelet3DScene 不生成珠子之间的连接线", () => {
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
  assert.deepEqual(scene.cordSegments, []);
});

// 验证 3D 后半圈珠子不会因为透视缩小过度而显得间隔过大。
test("calculateBracelet3DScene 控制后半圈珠子视觉间隔", () => {
  const items = Array.from({ length: 16 }, (_, index) => ({
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
  assert.deepEqual(scene.cordSegments, []);
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
