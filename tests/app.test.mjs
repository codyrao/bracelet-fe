import test from "node:test";
import assert from "node:assert/strict";

import {
  addBraceletItem,
  createInitialState,
  calculateBeadPositions,
  calculateSummary,
  filterProducts,
  removeBraceletItem,
} from "../app.js";

// 验证商品库同时支持分类和关键词筛选。
test("filterProducts 按分类和关键词返回有效商品", () => {
  const products = [
    { id: "clear-8", category: "clear", name: "净体白水晶", diameterMm: 8, priceCents: 500 },
    { id: "milk-10", category: "milk", name: "奶白晶", diameterMm: 10, priceCents: 800 },
  ];

  assert.deepEqual(filterProducts(products, "clear", "8mm"), [products[0]]);
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
});

// 验证不完整商品不会改变用户当前的手链选择。
test("addBraceletItem 拒绝不完整商品并保留状态", () => {
  const state = createInitialState();
  const result = addBraceletItem(state, { id: "broken", name: "损坏珠子" });

  assert.equal(result.state, state);
  assert.match(result.error.message, /商品信息不完整/);
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
