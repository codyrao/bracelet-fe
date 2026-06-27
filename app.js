// 判断本地演示商品是否具备渲染和计价所需的字段。
function isValidProduct(product) {
  return Boolean(
    product &&
      typeof product.id === "string" &&
      typeof product.category === "string" &&
      typeof product.name === "string" &&
      Number.isFinite(product.diameterMm) &&
      product.diameterMm > 0 &&
      Number.isInteger(product.priceCents) &&
      product.priceCents > 0,
  );
}

// 创建页面首次加载时使用的可编辑手链状态。
export function createInitialState() {
  return {
    items: [],
    lastAddedItemId: null,
    nextItemNumber: 1,
    rollingItemId: null,
    selectedItemId: null,
    selectedCategory: "all",
    query: "",
  };
}

// 判断手链状态是否可安全用于新增珠子。
function isValidBraceletState(state) {
  return Boolean(state && Array.isArray(state.items) && Number.isInteger(state.nextItemNumber));
}

// 判断已选珠子是否可用于价格和轨道计算。
function isValidBraceletItem(item) {
  return Boolean(
    item &&
      typeof item.id === "string" &&
      Number.isInteger(item.priceCents) &&
      item.priceCents > 0 &&
      Number.isFinite(item.diameterMm) &&
      item.diameterMm > 0,
  );
}

// 将一个商品加入手链，并返回新状态或可供界面提示的错误。
export function addBraceletItem(state, product, maximumCount = 16) {
  if (!isValidBraceletState(state)) {
    return { state: createInitialState(), error: new Error("手链状态无效，已恢复为空状态。") };
  }

  if (!Number.isInteger(maximumCount) || maximumCount < 1) {
    return { state, error: new Error("珠子上限配置无效。") };
  }

  if (!isValidProduct(product)) {
    return { state, error: new Error("商品信息不完整，无法加入手链。") };
  }

  if (state.items.length >= maximumCount) {
    return { state, error: new Error(`珠子数量已满（${maximumCount}颗），不能再加了。`) };
  }

  const item = {
    id: `bead-${state.nextItemNumber}`,
    productId: product.id,
    name: product.name,
    diameterMm: product.diameterMm,
    priceCents: product.priceCents,
  };

  return {
    state: {
      ...state,
      items: [...state.items, item],
      lastAddedItemId: item.id,
      nextItemNumber: state.nextItemNumber + 1,
      selectedItemId: item.id,
    },
    error: null,
  };
}

// 用新商品替换指定位置的珠子，保留该位置的稳定标识和排布顺序。
export function replaceBraceletItem(state, itemId, product) {
  if (!isValidBraceletState(state)) {
    return { state: createInitialState(), error: new Error("手链状态无效，已恢复为空状态。") };
  }

  if (!isValidProduct(product)) {
    return { state, error: new Error("商品信息不完整，无法替换珠子。") };
  }

  if (!state.items.some((item) => item.id === itemId)) {
    return { state, error: new Error("没有找到要替换的珠子。") };
  }

  return {
    state: {
      ...state,
      items: state.items.map((item) => (
        item.id === itemId
          ? { ...item, productId: product.id, name: product.name, diameterMm: product.diameterMm, priceCents: product.priceCents }
          : item
      )),
      lastAddedItemId: itemId,
      rollingItemId: null,
      selectedItemId: itemId,
    },
    error: null,
  };
}

// 删除指定的已选珠子，并在目标不存在时保留原状态。
export function removeBraceletItem(state, itemId) {
  if (!isValidBraceletState(state)) {
    return { state: createInitialState(), error: new Error("手链状态无效，已恢复为空状态。") };
  }

  const remainingItems = state.items.filter((item) => item.id !== itemId);
  if (remainingItems.length === state.items.length) {
    return { state, error: new Error("没有找到要删除的珠子。") };
  }

  const nextSelectedItemId = state.selectedItemId === itemId
    ? remainingItems[remainingItems.length - 1]?.id ?? null
    : state.selectedItemId ?? null;

  return {
    state: { ...state, items: remainingItems, lastAddedItemId: null, rollingItemId: null, selectedItemId: nextSelectedItemId },
    error: null,
  };
}

// 清空手链选择，并同步复位所有只用于编辑反馈的临时标记。
export function createClearedBraceletState(state) {
  if (!isValidBraceletState(state)) {
    return createInitialState();
  }

  return { ...state, items: [], lastAddedItemId: null, rollingItemId: null, selectedItemId: null };
}

// 标记一颗珠子播放滚动动效，不改变手链中的珠子数量和顺序。
export function rollBraceletItem(state, itemId) {
  if (!isValidBraceletState(state)) {
    return { state: createInitialState(), error: new Error("手链状态无效，已恢复为空状态。") };
  }

  if (!state.items.some((item) => item.id === itemId)) {
    return { state, error: new Error("没有找到要滚动的珠子。") };
  }

  return { state: { ...state, rollingItemId: itemId, selectedItemId: itemId }, error: null };
}

// 根据商品拖拽释放位置决定添加或替换，供指针交互复用。
export function applyProductDrop(state, product, dropTarget, maximumCount = 16) {
  if (dropTarget?.type === "item") {
    return replaceBraceletItem(state, dropTarget.itemId, product);
  }

  if (dropTarget?.type === "stage") {
    return addBraceletItem(state, product, maximumCount);
  }

  return { state, error: new Error("请把珠子拖到手链区域添加，或拖到已有珠子上替换。") };
}

// 生成 3D 展示要用的整条手链数据，拖入商品时只做临时预览不改真实状态。
export function getBraceletPreviewItems(state, previewProduct = null, maximumCount = 16) {
  if (!isValidBraceletState(state) || state.items.length === 0) {
    if (!previewProduct) {
      return { items: [], error: null };
    }
  }

  if (!previewProduct) {
    return { items: isValidBraceletState(state) ? [...state.items] : [], error: null };
  }

  const result = addBraceletItem(
    isValidBraceletState(state) ? state : createInitialState(),
    previewProduct,
    maximumCount,
  );

  if (result.error) {
    return { items: isValidBraceletState(state) ? [...state.items] : [], error: result.error };
  }

  return { items: result.state.items, error: null };
}

// 汇总已选数量、总价和最少珠子数量提示。
export function calculateSummary(items, minimumCount = 16) {
  if (!Array.isArray(items) || !Number.isInteger(minimumCount) || minimumCount < 1) {
    return {
      count: 0,
      totalCents: 0,
      isInsufficient: true,
      error: new Error("手链汇总参数无效。"),
    };
  }

  const validItems = items.filter(isValidBraceletItem);
  const hasInvalidItem = validItems.length !== items.length;

  return {
    count: validItems.length,
    totalCents: validItems.reduce((total, item) => total + item.priceCents, 0),
    isInsufficient: validItems.length < minimumCount,
    error: hasInvalidItem ? new Error("已忽略字段不完整的已选珠子。") : null,
  };
}

// 为已选珠子计算沿椭圆轨道分布的预览坐标。
export function calculateBeadPositions(items, width, height) {
  if (!Array.isArray(items) || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { positions: [], error: new Error("手链预览尺寸无效。") };
  }

  if (items.some((item) => !isValidBraceletItem(item))) {
    return { positions: [], error: new Error("已选珠子信息不完整，无法生成预览。") };
  }

  const totalWeight = items.reduce((total, item) => total + item.diameterMm + 4, 0);
  let consumedWeight = 0;
  const centerX = width / 2;
  const centerY = height / 2;
  // 顶视图统一使用最短边计算半径，避免不同屏幕比例压扁手链。
  const radius = Math.min(width, height) * 0.32;

  const positions = items.map((item) => {
    const weight = item.diameterMm + 4;
    const angle = -Math.PI / 2 + ((consumedWeight + weight / 2) / totalWeight) * Math.PI * 2;
    consumedWeight += weight;

    return {
      id: item.id,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      size: Math.max(28, Math.min(52, item.diameterMm * 4)),
    };
  });

  return { positions, error: null };
}

// 用稳定哈希给每颗珠子生成细微差异，避免 3D 预览像复制粘贴的塑料球。
function createStableUnit(seedText) {
  const text = String(seedText ?? "");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

// 为 canvas 3D 展示计算投影坐标、半径和深度排序，制造近大远小的真实空间感。
export function calculateBracelet3DScene(items, width = 320, height = 240, rotation = 0) {
  if (!Array.isArray(items) || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { axis: null, beads: [], cordSegments: [], error: new Error("3D 手链预览参数无效。"), orbitPath: [] };
  }

  if (items.some((item) => !isValidBraceletItem(item))) {
    return { axis: null, beads: [], cordSegments: [], error: new Error("已选珠子信息不完整，无法生成 3D 预览。"), orbitPath: [] };
  }

  const centerX = width / 2;
  const centerY = height * 0.5;
  const ringRadius = Math.min(width, height) * 0.36;
  const cameraDistance = Math.min(width, height) * 1.9;
  const orbitSlant = -0.44;
  const viewRotation = rotation + 0.78;

  // 把圆形手链先绕 Z 轴倾斜，再绕 Y 轴环绕，最后用透视相机投影到画布。
  function projectRingPoint(angle, radius = ringRadius) {
    const localX = Math.cos(angle) * radius;
    const localY = Math.sin(angle) * radius;
    const slantedX = localX * Math.cos(orbitSlant) - localY * Math.sin(orbitSlant);
    const slantedY = localX * Math.sin(orbitSlant) + localY * Math.cos(orbitSlant);
    const worldX = slantedX * Math.cos(viewRotation);
    const worldZ = -slantedX * Math.sin(viewRotation);
    const perspective = cameraDistance / (cameraDistance - worldZ);
    const depth = (worldZ / ringRadius + 1) / 2;

    return {
      depth,
      perspective,
      x: centerX + worldX * perspective,
      y: centerY + slantedY * perspective,
      z: worldZ,
    };
  }

  const projectedBeads = items.map((item, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(items.length, 1)) * Math.PI * 2 + rotation;
    const point = projectRingPoint(angle);
    const tangentStart = projectRingPoint(angle - 0.035);
    const tangentEnd = projectRingPoint(angle + 0.035);
    const normalizedDepth = Math.max(0, Math.min(1, point.depth));
    const textureSeed = createStableUnit(`${item.id}:${item.productId}:${index}`);
    const shapeSeed = createStableUnit(`${item.id}:shape:${index}`);
    const naturalScale = 0.965 + textureSeed * 0.07;
    const radius = Math.max(13, Math.min(28, item.diameterMm * 2.15)) * naturalScale * (0.9 + normalizedDepth * 0.16) * point.perspective;
    const tangentAngle = Math.atan2(tangentEnd.y - tangentStart.y, tangentEnd.x - tangentStart.x);
    const radiusX = radius * (0.97 + shapeSeed * 0.055);
    const radiusY = radius * (0.92 + normalizedDepth * 0.075 + createStableUnit(`${item.id}:height`) * 0.025);
    const holeRadius = Math.max(1.6, radius * (0.105 + textureSeed * 0.025));

    return {
      depth: normalizedDepth,
      hole: {
        angle: tangentAngle,
        opacity: 0.36 + normalizedDepth * 0.28,
        radius: holeRadius,
        x: point.x + Math.cos(tangentAngle) * radius * 0.045,
        y: point.y + Math.sin(tangentAngle) * radius * 0.045,
      },
      id: item.id,
      internalLineOpacity: 0,
      item,
      materialOpacity: 1,
      radius,
      radiusX,
      radiusY,
      shadowOpacity: 0,
      textureSeed,
      tilt: (shapeSeed - 0.5) * 0.18,
      x: point.x,
      y: point.y,
    };
  });
  const beads = [...projectedBeads];
  beads.sort((left, right) => left.depth - right.depth);
  return { axis: null, beads, cordSegments: [], error: null, orbitPath: [] };
}

// 原型使用的本地商品库，避免依赖网络图片或后端接口。
const PRODUCTS = [
  { id: "clear-6", category: "clear", name: "净体白水晶", diameterMm: 6, priceCents: 300, tone: "clear", imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Rock_crystal_beads.jpg?width=420", sourceUrl: "https://commons.wikimedia.org/wiki/File:Rock_crystal_beads.jpg" },
  { id: "clear-8", category: "clear", name: "净体白水晶", diameterMm: 8, priceCents: 500, tone: "clear", imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Rock_crystal_beads.jpg?width=420", sourceUrl: "https://commons.wikimedia.org/wiki/File:Rock_crystal_beads.jpg" },
  { id: "clear-10", category: "clear", name: "净体白水晶", diameterMm: 10, priceCents: 1000, tone: "clear", imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Glass_and_rock_crystal_beads_MET_sf151301color.jpg?width=420", sourceUrl: "https://commons.wikimedia.org/wiki/File:Glass_and_rock_crystal_beads_MET_sf151301color.jpg" },
  { id: "milk-8", category: "milk", name: "奶白晶", diameterMm: 8, priceCents: 400, tone: "milk", imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Glass_and_rock_crystal_beads_MET_sf151301color.jpg?width=420", sourceUrl: "https://commons.wikimedia.org/wiki/File:Glass_and_rock_crystal_beads_MET_sf151301color.jpg" },
  { id: "milk-10", category: "milk", name: "奶白晶", diameterMm: 10, priceCents: 800, tone: "milk", imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Beads_from_a_Necklace_MET_dp30573.jpg?width=420", sourceUrl: "https://commons.wikimedia.org/wiki/File:Beads_from_a_Necklace_MET_dp30573.jpg" },
  { id: "rose-8", category: "rose", name: "粉水晶", diameterMm: 8, priceCents: 600, tone: "rose", imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Rose_Quartz_Bracelet.jpg?width=420", sourceUrl: "https://commons.wikimedia.org/wiki/File:Rose_Quartz_Bracelet.jpg" },
  { id: "rose-10", category: "rose", name: "粉水晶", diameterMm: 10, priceCents: 900, tone: "rose", imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Rose_Quartz_Bracelet.jpg?width=420", sourceUrl: "https://commons.wikimedia.org/wiki/File:Rose_Quartz_Bracelet.jpg" },
  { id: "tea-10", category: "tea", name: "茶水晶", diameterMm: 10, priceCents: 700, tone: "tea", imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Baltic_amber_bracelet_honey_color.jpg?width=420", sourceUrl: "https://commons.wikimedia.org/wiki/File:Baltic_amber_bracelet_honey_color.jpg" },
  { id: "amber-8", category: "amber", name: "琥珀", diameterMm: 8, priceCents: 900, tone: "tea", imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Baltic_amber_bracelet_with_mix_of_colors.jpg?width=420", sourceUrl: "https://commons.wikimedia.org/wiki/File:Baltic_amber_bracelet_with_mix_of_colors.jpg" },
  { id: "black-8", category: "black", name: "黑曜石", diameterMm: 8, priceCents: 500, tone: "black", imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Necklace_of_Hapiankhtifi_MET_12.183.13a_b_0016.jpg?width=420", sourceUrl: "https://commons.wikimedia.org/wiki/File:Necklace_of_Hapiankhtifi_MET_12.183.13a_b_0016.jpg" },
  { id: "amethyst-8", category: "amethyst", name: "紫水晶", diameterMm: 8, priceCents: 700, tone: "rose", imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Amethyst_Necklace_with_lavender_amethyst_beads.jpg?width=420", sourceUrl: "https://commons.wikimedia.org/wiki/File:Amethyst_Necklace_with_lavender_amethyst_beads.jpg" },
  { id: "mixed-8", category: "mixed", name: "古法彩珠", diameterMm: 8, priceCents: 600, tone: "tea", imageUrl: "https://commons.wikimedia.org/wiki/Special:FilePath/Pgbeads7.JPG?width=420", sourceUrl: "https://commons.wikimedia.org/wiki/File:Pgbeads7.JPG" },
];

// 集中保存演示原型的可调整业务规则。
const RULES = {
  maximumBeadCount: 16,
  minimumBeadCount: 16,
};

// 侧边分类与商品库 category 字段一一对应。
const CATEGORIES = [
  { id: "all", label: "全部" },
  { id: "clear", label: "白水晶" },
  { id: "milk", label: "奶白晶" },
  { id: "rose", label: "粉水晶" },
  { id: "tea", label: "茶水晶" },
  { id: "amber", label: "琥珀" },
  { id: "black", label: "黑曜石" },
  { id: "amethyst", label: "紫水晶" },
  { id: "mixed", label: "彩珠" },
];

// canvas 3D 预览使用的材质色板，和商品 tone 字段保持一致。
const TONE_PALETTES = {
  black: { core: "#17181d", edge: "#050507", highlight: "#868993", mid: "#3b3d45", shine: "rgba(255,255,255,.42)" },
  clear: { core: "#ececf1", edge: "#a9a8b0", highlight: "#ffffff", mid: "#c9c8cf", shine: "rgba(255,255,255,.76)" },
  milk: { core: "#f5f0f1", edge: "#cfc4c7", highlight: "#ffffff", mid: "#e2dadd", shine: "rgba(255,255,255,.72)" },
  rose: { core: "#ecc0cf", edge: "#b97f94", highlight: "#fff4f8", mid: "#d79aae", shine: "rgba(255,246,250,.7)" },
  tea: { core: "#cfaa82", edge: "#75503f", highlight: "#fff0db", mid: "#a87a5c", shine: "rgba(255,232,196,.62)" },
};
const PRODUCT_IMAGE_CACHE = new Map();
const TONE_BACKGROUNDS = {
  black: "radial-gradient(circle at 29% 23%, #a3a5ad 0 7%, transparent 18%), radial-gradient(circle at 68% 72%, rgb(0 0 0 / 42%), transparent 35%), conic-gradient(from 218deg, #07080b, #4f5159 20%, #111217 42%, #686a72 62%, #050507 83%, #07080b)",
  clear: "radial-gradient(circle at 28% 24%, rgb(255 255 255 / 92%) 0 8%, transparent 18%), radial-gradient(circle at 66% 72%, rgb(102 99 108 / 24%), transparent 32%), conic-gradient(from 218deg at 48% 52%, #8e8c94, #f8f8fb 15%, #b9b8c0 32%, #fff 49%, #bebbc4 73%, #f6f6f9 88%, #8e8c94)",
  milk: "radial-gradient(circle at 28% 24%, #fff 0 8%, transparent 18%), radial-gradient(circle at 68% 72%, rgb(151 130 136 / 22%), transparent 34%), conic-gradient(from 218deg, #c5babd, #fffdfa 19%, #e3dadd 44%, #fdf9f7 62%, #c8bcc0 83%, #c5babd)",
  rose: "radial-gradient(circle at 28% 24%, #fff7fb 0 8%, transparent 18%), radial-gradient(circle at 68% 72%, rgb(136 71 93 / 24%), transparent 34%), conic-gradient(from 218deg, #a86f86, #f0c6d3 20%, #c98b9f 42%, #fae4eb 62%, #aa7088 83%, #a86f86)",
  tea: "radial-gradient(circle at 28% 24%, #fff1db 0 8%, transparent 18%), radial-gradient(circle at 68% 72%, rgb(59 35 26 / 25%), transparent 34%), conic-gradient(from 218deg, #674535, #d8aa7c 22%, #9e6c4e 43%, #eecaa0 63%, #654333 82%, #674535)",
};

// 拼接真实图片和本地材质兜底，避免图片失败时所有珠子变成统一浅色底。
export function buildBeadBackgroundImage(product) {
  const fallbackBackground = TONE_BACKGROUNDS[product?.tone] ?? TONE_BACKGROUNDS.clear;
  return product?.imageUrl ? `url("${product.imageUrl}"), ${fallbackBackground}` : fallbackBackground;
}

// 计算点击商品后珠子从商品卡飞到手链绳位的动画关键坐标。
export function calculateBeadFlightFrame(sourceRect, targetRect) {
  if (!sourceRect || !targetRect) {
    return null;
  }

  const sourceWidth = Number.isFinite(sourceRect.width) ? sourceRect.width : 0;
  const sourceHeight = Number.isFinite(sourceRect.height) ? sourceRect.height : 0;
  const targetWidth = Number.isFinite(targetRect.width) ? targetRect.width : 0;
  const targetHeight = Number.isFinite(targetRect.height) ? targetRect.height : 0;
  if (sourceWidth <= 0 || sourceHeight <= 0 || targetWidth <= 0 || targetHeight <= 0) {
    return null;
  }

  const startX = sourceRect.left + sourceWidth / 2;
  const startY = sourceRect.top + sourceHeight / 2;
  const endX = targetRect.left + targetWidth / 2;
  const endY = targetRect.top + targetHeight / 2;
  const travelDistance = Math.hypot(endX - startX, endY - startY);
  const arcLift = Math.max(34, Math.min(132, travelDistance * 0.18));
  const durationMs = Math.max(920, Math.min(1280, Math.round(760 + travelDistance * 0.55)));

  return {
    arcX: (startX + endX) / 2,
    arcY: (startY + endY) / 2 - arcLift,
    durationMs,
    easing: "cubic-bezier(.18, .82, .18, 1)",
    endX: targetRect.left + targetWidth / 2,
    endY: targetRect.top + targetHeight / 2,
    size: Math.max(sourceWidth, sourceHeight),
    startX,
    startY,
  };
}

// 生成确认订单弹窗使用的摘要信息，只做前端展示，不创建真实订单。
export function createOrderSummary(items) {
  const summary = calculateSummary(items, RULES.minimumBeadCount);
  if (!Array.isArray(items) || items.length === 0) {
    return { count: 0, error: new Error("请先添加珠子，再确认订单。"), lines: [], preview: { beads: [], height: 170, width: 260 }, totalCents: 0 };
  }

  if (summary.error) {
    return { count: 0, error: summary.error, lines: [], preview: { beads: [], height: 170, width: 260 }, totalCents: 0 };
  }

  const groupedLines = new Map();
  items.forEach((item) => {
    const unitPriceCents = Number.isFinite(item.priceCents) ? item.priceCents : 0;
    const label = `${item.name ?? "未知珠子"} ${item.diameterMm ?? "-"}mm`;
    const key = `${label}:${unitPriceCents}`;
    const currentLine = groupedLines.get(key) ?? { id: key, label, quantity: 0, unitPriceCents };
    currentLine.quantity += 1;
    currentLine.subtotalCents = currentLine.quantity * currentLine.unitPriceCents;
    currentLine.priceFormula = `${currentLine.quantity} × ${formatPrice(currentLine.unitPriceCents)}`;
    groupedLines.set(key, currentLine);
  });

  const previewLayout = calculateBeadPositions(items, 260, 170);
  const previewBeads = previewLayout.positions.map((position) => {
    const item = items.find((candidate) => candidate.id === position.id);
    return { ...position, name: item?.name ?? "珠子", productId: item?.productId ?? null };
  });

  return {
    count: summary.count,
    error: previewLayout.error,
    lines: [...groupedLines.values()],
    preview: { beads: previewBeads, height: 170, width: 260 },
    totalCents: summary.totalCents,
  };
}

// 根据触点在原珠子中的相对位置计算拖拽浮层的位置和尺寸，确保动画跟手对齐。
export function calculateDragGhostFrame(pointer, sourceRect, ghostSize) {
  if (!pointer || !sourceRect || !ghostSize) {
    return { height: 48, offsetX: 24, offsetY: 24, width: 48, x: 0, y: 0 };
  }

  const width = Number.isFinite(ghostSize.width) && ghostSize.width > 0 ? ghostSize.width : sourceRect.width || 48;
  const height = Number.isFinite(ghostSize.height) && ghostSize.height > 0 ? ghostSize.height : sourceRect.height || 48;
  const sourceWidth = sourceRect.width || width;
  const sourceHeight = sourceRect.height || height;
  const offsetX = Math.max(0, Math.min(width, pointer.clientX - sourceRect.left + (width - sourceWidth) / 2));
  const offsetY = Math.max(0, Math.min(height, pointer.clientY - sourceRect.top + (height - sourceHeight) / 2));

  return {
    height,
    offsetX,
    offsetY,
    width,
    x: pointer.clientX - offsetX,
    y: pointer.clientY - offsetY,
  };
}

// 用于在静态原型中展示价格，金额统一以分保存在状态中。
function formatPrice(priceCents) {
  return `¥ ${(priceCents / 100).toFixed(1)}`;
}

// 将操作错误以开发诊断方式记录，页面仍保留可继续编辑的状态。
function warnAndReturn(error) {
  if (error) {
    console.warn(error.message);
  }
}

// 创建带文本内容的元素，避免将搜索输入或商品字段拼接成 HTML。
function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  return element;
}

// 渲染左侧分类按钮，并同步当前筛选状态。
function renderCategories(elements, state) {
  elements.categoryList.replaceChildren(
    ...CATEGORIES.map((category) => {
      const button = createTextElement("button", "category-button", category.label);
      button.type = "button";
      button.dataset.category = category.id;
      button.classList.toggle("is-active", state.selectedCategory === category.id);
      button.setAttribute("aria-pressed", String(state.selectedCategory === category.id));
      return button;
    }),
  );
}

// 渲染当前筛选条件下的商品卡和无结果空态。
function renderProducts(elements, state) {
  const products = filterProducts(PRODUCTS, state.selectedCategory, state.query);
  const isAtMaximum = state.items.length >= RULES.maximumBeadCount;
  elements.productGrid.replaceChildren(
    ...products.map((product) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "product-card";
      button.dataset.productId = product.id;
      button.draggable = false;
      button.classList.toggle("is-limit", isAtMaximum);
      button.setAttribute("aria-label", `添加${product.name} ${product.diameterMm}毫米，${formatPrice(product.priceCents)}`);

      const bead = document.createElement("span");
      bead.className = `product-bead tone-${product.tone}`;
      bead.style.setProperty("--bead-diameter", `${Math.max(28, Math.min(48, product.diameterMm * 4))}px`);
      bead.style.backgroundImage = buildBeadBackgroundImage(product);
      if (product.imageUrl) {
        bead.classList.add("has-photo");
      }

      const name = createTextElement("strong", "product-name", product.name);
      const detail = createTextElement("span", "product-detail", `${product.diameterMm}mm · ${formatPrice(product.priceCents)}`);
      button.append(bead, name, detail);
      return button;
    }),
  );
  elements.noResults.hidden = products.length > 0;
}

// 按当前状态更新数量提示、总价和清空按钮。
function renderSummary(elements, state) {
  const summary = calculateSummary(state.items, RULES.minimumBeadCount);
  warnAndReturn(summary.error);
  const isAtMaximum = summary.count >= RULES.maximumBeadCount;
  elements.countStatus.textContent = isAtMaximum
    ? `珠子数量已满（${RULES.maximumBeadCount}/${RULES.maximumBeadCount}）`
    : summary.isInsufficient
      ? `珠子数量不足（${summary.count}/${RULES.minimumBeadCount}）`
      : `珠子数量已满（${RULES.maximumBeadCount}/${RULES.maximumBeadCount}）`;
  elements.countStatus.classList.toggle("is-ready", !summary.isInsufficient);
  elements.countStatus.classList.toggle("is-limit", isAtMaximum);
  elements.priceStatus.textContent = `总价格: ${formatPrice(summary.totalCents)}`;
  elements.clearButton.disabled = summary.count === 0;
}

// 获取 3D 预览绘制材质，缺失商品时回落到白水晶。
function getTonePalette(productId) {
  const tone = PRODUCTS.find((candidate) => candidate.id === productId)?.tone ?? "clear";
  return TONE_PALETTES[tone] ?? TONE_PALETTES.clear;
}

// 懒加载真实珠子图片，canvas 未加载完成时仍使用本地渐变材质兜底。
function getProductImage(imageUrl) {
  if (!imageUrl || typeof Image === "undefined") {
    return null;
  }

  if (PRODUCT_IMAGE_CACHE.has(imageUrl)) {
    return PRODUCT_IMAGE_CACHE.get(imageUrl);
  }

  const image = new Image();
  image.crossOrigin = "anonymous";
  image.decoding = "async";
  image.src = imageUrl;
  PRODUCT_IMAGE_CACHE.set(imageUrl, image);
  return image;
}

// 按 cover 方式把真实珠子图片裁进圆形区域。
function drawCoverImage(context, image, x, y, diameter) {
  const scale = Math.max(diameter / image.naturalWidth, diameter / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, x - drawWidth / 2, y - drawHeight / 2, drawWidth, drawHeight);
}

// 在 canvas 上绘制单颗实体珠子，包含暗边、珠孔和高光，但不展示内部线条。
function drawPreviewBead(context, bead, rotation) {
  const product = PRODUCTS.find((candidate) => candidate.id === bead.item.productId);
  const palette = getTonePalette(bead.item.productId);
  const productImage = getProductImage(product?.imageUrl);
  const radiusX = bead.radiusX ?? bead.radius;
  const radiusY = bead.radiusY ?? bead.radius;
  const maxRadius = Math.max(radiusX, radiusY);
  const gradient = context.createRadialGradient(
    bead.x - radiusX * 0.38,
    bead.y - radiusY * 0.44,
    maxRadius * 0.08,
    bead.x,
    bead.y,
    maxRadius * 1.04,
  );
  gradient.addColorStop(0, palette.highlight);
  gradient.addColorStop(0.18, palette.core);
  gradient.addColorStop(0.72, palette.mid);
  gradient.addColorStop(1, palette.edge);

  context.save();
  context.beginPath();
  context.ellipse(bead.x, bead.y, radiusX, radiusY, bead.tilt ?? 0, 0, Math.PI * 2);
  context.clip();
  if (productImage?.complete && productImage.naturalWidth > 0) {
    drawCoverImage(context, productImage, bead.x, bead.y, maxRadius * 2.12);
    context.globalAlpha = 0.82;
    context.fillStyle = gradient;
    context.fillRect(bead.x - maxRadius, bead.y - maxRadius, maxRadius * 2, maxRadius * 2);
    context.globalAlpha = 1;
  } else {
    context.fillStyle = gradient;
    context.fillRect(bead.x - maxRadius, bead.y - maxRadius, maxRadius * 2, maxRadius * 2);
  }

  if (bead.internalLineOpacity > 0) {
    context.globalAlpha = bead.internalLineOpacity;
    context.strokeStyle = palette.shine;
    context.lineWidth = Math.max(0.8, maxRadius * 0.055);
    for (let offset = -1; offset <= 1; offset += 1) {
      const lineShift = offset * maxRadius * 0.55 + Math.sin(rotation + bead.depth * 4 + bead.textureSeed * 3) * 2;
      context.beginPath();
      context.moveTo(bead.x - radiusX * 0.95, bead.y + lineShift + radiusY * 0.48);
      context.bezierCurveTo(
        bead.x - radiusX * 0.22,
        bead.y + lineShift - radiusY * 0.18,
        bead.x + radiusX * 0.4,
        bead.y + lineShift - radiusY * 0.28,
        bead.x + radiusX * 0.95,
        bead.y + lineShift - radiusY * 0.62,
      );
      context.stroke();
    }
  }

  context.globalAlpha = 0.18 + bead.depth * 0.1;
  context.fillStyle = palette.highlight;
  for (let dotIndex = 0; dotIndex < 4; dotIndex += 1) {
    const dotAngle = rotation * 0.7 + bead.depth * 5 + dotIndex * 1.7;
    const dotRadius = maxRadius * (0.18 + dotIndex * 0.06);
    context.beginPath();
    context.ellipse(
      bead.x + Math.cos(dotAngle) * dotRadius,
      bead.y + Math.sin(dotAngle * 1.3) * dotRadius * 0.55,
      maxRadius * (0.08 + dotIndex * 0.012),
      maxRadius * 0.035,
      dotAngle,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  context.globalAlpha = 0.72;
  context.fillStyle = palette.shine;
  context.beginPath();
  context.ellipse(
    bead.x - radiusX * 0.35,
    bead.y - radiusY * 0.38,
    maxRadius * 0.23,
    maxRadius * 0.12,
    -0.55,
    0,
    Math.PI * 2,
  );
  context.fill();

  if (bead.hole) {
    const holeGradient = context.createRadialGradient(
      bead.hole.x - bead.hole.radius * 0.25,
      bead.hole.y - bead.hole.radius * 0.35,
      bead.hole.radius * 0.1,
      bead.hole.x,
      bead.hole.y,
      bead.hole.radius * 1.45,
    );
    holeGradient.addColorStop(0, "rgba(255, 244, 225, .35)");
    holeGradient.addColorStop(0.38, "rgba(70, 43, 28, .78)");
    holeGradient.addColorStop(1, "rgba(18, 10, 6, .92)");
    context.globalAlpha = bead.hole.opacity;
    context.fillStyle = holeGradient;
    context.beginPath();
    context.ellipse(
      bead.hole.x,
      bead.hole.y,
      bead.hole.radius * 1.45,
      bead.hole.radius * 0.62,
      bead.hole.angle,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.restore();

  context.strokeStyle = "rgba(255,255,255,.45)";
  context.lineWidth = 0.8;
  context.beginPath();
  context.ellipse(bead.x, bead.y, Math.max(1, radiusX - 0.75), Math.max(1, radiusY - 0.75), bead.tilt ?? 0, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = "rgba(56,40,32,.18)";
  context.lineWidth = Math.max(1, maxRadius * 0.055);
  context.beginPath();
  context.ellipse(bead.x, bead.y, Math.max(1, radiusX - 1.2), Math.max(1, radiusY - 1.2), bead.tilt ?? 0, Math.PI * 0.1, Math.PI * 1.28);
  context.stroke();
}

// 将整条手链绘制到 canvas，按深度排序制造真实的前后遮挡。
function renderInspectorBracelet(elements, items, rotation = 0) {
  const canvas = elements.inspectorCanvas;
  const context = canvas.getContext("2d");
  if (!context) {
    console.warn("当前浏览器不支持 canvas 3D 手链预览。");
    return;
  }

  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(280, Math.round(bounds.width || 320));
  const height = Math.max(210, Math.round(bounds.height || 240));
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(width * pixelRatio) || canvas.height !== Math.round(height * pixelRatio)) {
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
  }

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);

  const scene = calculateBracelet3DScene(items, width, height, rotation);
  warnAndReturn(scene.error);

  scene.beads.forEach((bead) => {
    drawPreviewBead(context, bead, rotation);
  });
}

// 兼容 dialog 能力不足的浏览器，确保弹窗能被打开。
function openModalDialog(dialog) {
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
    return;
  }

  dialog.setAttribute("open", "");
}

// 在弹层中展示整条手链，并支持拖入商品形成临时预览。
function openBraceletInspector(elements, items, label = "整条手链") {
  renderInspectorBracelet(elements, items);
  const summary = calculateSummary(items, RULES.minimumBeadCount);
  warnAndReturn(summary.error);
  elements.inspectorName.textContent = label;
  elements.inspectorDetail.textContent = items.length === 0
    ? "请先选择珠子"
    : `${items.length}颗 · ${formatPrice(summary.totalCents)}`;
  if (!elements.inspector.open) {
    openModalDialog(elements.inspector);
  }
}

// 渲染确认订单弹窗内容，所有字段都用 textContent 写入以避免 HTML 注入。
function renderOrderSummary(elements, summary) {
  const total = createTextElement("p", "order-total", `${summary.count} 颗珠子 · 总计 ${formatPrice(summary.totalCents)}`);
  const list = document.createElement("ul");
  list.className = "order-lines";
  list.replaceChildren(
    ...summary.lines.map((line) => {
      const item = document.createElement("li");
      const label = createTextElement("span", "order-line-name", line.label);
      const formula = createTextElement("span", "order-line-formula", line.priceFormula);
      const price = createTextElement("span", "order-line-price", formatPrice(line.subtotalCents));
      item.append(label, formula, price);
      return item;
    }),
  );
  elements.orderSummary.replaceChildren(total, list);
  elements.orderPreview.replaceChildren(
    ...summary.preview.beads.map((bead) => {
      const item = summary.lines.find((line) => bead.name && line.label.startsWith(bead.name));
      const product = PRODUCTS.find((candidate) => candidate.id === bead.productId);
      const previewBead = document.createElement("span");
      previewBead.className = "order-preview-bead";
      previewBead.style.left = `${(bead.x / summary.preview.width) * 100}%`;
      previewBead.style.top = `${(bead.y / summary.preview.height) * 100}%`;
      previewBead.style.width = `${Math.max(16, bead.size * 0.62)}px`;
      previewBead.style.height = `${Math.max(16, bead.size * 0.62)}px`;
      previewBead.setAttribute("aria-label", item?.label ?? bead.name ?? "订单珠子");
      const core = document.createElement("span");
      core.className = `selected-bead-core tone-${product?.tone ?? "clear"}`;
      core.style.backgroundImage = buildBeadBackgroundImage(product);
      if (product?.imageUrl) {
        core.classList.add("has-photo");
      }
      previewBead.append(core);
      return previewBead;
    }),
  );
}

// 根据顶视圆形轨道坐标渲染可编辑的已选珠子。
function renderBracelet(elements, state) {
  const stageWidth = elements.stage.clientWidth || 1000;
  const stageHeight = elements.stage.clientHeight || 600;
  const layout = calculateBeadPositions(state.items, stageWidth, stageHeight);
  warnAndReturn(layout.error);

  elements.selectedItems.replaceChildren(
    ...layout.positions.map((position) => {
      const item = state.items.find((candidate) => candidate.id === position.id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "selected-bead";
      button.classList.toggle("is-entering", position.id === state.lastAddedItemId);
      button.classList.toggle("is-rolling", position.id === state.rollingItemId);
      button.classList.toggle("is-selected", position.id === state.selectedItemId);
      button.dataset.itemId = item.id;
      button.style.left = `${(position.x / stageWidth) * 100}%`;
      button.style.top = `${(position.y / stageHeight) * 100}%`;
      button.style.setProperty("--selected-size", `${position.size}px`);
      button.setAttribute("aria-label", `选择${item.name} ${item.diameterMm}毫米，长按删除，拖到3D展示可预览`);

      const core = document.createElement("span");
      const product = PRODUCTS.find((candidate) => candidate.id === item.productId);
      core.className = `selected-bead-core tone-${product?.tone ?? "clear"}`;
      core.style.backgroundImage = buildBeadBackgroundImage(product);
      if (product?.imageUrl) {
        core.classList.add("has-photo");
      }
      button.append(core);
      return button;
    }),
  );
  elements.emptyState.hidden = state.items.length > 0;
}

// 集中刷新依赖状态的可见区域，避免在每个事件里复制更新逻辑。
function render(elements, state) {
  renderCategories(elements, state);
  renderProducts(elements, state);
  renderSummary(elements, state);
  renderBracelet(elements, state);

  return state.lastAddedItemId || state.rollingItemId
    ? { ...state, lastAddedItemId: null, rollingItemId: null }
    : state;
}

// 初始化页面交互，并将状态更新限制在本地内存中。
function initializeApp() {
  const elements = {
    categoryList: document.querySelector("#category-list"),
    checkoutButton: document.querySelector("#checkout-button"),
    clearButton: document.querySelector("#clear-button"),
    countStatus: document.querySelector("#count-status"),
    emptyState: document.querySelector("#empty-state"),
    feedback: document.querySelector("#editor-feedback"),
    inspectButton: document.querySelector("#inspect-button"),
    inspector: document.querySelector("#bead-inspector"),
    inspectorCanvas: document.querySelector("#inspector-canvas"),
    inspectorCheckoutButton: document.querySelector("#inspector-checkout-button"),
    inspectorDetail: document.querySelector("#inspector-detail"),
    inspectorName: document.querySelector("#inspector-name"),
    noticeButton: document.querySelector("#notice-button"),
    noResults: document.querySelector("#no-results"),
    orderConfirmButton: document.querySelector("#order-confirm-button"),
    orderDialog: document.querySelector("#order-dialog"),
    orderPreview: document.querySelector("#order-preview"),
    orderSummary: document.querySelector("#order-summary"),
    priceStatus: document.querySelector("#price-status"),
    productGrid: document.querySelector("#product-grid"),
    searchInput: document.querySelector("#search-input"),
    selectedItems: document.querySelector("#selected-items"),
    stage: document.querySelector("#bracelet-stage"),
    usageDialog: document.querySelector("#usage-dialog"),
  };

  if (Object.values(elements).some((element) => !element)) {
    console.warn("页面缺少 DIY 手链所需的渲染节点。");
    return;
  }

  let state = createInitialState();
  let clearTimer = null;
  let dragSession = null;
  let feedbackTimer = null;
  let inspectorAnimationId = null;
  let inspectorItems = [];
  let inspectorStartedAt = 0;
  let itemDragSession = null;
  let longPressTimer = null;
  let longPressConsumed = false;
  let suppressProductClick = false;

  // 向用户显示短时编辑提示，不改变手链业务状态。
  function notify(message) {
    elements.feedback.textContent = message;
    elements.feedback.classList.add("is-visible");
    window.clearTimeout(feedbackTimer);
    feedbackTimer = window.setTimeout(() => elements.feedback.classList.remove("is-visible"), 2200);
  }

  // 达到珠子上限时使用模态弹窗明确阻断继续添加。
  function notifyLimit(message) {
    notify(message);
    window.alert(message);
  }

  // 普通错误只做轻提示，上限错误额外弹窗。
  function notifyError(error) {
    if (!error) {
      return;
    }

    if (error.message.includes("不能再加")) {
      notifyLimit(error.message);
      return;
    }

    notify(error.message);
  }

  // 创建一颗临时飞行珠子，让点击添加时有“放到绳子上”的连续过渡。
  function playBeadPlacementAnimation(product, sourceRect, targetButton) {
    const targetRect = targetButton?.getBoundingClientRect();
    const frame = calculateBeadFlightFrame(sourceRect, targetRect);
    const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!frame || isReducedMotion) {
      return;
    }

    const bead = document.createElement("span");
    bead.className = `bead-flight tone-${product?.tone ?? "clear"}`;
    bead.style.setProperty("--flight-size", `${frame.size}px`);
    bead.style.setProperty("--flight-start-x", `${frame.startX}px`);
    bead.style.setProperty("--flight-start-y", `${frame.startY}px`);
    bead.style.setProperty("--flight-arc-x", `${frame.arcX}px`);
    bead.style.setProperty("--flight-arc-y", `${frame.arcY}px`);
    bead.style.setProperty("--flight-end-x", `${frame.endX}px`);
    bead.style.setProperty("--flight-end-y", `${frame.endY}px`);
    bead.style.setProperty("--flight-duration", `${frame.durationMs}ms`);
    bead.style.setProperty("--flight-easing", frame.easing);
    bead.style.backgroundImage = buildBeadBackgroundImage(product);
    if (product?.imageUrl) {
      bead.classList.add("has-photo");
    }
    document.body.append(bead);
    bead.addEventListener("animationend", () => bead.remove(), { once: true });
  }

  // 清空前先播放珠子离绳退场动画，结束后再真正清空状态。
  function clearBraceletWithAnimation() {
    if (state.items.length === 0) {
      return;
    }

    const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isReducedMotion) {
      state = createClearedBraceletState(state);
      state = render(elements, state);
      return;
    }

    elements.clearButton.disabled = true;
    elements.selectedItems.querySelectorAll(".selected-bead").forEach((button, index) => {
      button.classList.add("is-clearing");
      button.style.setProperty("--clear-delay", `${Math.min(index * 24, 180)}ms`);
    });
    window.clearTimeout(clearTimer);
    clearTimer = window.setTimeout(() => {
      state = createClearedBraceletState(state);
      state = render(elements, state);
      clearTimer = null;
      notify("已清空手链");
    }, 430);
  }

  // 根据入口生成订单摘要；空手链只提示，不打开确认弹窗。
  function showOrderDialog(items) {
    const summary = createOrderSummary(items);
    warnAndReturn(summary.error);
    if (summary.error) {
      notify(summary.error.message);
      return;
    }

    renderOrderSummary(elements, summary);
    if (elements.inspector.open) {
      elements.inspector.close();
    }
    openModalDialog(elements.orderDialog);
  }

  // 停止 3D 手链动画，避免弹层关闭后继续占用渲染资源。
  function stopInspectorAnimation() {
    if (inspectorAnimationId !== null) {
      window.cancelAnimationFrame(inspectorAnimationId);
      inspectorAnimationId = null;
    }
    inspectorStartedAt = 0;
  }

  // 使用 requestAnimationFrame 持续重绘整条手链，减少卡顿并跟随系统减少动效设置。
  function animateInspector(timestamp) {
    if (!elements.inspector.open) {
      stopInspectorAnimation();
      return;
    }

    if (inspectorStartedAt === 0) {
      inspectorStartedAt = timestamp;
    }

    const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elapsedSeconds = (timestamp - inspectorStartedAt) / 1000;
    const rotation = isReducedMotion ? 0.2 : elapsedSeconds * 0.52;
    renderInspectorBracelet(elements, inspectorItems, rotation);
    inspectorAnimationId = isReducedMotion ? null : window.requestAnimationFrame(animateInspector);
  }

  // 打开或刷新整条手链 3D 展示弹层。
  function showBraceletInspector(items, label = "整条手链") {
    inspectorItems = [...items];
    openBraceletInspector(elements, inspectorItems, label);
    stopInspectorAnimation();
    inspectorAnimationId = window.requestAnimationFrame(animateInspector);
  }

  // 清理拖拽过程中创建的浮层和目标高亮。
  function clearDragSession() {
    elements.selectedItems.querySelector(".is-drop-target")?.classList.remove("is-drop-target");
    elements.stage.classList.remove("is-stage-target");
    elements.inspectButton.classList.remove("is-drop-target");
    dragSession?.ghost?.remove();
    dragSession = null;
  }

  // 清理已选珠子拖到 3D 展示按钮时创建的临时视觉状态。
  function clearItemDragSession() {
    elements.inspectButton.classList.remove("is-drop-target");
    itemDragSession?.ghost?.remove();
    itemDragSession = null;
  }

  // 更新拖拽释放目标的视觉反馈，商品可添加/替换/预览，已选珠子可预览。
  function updateDropTarget(clientX, clientY, sourceKind) {
    elements.selectedItems.querySelector(".is-drop-target")?.classList.remove("is-drop-target");
    elements.stage.classList.remove("is-stage-target");
    elements.inspectButton.classList.remove("is-drop-target");

    const hitElement = document.elementFromPoint(clientX, clientY);
    const inspectButton = hitElement?.closest("#inspect-button");
    if (inspectButton === elements.inspectButton) {
      elements.inspectButton.classList.add("is-drop-target");
      return { type: "inspect" };
    }

    const itemButton = hitElement?.closest("button[data-item-id]");
    if (sourceKind === "product" && itemButton && elements.selectedItems.contains(itemButton)) {
      itemButton.classList.add("is-drop-target");
      return { type: "item", itemId: itemButton.dataset.itemId };
    }

    const stage = hitElement?.closest("#bracelet-stage");
    if (sourceKind === "product" && stage === elements.stage) {
      elements.stage.classList.add("is-stage-target");
      return { type: "stage" };
    }

    return { type: "none" };
  }
  state = render(elements, state);

  elements.categoryList.addEventListener("click", (event) => {
    const categoryButton = event.target.closest("button[data-category]");
    if (!categoryButton) {
      return;
    }

    state = { ...state, selectedCategory: categoryButton.dataset.category };
    state = render(elements, state);
  });

  elements.searchInput.addEventListener("input", (event) => {
    state = { ...state, query: event.target.value };
    state = render(elements, state);
  });

  elements.productGrid.addEventListener("click", (event) => {
    const productButton = event.target.closest("button[data-product-id]");
    if (!productButton) {
      return;
    }

    if (suppressProductClick) {
      suppressProductClick = false;
      return;
    }

    const product = PRODUCTS.find((candidate) => candidate.id === productButton.dataset.productId);
    const sourceRect = productButton.querySelector(".product-bead")?.getBoundingClientRect() ?? productButton.getBoundingClientRect();
    const result = addBraceletItem(state, product, RULES.maximumBeadCount);
    warnAndReturn(result.error);
    notifyError(result.error);
    const addedItemId = result.state.lastAddedItemId;
    state = result.state;
    state = render(elements, state);
    if (!result.error && addedItemId) {
      playBeadPlacementAnimation(product, sourceRect, elements.selectedItems.querySelector(`button[data-item-id="${addedItemId}"]`));
    }
  });

  // 用指针拖动商品卡到手链区添加、到已有珠子替换、到 3D 按钮预览。
  elements.productGrid.addEventListener("pointerdown", (event) => {
    const productButton = event.target.closest("button[data-product-id]");
    if (!productButton || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }

    const product = PRODUCTS.find((candidate) => candidate.id === productButton.dataset.productId);
    if (!product) {
      console.warn("无法拖拽不存在的珠子商品。", productButton.dataset.productId);
      return;
    }

    productButton.setPointerCapture(event.pointerId);
    dragSession = {
      active: false,
      originX: event.clientX,
      originY: event.clientY,
      pointerId: event.pointerId,
      product,
      sourceRect: productButton.querySelector(".product-bead")?.getBoundingClientRect() ?? productButton.getBoundingClientRect(),
      suppressClick: false,
    };
  });

  elements.productGrid.addEventListener("pointermove", (event) => {
    if (!dragSession || dragSession.pointerId !== event.pointerId) {
      return;
    }

    if (!dragSession.active && Math.hypot(event.clientX - dragSession.originX, event.clientY - dragSession.originY) < 9) {
      return;
    }

    if (!dragSession.active) {
      dragSession.active = true;
      dragSession.suppressClick = true;
      const sourceRect = dragSession.sourceRect ?? { height: 48, left: dragSession.originX - 24, top: dragSession.originY - 24, width: 48 };
      const frame = calculateDragGhostFrame(event, sourceRect, { height: sourceRect.height, width: sourceRect.width });
      const ghost = document.createElement("div");
      ghost.className = `drag-ghost tone-${dragSession.product.tone}`;
      ghost.style.width = `${frame.width}px`;
      ghost.style.height = `${frame.height}px`;
      ghost.style.backgroundImage = buildBeadBackgroundImage(dragSession.product);
      document.body.append(ghost);
      dragSession.ghost = ghost;
      dragSession.ghostOffsetX = frame.offsetX;
      dragSession.ghostOffsetY = frame.offsetY;
    }

    dragSession.ghost.style.transform = `translate(${event.clientX - dragSession.ghostOffsetX}px, ${event.clientY - dragSession.ghostOffsetY}px)`;
    updateDropTarget(event.clientX, event.clientY, "product");
  });

  // 在指针释放或取消时完成一次商品拖拽，并恢复临时视觉状态。
  function completeDrag(event, shouldApply) {
    if (!dragSession || dragSession.pointerId !== event.pointerId) {
      return;
    }

    const target = dragSession.active ? updateDropTarget(event.clientX, event.clientY, "product") : { type: "none" };
    if (shouldApply && target.type === "inspect") {
      const preview = getBraceletPreviewItems(state, dragSession.product, RULES.maximumBeadCount);
      warnAndReturn(preview.error);
      showBraceletInspector(preview.items, preview.error ? "当前手链" : "加入后预览");
      preview.error ? notifyError(preview.error) : notify("正在展示整条手链 3D 预览");
    } else if (shouldApply && (target.type === "item" || target.type === "stage")) {
      const result = applyProductDrop(state, dragSession.product, target, RULES.maximumBeadCount);
      warnAndReturn(result.error);
      if (result.error) {
        notifyError(result.error);
      } else {
        state = result.state;
        state = render(elements, state);
        notify(target.type === "item" ? "已替换珠子" : "已添加珠子");
      }
    } else if (dragSession.active) {
      notify("拖到手链区域添加，拖到 3D 展示按钮预览");
    }

    const shouldSuppressClick = dragSession.suppressClick;
    clearDragSession();
    if (shouldSuppressClick) {
      suppressProductClick = true;
      window.setTimeout(() => { suppressProductClick = false; }, 300);
    }
  }

  elements.productGrid.addEventListener("pointerup", (event) => completeDrag(event, true));
  elements.productGrid.addEventListener("pointercancel", (event) => completeDrag(event, false));

  elements.selectedItems.addEventListener("click", (event) => {
    const beadButton = event.target.closest("button[data-item-id]");
    if (!beadButton) {
      return;
    }

    if (longPressConsumed) {
      longPressConsumed = false;
      return;
    }

    const item = state.items.find((candidate) => candidate.id === beadButton.dataset.itemId);
    const result = rollBraceletItem(state, beadButton.dataset.itemId);
    warnAndReturn(result.error);
    state = result.state;
    state = render(elements, state);
    if (!result.error && item) {
      notify("已选中，点 3D 展示查看整条手链");
    }
  });

  // 长按保留删除入口；拖动已选珠子到 3D 展示按钮可预览。
  elements.selectedItems.addEventListener("pointerdown", (event) => {
    const beadButton = event.target.closest("button[data-item-id]");
    if (!beadButton) {
      return;
    }

    const item = state.items.find((candidate) => candidate.id === beadButton.dataset.itemId);
    if (!item || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }

    beadButton.setPointerCapture(event.pointerId);
    itemDragSession = {
      active: false,
      item,
      originX: event.clientX,
      originY: event.clientY,
      pointerId: event.pointerId,
      sourceRect: beadButton.getBoundingClientRect(),
      suppressClick: false,
    };

    longPressConsumed = false;
    longPressTimer = window.setTimeout(() => {
      const result = removeBraceletItem(state, beadButton.dataset.itemId);
      warnAndReturn(result.error);
      state = result.state;
      state = render(elements, state);
      longPressConsumed = true;
      notify("已删除珠子");
      longPressTimer = null;
    }, 560);
  });

  elements.selectedItems.addEventListener("pointermove", (event) => {
    if (!itemDragSession || itemDragSession.pointerId !== event.pointerId) {
      return;
    }

    if (!itemDragSession.active && Math.hypot(event.clientX - itemDragSession.originX, event.clientY - itemDragSession.originY) < 9) {
      return;
    }

    if (!itemDragSession.active) {
      itemDragSession.active = true;
      itemDragSession.suppressClick = true;
      cancelLongPress();
      const product = PRODUCTS.find((candidate) => candidate.id === itemDragSession.item.productId);
      const sourceRect = itemDragSession.sourceRect ?? { height: 48, left: itemDragSession.originX - 24, top: itemDragSession.originY - 24, width: 48 };
      const frame = calculateDragGhostFrame(event, sourceRect, { height: sourceRect.height, width: sourceRect.width });
      const ghost = document.createElement("div");
      ghost.className = `drag-ghost tone-${product?.tone ?? "clear"}`;
      ghost.style.width = `${frame.width}px`;
      ghost.style.height = `${frame.height}px`;
      ghost.style.backgroundImage = buildBeadBackgroundImage(product);
      document.body.append(ghost);
      itemDragSession.ghost = ghost;
      itemDragSession.ghostOffsetX = frame.offsetX;
      itemDragSession.ghostOffsetY = frame.offsetY;
    }

    itemDragSession.ghost.style.transform = `translate(${event.clientX - itemDragSession.ghostOffsetX}px, ${event.clientY - itemDragSession.ghostOffsetY}px)`;
    updateDropTarget(event.clientX, event.clientY, "item");
  });

  // 在指针释放或取消时完成已选珠子的 3D 展示拖拽。
  function completeItemDrag(event, shouldApply) {
    if (!itemDragSession || itemDragSession.pointerId !== event.pointerId) {
      return;
    }

    const target = itemDragSession.active ? updateDropTarget(event.clientX, event.clientY, "item") : { type: "none" };
    if (shouldApply && target.type === "inspect") {
      const preview = getBraceletPreviewItems(state);
      showBraceletInspector(preview.items);
      notify("正在展示整条手链 3D 预览");
    } else if (itemDragSession.active) {
      notify("拖到 3D 展示按钮可预览");
    }

    if (itemDragSession.suppressClick) {
      longPressConsumed = true;
      window.setTimeout(() => { longPressConsumed = false; }, 300);
    }
    clearItemDragSession();
    cancelLongPress();
  }

  // 指针提前释放时取消删除计时，保留轻点交互。
  function cancelLongPress() {
    if (longPressTimer !== null) {
      window.clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  elements.selectedItems.addEventListener("pointerup", (event) => {
    completeItemDrag(event, true);
    cancelLongPress();
  });
  elements.selectedItems.addEventListener("pointercancel", (event) => {
    completeItemDrag(event, false);
    cancelLongPress();
  });
  elements.selectedItems.addEventListener("pointerleave", cancelLongPress);

  elements.inspectButton.addEventListener("click", () => {
    const preview = getBraceletPreviewItems(state);
    if (preview.items.length === 0) {
      notify("先添加一颗珠子，或把商品拖到这里预览");
      return;
    }

    showBraceletInspector(preview.items);
  });

  elements.checkoutButton.addEventListener("click", () => showOrderDialog(state.items));

  elements.inspectorCheckoutButton.addEventListener("click", () => showOrderDialog(inspectorItems));

  elements.inspector.addEventListener("click", (event) => {
    if (event.target === elements.inspector) {
      elements.inspector.close();
    }
  });
  elements.inspector.addEventListener("close", stopInspectorAnimation);

  elements.orderDialog.addEventListener("click", (event) => {
    if (event.target === elements.orderDialog) {
      elements.orderDialog.close();
    }
  });

  elements.orderConfirmButton.addEventListener("click", () => notify("订单已确认（演示）"));

  elements.noticeButton.addEventListener("click", () => {
    openModalDialog(elements.usageDialog);
  });

  elements.usageDialog.addEventListener("click", (event) => {
    if (event.target === elements.usageDialog) {
      elements.usageDialog.close();
    }
  });

  elements.clearButton.addEventListener("click", clearBraceletWithAnimation);

  window.addEventListener("resize", () => renderBracelet(elements, state));
}

if (typeof document !== "undefined") {
  initializeApp();
}

// 按分类与关键词筛选可供选择的珠子商品。
export function filterProducts(products, category, query) {
  if (!Array.isArray(products)) {
    console.warn("商品列表不是数组，无法筛选。");
    return [];
  }

  const normalizedCategory = typeof category === "string" ? category : "all";
  const normalizedQuery = typeof query === "string" ? query.trim().toLowerCase() : "";

  return products.filter((product) => {
    if (!isValidProduct(product)) {
      console.warn("已忽略字段不完整的演示商品。", product);
      return false;
    }

    const matchesCategory = normalizedCategory === "all" || product.category === normalizedCategory;
    const searchableText = `${product.name} ${product.diameterMm}mm`.toLowerCase();

    return matchesCategory && searchableText.includes(normalizedQuery);
  });
}
