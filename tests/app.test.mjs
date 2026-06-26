import test from "node:test";
import assert from "node:assert/strict";

import {
  addBraceletItem,
  applyProductDrop,
  buildBeadBackgroundImage,
  calculateDragGhostFrame,
  createInitialState,
  calculateBeadPositions,
  calculateBracelet3DScene,
  calculateSummary,
  filterProducts,
  getBraceletPreviewItems,
  replaceBraceletItem,
  removeBraceletItem,
  rollBraceletItem,
} from "../app.js";

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
  assert.ok(scene.beads.at(-1).shadowOpacity > scene.beads[0].shadowOpacity);
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

// 验证 3D 展示有真实串线数据，但不恢复辅助轨道线或斜轴线。
test("calculateBracelet3DScene 生成跟随珠子的真实串线", () => {
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
  assert.ok(scene.cordSegments.every((segment) => segment.thickness > 0 && segment.opacity > 0));
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
