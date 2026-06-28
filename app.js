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
    enteringItemIds: [],
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
export function addBraceletItem(state, product, maximumCount = 20) {
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

  return { ...state, enteringItemIds: [], items: [], lastAddedItemId: null, rollingItemId: null, selectedItemId: null };
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
export function applyProductDrop(state, product, dropTarget, maximumCount = 20) {
  if (dropTarget?.type === "item") {
    return replaceBraceletItem(state, dropTarget.itemId, product);
  }

  if (dropTarget?.type === "stage") {
    return addBraceletItem(state, product, maximumCount);
  }

  return { state, error: new Error("请把珠子拖到手链区域添加，或拖到已有珠子上替换。") };
}

// 生成 3D 展示要用的整条手链数据，拖入商品时只做临时预览不改真实状态。
export function getBraceletPreviewItems(state, previewProduct = null, maximumCount = 20) {
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
export function calculateSummary(items, minimumCount = 20) {
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

// 根据已选珠子的直径和弹力绳活动余量估算可展示手围，供状态栏同步展示。
export function estimateBraceletWristCm(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }

  const validItems = items.filter(isValidBraceletItem);
  if (validItems.length === 0) {
    return 0;
  }

  const beadDiameterMm = validItems.reduce((total, item) => total + item.diameterMm, 0);
  const cordAllowanceMm = validItems.length * 0.6;
  return Math.round(((beadDiameterMm + cordAllowanceMm) / 10) * 10) / 10;
}

// 顶视图绳圈半径随珠子数量缓慢放大，避免达标时突兀跳变。
function calculateBraceletRadiusScale(items) {
  const count = Array.isArray(items) ? items.length : 0;
  const progress = Math.max(0, Math.min(1, (count - 12) / 8)) ** 1.3;

  return 0.32 + progress * 0.07;
}

// 计算 SVG 绳圈的真实像素半径和 viewBox 半径，供绳子和珠子共用。
export function calculateBraceletTrackFrame(items, width, height) {
  if (!Array.isArray(items) || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { cx: 500, cy: 500, error: new Error("手链绳圈尺寸无效。"), radiusPx: 0, viewBoxRadius: 320 };
  }

  const radiusScale = calculateBraceletRadiusScale(items);
  return {
    cx: 500,
    cy: 500,
    error: null,
    radiusPx: Math.min(width, height) * radiusScale,
    viewBoxRadius: radiusScale * 1000,
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

  const centerX = width / 2;
  const centerY = height / 2;
  const trackFrame = calculateBraceletTrackFrame(items, width, height);
  const radius = trackFrame.radiusPx;
  // 大屏预览需要更接近实物珠串密度；手机端保持原尺寸避免挤占触控空间。
  const beadScale = Math.max(1, Math.min(1.5, Math.min(width, height) / 420));
  const denseProgress = Math.max(0, Math.min(1, (items.length - 10) / 6));
  const baseMinimumBeadSize = beadScale > 1.2 ? 46 : 28;
  const denseMinimumBeadSize = beadScale > 1.2 ? 94 : 58;
  const baseMaximumBeadSize = 64;
  const denseMaximumBeadSize = items.length >= 16 ? 100 : 64;
  const minimumBeadSize = baseMinimumBeadSize + (denseMinimumBeadSize - baseMinimumBeadSize) * denseProgress;
  const maximumBeadSize = baseMaximumBeadSize + (denseMaximumBeadSize - baseMaximumBeadSize) * denseProgress;

  const positions = items.map((item, index) => {
    const angle = -Math.PI / 2 + (index / items.length) * Math.PI * 2;

    return {
      id: item.id,
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      size: Math.max(minimumBeadSize, Math.min(maximumBeadSize, item.diameterMm * 4 * beadScale)),
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
    return { axis: null, beads: [], cordSegments: [], error: new Error("3D 手链预览参数无效。"), orbitPath: [], wrist: null };
  }

  if (items.some((item) => !isValidBraceletItem(item))) {
    return { axis: null, beads: [], cordSegments: [], error: new Error("已选珠子信息不完整，无法生成 3D 预览。"), orbitPath: [], wrist: null };
  }

  const centerX = width / 2;
  const centerY = height * 0.5;
  const denseCountOffset = Math.max(0, items.length - 16);
  // 满珠 3D 展示要让相邻珠子略微覆盖，避免底层串线从珠间露出来。
  const ringRadiusScale = items.length >= 16
    ? Math.max(0.22, 0.28 - denseCountOffset * 0.015)
    : 0.36;
  const ringRadius = Math.min(width, height) * ringRadiusScale;
  const cameraDistance = Math.min(width, height) * 1.9;
  const orbitSlant = -0.44;
  const viewRotation = 0.78 + Math.sin(rotation) * 0.24;

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
    const product = PRODUCTS.find((candidate) => candidate.id === item.productId);
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
      textureImageUrl: product?.imageUrl ?? null,
      tilt: (shapeSeed - 0.5) * 0.18,
      tone: product?.tone ?? "clear",
      x: point.x,
      y: point.y,
    };
  });

  if (projectedBeads.length === 0) {
    return { axis: null, beads: [], cordSegments: [], error: null, orbitPath: [], wrist: null };
  }

  const minX = Math.min(...projectedBeads.map((bead) => bead.x - bead.radiusX));
  const maxX = Math.max(...projectedBeads.map((bead) => bead.x + bead.radiusX));
  const minY = Math.min(...projectedBeads.map((bead) => bead.y - bead.radiusY));
  const maxY = Math.max(...projectedBeads.map((bead) => bead.y + bead.radiusY));
  const offsetX = centerX - (minX + maxX) / 2;
  const offsetY = centerY - (minY + maxY) / 2;
  const centeredBeads = projectedBeads.map((bead) => ({
    ...bead,
    hole: bead.hole ? { ...bead.hole, x: bead.hole.x + offsetX, y: bead.hole.y + offsetY } : null,
    x: bead.x + offsetX,
    y: bead.y + offsetY,
  }));
  const cordSegments = centeredBeads.length > 1
    ? centeredBeads.map((bead, index) => {
      const nextBead = centeredBeads[(index + 1) % centeredBeads.length];
      const deltaX = nextBead.x - bead.x;
      const deltaY = nextBead.y - bead.y;
      const distance = Math.max(1, Math.hypot(deltaX, deltaY));
      const unitX = deltaX / distance;
      const unitY = deltaY / distance;
      const startTrim = Math.min(distance * 0.42, Math.max(bead.radiusX, bead.radiusY) * 0.72);
      const endTrim = Math.min(distance * 0.42, Math.max(nextBead.radiusX, nextBead.radiusY) * 0.72);
      const averageDepth = (bead.depth + nextBead.depth) / 2;
      const middleX = (bead.x + nextBead.x) / 2;
      const middleY = (bead.y + nextBead.y) / 2;
      const radialX = middleX - centerX;
      const radialY = middleY - centerY;
      const radialLength = Math.max(1, Math.hypot(radialX, radialY));
      const curveLift = Math.min(distance * 0.22, Math.max(8, ((bead.radius + nextBead.radius) / 2) * 0.72));

      return {
        color: "rgba(74, 49, 35, .72)",
        cx: middleX + (radialX / radialLength) * curveLift,
        cy: middleY + (radialY / radialLength) * curveLift,
        depth: averageDepth,
        fiberColor: "rgba(199, 153, 111, .38)",
        id: `${bead.id}-${nextBead.id}`,
        kind: "hemp-cord",
        lineWidth: Math.max(2.4, Math.min(5.2, ((bead.radius + nextBead.radius) / 2) * 0.2)),
        shadowColor: "rgba(38, 24, 17, .22)",
        x1: bead.x + unitX * startTrim,
        x2: nextBead.x - unitX * endTrim,
        y1: bead.y + unitY * startTrim,
        y2: nextBead.y - unitY * endTrim,
      };
    }).sort((left, right) => left.depth - right.depth)
    : [];
  const beads = [...centeredBeads];
  beads.sort((left, right) => left.depth - right.depth);
  return { axis: null, beads, cordSegments, error: null, orbitPath: [], wrist: null };
}

const SOURCE_OFFER_URL = "https://github.com/air158/DIYrock";

// 商品库使用 DIYrock 的珠子目录生成本地图片，避免继续混入旧跑环/JD 素材。
const PRODUCTS = [
  { id: "white-8", category: "white", name: "白水晶", diameterMm: 8, priceCents: 1800, tone: "clear", imageUrl: "./assets/beads/diyrock-white-8.png", sourceUrl: SOURCE_OFFER_URL },
  { id: "white-10", category: "white", name: "白水晶", diameterMm: 10, priceCents: 2800, tone: "clear", imageUrl: "./assets/beads/diyrock-white-10.png", sourceUrl: SOURCE_OFFER_URL },
  { id: "white-12", category: "white", name: "白水晶", diameterMm: 12, priceCents: 3800, tone: "clear", imageUrl: "./assets/beads/diyrock-white-12.png", sourceUrl: SOURCE_OFFER_URL },
  { id: "amethyst-8", category: "amethyst", name: "紫水晶", diameterMm: 8, priceCents: 1800, tone: "amethyst", imageUrl: "./assets/beads/diyrock-amethyst-8.png", sourceUrl: SOURCE_OFFER_URL },
  { id: "amethyst-10", category: "amethyst", name: "紫水晶", diameterMm: 10, priceCents: 2800, tone: "amethyst", imageUrl: "./assets/beads/diyrock-amethyst-10.png", sourceUrl: SOURCE_OFFER_URL },
  { id: "amethyst-12", category: "amethyst", name: "紫水晶", diameterMm: 12, priceCents: 3800, tone: "amethyst", imageUrl: "./assets/beads/diyrock-amethyst-12.png", sourceUrl: SOURCE_OFFER_URL },
  { id: "citrine-8", category: "citrine", name: "黄水晶", diameterMm: 8, priceCents: 1800, tone: "citrine", imageUrl: "./assets/beads/diyrock-citrine-8.png", sourceUrl: SOURCE_OFFER_URL },
  { id: "citrine-10", category: "citrine", name: "黄水晶", diameterMm: 10, priceCents: 2800, tone: "citrine", imageUrl: "./assets/beads/diyrock-citrine-10.png", sourceUrl: SOURCE_OFFER_URL },
  { id: "citrine-12", category: "citrine", name: "黄水晶", diameterMm: 12, priceCents: 3800, tone: "citrine", imageUrl: "./assets/beads/diyrock-citrine-12.png", sourceUrl: SOURCE_OFFER_URL },
  { id: "rose-8", category: "rose", name: "粉水晶", diameterMm: 8, priceCents: 1800, tone: "rose", imageUrl: "./assets/beads/diyrock-rose-8.png", sourceUrl: SOURCE_OFFER_URL },
  { id: "rose-10", category: "rose", name: "粉水晶", diameterMm: 10, priceCents: 2800, tone: "rose", imageUrl: "./assets/beads/diyrock-rose-10.png", sourceUrl: SOURCE_OFFER_URL },
  { id: "rose-12", category: "rose", name: "粉水晶", diameterMm: 12, priceCents: 3800, tone: "rose", imageUrl: "./assets/beads/diyrock-rose-12.png", sourceUrl: SOURCE_OFFER_URL },
  { id: "green-8", category: "green", name: "绿幽灵", diameterMm: 8, priceCents: 1800, tone: "green", imageUrl: "./assets/beads/diyrock-green-8.png", sourceUrl: SOURCE_OFFER_URL },
  { id: "green-10", category: "green", name: "绿幽灵", diameterMm: 10, priceCents: 2800, tone: "green", imageUrl: "./assets/beads/diyrock-green-10.png", sourceUrl: SOURCE_OFFER_URL },
  { id: "green-12", category: "green", name: "绿幽灵", diameterMm: 12, priceCents: 3800, tone: "green", imageUrl: "./assets/beads/diyrock-green-12.png", sourceUrl: SOURCE_OFFER_URL },
  { id: "obsidian-8", category: "obsidian", name: "黑曜石", diameterMm: 8, priceCents: 1800, tone: "black", imageUrl: "./assets/beads/diyrock-obsidian-8.png", sourceUrl: SOURCE_OFFER_URL },
  { id: "obsidian-10", category: "obsidian", name: "黑曜石", diameterMm: 10, priceCents: 2800, tone: "black", imageUrl: "./assets/beads/diyrock-obsidian-10.png", sourceUrl: SOURCE_OFFER_URL },
  { id: "obsidian-12", category: "obsidian", name: "黑曜石", diameterMm: 12, priceCents: 3800, tone: "black", imageUrl: "./assets/beads/diyrock-obsidian-12.png", sourceUrl: SOURCE_OFFER_URL },
  { id: "spacer-silver-3", category: "spacer", name: "银隔片", diameterMm: 3, priceCents: 600, tone: "silver", imageUrl: "./assets/beads/diyrock-spacer-silver-3.png", sourceUrl: SOURCE_OFFER_URL },
  { id: "spacer-gold-3", category: "spacer", name: "金隔片", diameterMm: 3, priceCents: 800, tone: "gold", imageUrl: "./assets/beads/diyrock-spacer-gold-3.png", sourceUrl: SOURCE_OFFER_URL },
  { id: "divider-silver-5", category: "divider", name: "银隔珠", diameterMm: 5, priceCents: 1000, tone: "silver", imageUrl: "./assets/beads/diyrock-divider-silver-5.png", sourceUrl: SOURCE_OFFER_URL },
  { id: "divider-gold-5", category: "divider", name: "金隔珠", diameterMm: 5, priceCents: 1200, tone: "gold", imageUrl: "./assets/beads/diyrock-divider-gold-5.png", sourceUrl: SOURCE_OFFER_URL },
  { id: "flower-silver-7", category: "flower", name: "银花托", diameterMm: 7, priceCents: 1600, tone: "silver", imageUrl: "./assets/beads/diyrock-flower-silver-7.png", sourceUrl: SOURCE_OFFER_URL },
  { id: "flower-gold-7", category: "flower", name: "金花托", diameterMm: 7, priceCents: 2000, tone: "gold", imageUrl: "./assets/beads/diyrock-flower-gold-7.png", sourceUrl: SOURCE_OFFER_URL },
];

// 设计广场固定使用本地假数据，保证刷新后排序和测试结果稳定。
export const DESIGN_PRESETS = [
  { id: "moon-guard", group: "designer", title: "月影守望", author: "@LY", likes: 96380, desc: "白水晶与黑曜石交错，清透里带一点守护感。", productIds: ["white-10", "white-10", "obsidian-8", "white-8", "amethyst-8", "white-10", "divider-silver-5", "white-8", "obsidian-8", "white-10", "white-8", "amethyst-8", "white-10", "white-8", "divider-silver-5", "obsidian-8"] },
  { id: "pink-mimi", group: "designer", title: "粉色迷嘟", author: "@-2enbor", likes: 88420, desc: "粉水晶叠白水晶，柔软、清甜，适合日常通勤。", productIds: ["rose-10", "white-8", "rose-8", "white-10", "spacer-gold-3", "rose-10", "white-8", "rose-8", "flower-gold-7", "white-10", "rose-8", "white-8", "rose-10", "spacer-gold-3", "white-8", "rose-8"] },
  { id: "silver-tide", group: "designer", title: "银色潮汐", author: "@Pomelo.Y", likes: 76190, desc: "银隔珠点亮白水晶，干净、冷感、很显质感。", productIds: ["white-10", "divider-silver-5", "white-8", "spacer-silver-3", "white-10", "white-8", "divider-silver-5", "white-10", "spacer-silver-3", "white-8", "white-10", "divider-silver-5", "white-8", "spacer-silver-3", "white-10", "white-8"] },
  { id: "citrine-sun", group: "designer", title: "日光橘子", author: "@Ari", likes: 59870, desc: "黄水晶像一圈小太阳，搭配白水晶更轻盈。", productIds: ["citrine-10", "white-8", "citrine-8", "white-10", "rose-8", "citrine-10", "white-8", "spacer-gold-3", "white-10", "citrine-8", "rose-8", "white-8", "citrine-10", "white-10", "spacer-gold-3", "white-8"] },
  { id: "green-breath", group: "designer", title: "森林呼吸", author: "@Mori", likes: 43260, desc: "绿幽灵为主，像一枚安静但有生命力的护符。", productIds: ["green-10", "green-8", "white-8", "green-10", "spacer-gold-3", "green-8", "white-10", "green-10", "green-8", "divider-gold-5", "white-8", "green-10", "green-8", "white-8", "green-10", "spacer-gold-3"] },
  { id: "purple-dream", group: "designer", title: "紫雾梦境", author: "@yarina", likes: 26740, desc: "紫水晶和粉水晶轻轻过渡，温柔但不甜腻。", productIds: ["amethyst-10", "rose-8", "white-8", "amethyst-8", "rose-10", "white-8", "amethyst-10", "spacer-silver-3", "rose-8", "white-10", "amethyst-8", "rose-8", "white-8", "flower-silver-7", "amethyst-10", "rose-8"] },
  { id: "black-star", group: "designer", title: "黑星轨道", author: "@Noir", likes: 12480, desc: "黑曜石压住整体气场，银色隔片带来一点星轨感。", productIds: ["obsidian-10", "spacer-silver-3", "obsidian-8", "white-8", "obsidian-10", "divider-silver-5", "white-8", "obsidian-8", "spacer-silver-3", "obsidian-10", "white-8", "divider-silver-5", "obsidian-8", "white-8", "obsidian-10", "spacer-silver-3"] },
  { id: "milk-cloud", group: "designer", title: "奶云小径", author: "@Mint", likes: 3860, desc: "大面积白水晶搭一颗金色点睛，清爽又耐看。", productIds: ["white-10", "white-8", "white-10", "white-8", "white-10", "spacer-gold-3", "white-8", "white-10", "citrine-8", "white-10", "white-8", "white-10", "spacer-gold-3", "white-8", "white-10", "white-8"] },
  { id: "customer-amber-rain", group: "customer", title: "暖橘雨", author: "@南栀", likes: 97260, desc: "客订复刻款，黄水晶与粉晶错落，明亮但不抢眼。", productIds: ["citrine-10", "rose-8", "white-8", "citrine-8", "rose-10", "white-10", "spacer-gold-3", "citrine-10", "white-8", "rose-8", "citrine-8", "white-10", "rose-10", "spacer-gold-3", "white-8", "citrine-8"] },
  { id: "customer-snow-bell", group: "customer", title: "雪铃", author: "@小满", likes: 84510, desc: "白水晶为主，银隔片像铃铛一样点亮整圈。", productIds: ["white-10", "spacer-silver-3", "white-8", "white-10", "divider-silver-5", "white-8", "white-10", "spacer-silver-3", "white-8", "white-10", "divider-silver-5", "white-8", "white-10", "white-8", "spacer-silver-3", "white-10"] },
  { id: "customer-grape-soda", group: "customer", title: "葡萄汽水", author: "@Rita", likes: 73140, desc: "紫水晶和白水晶的清爽配色，适合夏天。", productIds: ["amethyst-10", "white-8", "amethyst-8", "white-10", "amethyst-10", "spacer-silver-3", "white-8", "amethyst-8", "white-10", "amethyst-10", "white-8", "divider-silver-5", "amethyst-8", "white-10", "amethyst-10", "white-8"] },
  { id: "customer-matcha", group: "customer", title: "抹茶拿铁", author: "@木木", likes: 62890, desc: "绿幽灵搭配奶白色调，温柔又有一点森系。", productIds: ["green-10", "white-8", "green-8", "white-10", "green-10", "spacer-gold-3", "white-8", "green-8", "white-10", "green-10", "white-8", "divider-gold-5", "green-8", "white-10", "green-10", "white-8"] },
  { id: "customer-night-salt", group: "customer", title: "夜盐", author: "@Clio", likes: 48670, desc: "黑曜石与白水晶对比更强，适合想要利落感的搭配。", productIds: ["obsidian-10", "white-8", "obsidian-8", "white-10", "spacer-silver-3", "obsidian-10", "white-8", "obsidian-8", "divider-silver-5", "white-10", "obsidian-8", "white-8", "obsidian-10", "white-10", "spacer-silver-3", "obsidian-8"] },
  { id: "customer-peach-milk", group: "customer", title: "桃子牛奶", author: "@七月", likes: 35320, desc: "粉水晶和白水晶均匀排布，软糯日常。", productIds: ["rose-10", "white-10", "rose-8", "white-8", "rose-10", "white-10", "rose-8", "white-8", "spacer-gold-3", "rose-10", "white-10", "rose-8", "white-8", "rose-10", "white-10", "rose-8"] },
  { id: "customer-gold-dot", group: "customer", title: "一颗金豆", author: "@晴子", likes: 21980, desc: "白水晶中加入少量金色配件，低调但有记忆点。", productIds: ["white-10", "white-8", "white-10", "spacer-gold-3", "white-8", "white-10", "white-8", "divider-gold-5", "white-10", "white-8", "white-10", "spacer-gold-3", "white-8", "white-10", "white-8", "citrine-8"] },
  { id: "customer-soft-star", group: "customer", title: "软星星", author: "@Nana", likes: 10240, desc: "粉晶、紫晶和银色花托组成的轻甜客订款。", productIds: ["rose-8", "amethyst-8", "white-8", "rose-10", "flower-silver-7", "amethyst-10", "white-8", "rose-8", "spacer-silver-3", "amethyst-8", "rose-10", "white-10", "flower-silver-7", "rose-8", "amethyst-8", "white-8"] },
];

export const SAVED_DESIGNS_STORAGE_KEY = "bracelet-fe.saved-designs";
const SAVED_DESIGN_LIMIT = 20;

// 获取按热度降序排列的设计，避免渲染层重复排序。
export function getSortedDesignPresets(group = "designer") {
  const designs = group === "all"
    ? DESIGN_PRESETS
    : DESIGN_PRESETS.filter((design) => design.group === group);

  return [...designs].sort((left, right) => right.likes - left.likes);
}

// 生成设计广场顶部统计文案，内置案例与本地设计共用同一口径。
export function createDesignGalleryStats(savedDesigns = []) {
  const designerCount = DESIGN_PRESETS.filter((design) => design.group === "designer").length;
  const customerCount = DESIGN_PRESETS.filter((design) => design.group === "customer").length;
  const savedCount = Array.isArray(savedDesigns) ? savedDesigns.length : 0;

  return `设计广场统计：设计师款 ${designerCount} · 优秀客订 ${customerCount} · 我的设计 ${savedCount}/${SAVED_DESIGN_LIMIT}`;
}

// 将设计里的商品 id 列表复制为 DIY 手链状态，供广场二次设计和本地修改复用。
export function createBraceletStateFromDesign(design, options = {}) {
  if (!design) {
    return { design: null, error: new Error("没有找到这个设计。"), state: createInitialState() };
  }

  const designProducts = design.productIds
    .map((productId) => PRODUCTS.find((product) => product.id === productId))
    .filter(isValidProduct);
  if (designProducts.length === 0) {
    return { design, error: new Error("这个设计暂时没有可用珠子。"), state: createInitialState() };
  }
  const products = design.group === "saved"
    ? designProducts
    : Array.from(
      { length: RULES.maximumBeadCount },
      (_, index) => designProducts[index % designProducts.length],
    );

  const items = products.map((product, index) => ({
    diameterMm: product.diameterMm,
    id: `bead-${index + 1}`,
    name: product.name,
    priceCents: product.priceCents,
    productId: product.id,
  }));

  return {
    design,
    error: null,
    state: {
      ...createInitialState(),
      enteringItemIds: options.animate ? items.map((item) => item.id) : [],
      items,
      lastAddedItemId: options.animate ? null : items.at(-1)?.id ?? null,
      nextItemNumber: items.length + 1,
      selectedItemId: items.at(-1)?.id ?? null,
    },
  };
}

// 将设计广场的商品 id 列表复制为 DIY 手链状态，供购买和二次设计复用。
export function createBraceletStateFromDesignPreset(designId, options = {}) {
  return createBraceletStateFromDesign(DESIGN_PRESETS.find((candidate) => candidate.id === designId), options);
}

// 直接购买复用订单摘要能力，保证广场设计和 DIY 订单口径一致。
export function createDesignOrderSummary(designId) {
  const result = createBraceletStateFromDesignPreset(designId);
  if (result.error) {
    return { count: 0, error: result.error, lines: [], preview: { beads: [], height: 170, width: 260 }, totalCents: 0 };
  }

  return createOrderSummary(result.state.items);
}

// 集中保存演示原型的可调整业务规则。
const RULES = {
  maximumBeadCount: 20,
  minimumBeadCount: 20,
  stringCoveredBeadCount: 16,
};

// 判断本地保存的设计是否具备恢复 DIY 状态所需的最小字段。
function isValidSavedDesign(design) {
  return Boolean(
    design &&
      design.group === "saved" &&
      typeof design.id === "string" &&
      typeof design.title === "string" &&
      Array.isArray(design.productIds) &&
      design.productIds.length > 0,
  );
}

// 将保存时间格式化为本地用户可读的短标签。
function formatSavedDesignTime(date) {
  const safeDate = date instanceof Date && Number.isFinite(date.getTime()) ? date : new Date();
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const day = String(safeDate.getDate()).padStart(2, "0");
  const hour = String(safeDate.getHours()).padStart(2, "0");
  const minute = String(safeDate.getMinutes()).padStart(2, "0");

  return `${month}-${day} ${hour}:${minute}`;
}

// 读取本地缓存中的我的设计；缓存损坏时返回空数组并给调用层错误提示。
export function readSavedDesigns(storage) {
  if (!storage || typeof storage.getItem !== "function") {
    return { designs: [], error: new Error("当前浏览器不支持本地保存。") };
  }

  const rawValue = storage.getItem(SAVED_DESIGNS_STORAGE_KEY);
  if (!rawValue) {
    return { designs: [], error: null };
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    const designs = Array.isArray(parsedValue) ? parsedValue.filter(isValidSavedDesign).slice(0, SAVED_DESIGN_LIMIT) : [];
    return { designs, error: Array.isArray(parsedValue) ? null : new Error("本地设计缓存格式无效，已忽略。") };
  } catch (error) {
    return { designs: [], error: new Error("本地设计缓存损坏，已忽略。") };
  }
}

// 把当前手链状态压缩为可持久化的设计数据。
function createSavedDesignFromItems(items, now = new Date()) {
  if (!Array.isArray(items) || items.length === 0) {
    return { design: null, error: new Error("请先添加珠子，再保存设计。") };
  }

  const productIds = items.map((item) => item.productId);
  if (productIds.some((productId) => !PRODUCTS.some((product) => product.id === productId))) {
    return { design: null, error: new Error("手链里有不可用珠子，暂时不能保存。") };
  }

  const savedAt = now instanceof Date ? now : new Date(now);
  const timestamp = Number.isFinite(savedAt.getTime()) ? savedAt.getTime() : Date.now();
  const title = `我的设计 ${formatSavedDesignTime(savedAt)}`;
  return {
    design: {
      author: "@我",
      desc: "保存在本地的 DIY 手链，可继续二次编辑。",
      group: "saved",
      id: `saved-${timestamp}`,
      likes: 0,
      productIds,
      title,
    },
    error: null,
  };
}

// 保存当前手链到本地缓存；超过 20 条时明确阻断，避免静默覆盖用户设计。
export function saveBraceletDesign(storage, items, now = new Date()) {
  const current = readSavedDesigns(storage);
  if (current.error) {
    return { design: null, designs: current.designs, error: current.error };
  }

  if (current.designs.length >= SAVED_DESIGN_LIMIT) {
    return { design: null, designs: current.designs, error: new Error(`我的设计最多保存 ${SAVED_DESIGN_LIMIT} 个，请先删除旧设计。`) };
  }

  const created = createSavedDesignFromItems(items, now);
  if (created.error) {
    return { design: null, designs: current.designs, error: created.error };
  }

  const designs = [created.design, ...current.designs];
  storage.setItem(SAVED_DESIGNS_STORAGE_KEY, JSON.stringify(designs));
  return { design: created.design, designs, error: null };
}

// 删除指定本地设计，删除不存在的 id 时返回可提示错误。
export function removeSavedDesign(storage, designId) {
  const current = readSavedDesigns(storage);
  if (current.error) {
    return { designs: current.designs, error: current.error };
  }

  const designs = current.designs.filter((design) => design.id !== designId);
  if (designs.length === current.designs.length) {
    return { designs, error: new Error("没有找到要删除的设计。") };
  }

  storage.setItem(SAVED_DESIGNS_STORAGE_KEY, JSON.stringify(designs));
  return { designs, error: null };
}

// 侧边分类与商品库 category 字段一一对应。
const CATEGORIES = [
  { id: "all", label: "全部" },
  { id: "white", label: "白水晶" },
  { id: "amethyst", label: "紫水晶" },
  { id: "citrine", label: "黄水晶" },
  { id: "rose", label: "粉水晶" },
  { id: "green", label: "绿幽灵" },
  { id: "obsidian", label: "黑曜石" },
  { id: "spacer", label: "隔片" },
  { id: "divider", label: "隔珠" },
  { id: "flower", label: "花托" },
];

// canvas 3D 预览使用的材质色板，和商品 tone 字段保持一致。
const TONE_PALETTES = {
  black: { core: "#17181d", edge: "#050507", highlight: "#868993", mid: "#3b3d45", shine: "rgba(255,255,255,.42)" },
  clear: { core: "#ececf1", edge: "#a9a8b0", highlight: "#ffffff", mid: "#c9c8cf", shine: "rgba(255,255,255,.76)" },
  amethyst: { core: "#a073d8", edge: "#3f2a6e", highlight: "#f3e9ff", mid: "#7d56b7", shine: "rgba(243,233,255,.72)" },
  citrine: { core: "#f6c542", edge: "#9c6f00", highlight: "#fff7d8", mid: "#d99b16", shine: "rgba(255,247,216,.68)" },
  gold: { core: "#e8c777", edge: "#7d5a14", highlight: "#fff7d8", mid: "#b98a2a", shine: "rgba(255,247,216,.68)" },
  green: { core: "#5fb38a", edge: "#1f5d44", highlight: "#e8ffec", mid: "#3e8a6a", shine: "rgba(232,255,236,.66)" },
  milk: { core: "#f5f0f1", edge: "#cfc4c7", highlight: "#ffffff", mid: "#e2dadd", shine: "rgba(255,255,255,.72)" },
  rose: { core: "#ecc0cf", edge: "#b97f94", highlight: "#fff4f8", mid: "#d79aae", shine: "rgba(255,246,250,.7)" },
  silver: { core: "#d6d6e0", edge: "#5a5a72", highlight: "#ffffff", mid: "#aaaebb", shine: "rgba(255,255,255,.74)" },
  tea: { core: "#cfaa82", edge: "#75503f", highlight: "#fff0db", mid: "#a87a5c", shine: "rgba(255,232,196,.62)" },
};
const PRODUCT_IMAGE_CACHE = new Map();
const TONE_BACKGROUNDS = {
  black: "radial-gradient(circle at 29% 23%, #a3a5ad 0 7%, transparent 18%), radial-gradient(circle at 68% 72%, rgb(0 0 0 / 42%), transparent 35%), conic-gradient(from 218deg, #07080b, #4f5159 20%, #111217 42%, #686a72 62%, #050507 83%, #07080b)",
  clear: "radial-gradient(circle at 28% 24%, rgb(255 255 255 / 92%) 0 8%, transparent 18%), radial-gradient(circle at 66% 72%, rgb(102 99 108 / 24%), transparent 32%), conic-gradient(from 218deg at 48% 52%, #8e8c94, #f8f8fb 15%, #b9b8c0 32%, #fff 49%, #bebbc4 73%, #f6f6f9 88%, #8e8c94)",
  amethyst: "radial-gradient(circle at 28% 24%, #f3e9ff 0 8%, transparent 18%), radial-gradient(circle at 68% 72%, rgb(63 42 110 / 34%), transparent 34%), conic-gradient(from 218deg, #3f2a6e, #a073d8 21%, #6d4bac 43%, #dac4ff 63%, #56388d 82%, #3f2a6e)",
  citrine: "radial-gradient(circle at 28% 24%, #fff7d8 0 8%, transparent 18%), radial-gradient(circle at 68% 72%, rgb(156 111 0 / 28%), transparent 34%), conic-gradient(from 218deg, #9c6f00, #f6c542 22%, #d89916 43%, #ffe7a3 63%, #a87405 82%, #9c6f00)",
  gold: "radial-gradient(circle at 28% 24%, #fff7d8 0 8%, transparent 18%), radial-gradient(circle at 68% 72%, rgb(125 90 20 / 28%), transparent 34%), conic-gradient(from 218deg, #7d5a14, #e8c777 22%, #b88a2a 43%, #fbe9a6 63%, #806019 82%, #7d5a14)",
  green: "radial-gradient(circle at 28% 24%, #e8ffec 0 8%, transparent 18%), radial-gradient(circle at 68% 72%, rgb(31 93 68 / 28%), transparent 34%), conic-gradient(from 218deg, #1f5d44, #5fb38a 22%, #367d5d 43%, #bce6cf 63%, #255f49 82%, #1f5d44)",
  milk: "radial-gradient(circle at 28% 24%, #fff 0 8%, transparent 18%), radial-gradient(circle at 68% 72%, rgb(151 130 136 / 22%), transparent 34%), conic-gradient(from 218deg, #c5babd, #fffdfa 19%, #e3dadd 44%, #fdf9f7 62%, #c8bcc0 83%, #c5babd)",
  rose: "radial-gradient(circle at 28% 24%, #fff7fb 0 8%, transparent 18%), radial-gradient(circle at 68% 72%, rgb(136 71 93 / 24%), transparent 34%), conic-gradient(from 218deg, #a86f86, #f0c6d3 20%, #c98b9f 42%, #fae4eb 62%, #aa7088 83%, #a86f86)",
  silver: "radial-gradient(circle at 28% 24%, #fff 0 8%, transparent 18%), radial-gradient(circle at 68% 72%, rgb(90 90 114 / 25%), transparent 34%), conic-gradient(from 218deg, #5a5a72, #d6d6e0 22%, #9ca0ad 43%, #f0f0f7 63%, #6d7080 82%, #5a5a72)",
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
  const durationMs = Math.max(980, Math.min(1320, Math.round(820 + travelDistance * 0.55)));

  return {
    arcX: (startX + endX) / 2,
    arcY: (startY + endY) / 2 - arcLift,
    durationMs,
    easing: "cubic-bezier(.16, 1.08, .24, 1)",
    endX: targetRect.left + targetWidth / 2,
    endY: targetRect.top + targetHeight / 2,
    size: Math.max(sourceWidth, sourceHeight),
    startX,
    startY,
  };
}

// 生成不依赖外部素材的轻量交互音效计划，真实播放由浏览器 WebAudio 完成。
export function createInteractionSoundPlan(kind, options = {}) {
  if (options.muted) {
    return { durationMs: 0, frequencies: [], gain: 0, kind, muted: true };
  }

  const plans = {
    add: { durationMs: 150, frequencies: [520, 760], gain: 0.042 },
    clear: { durationMs: 190, frequencies: [420, 280], gain: 0.036 },
    modal: { durationMs: 130, frequencies: [360, 540], gain: 0.032 },
    roll: { durationMs: 170, frequencies: [620, 460, 700], gain: 0.03 },
  };

  return { kind, muted: false, ...(plans[kind] ?? plans.add) };
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

// 使用现有珠子样式渲染一条设计手链缩略图，保持广场和 DIY 视觉一致。
function renderDesignPreview(container, items, width = 260, height = 170, beadClassName = "design-preview-bead") {
  const layout = calculateBeadPositions(items, width, height);
  warnAndReturn(layout.error);
  const beadScale = beadClassName === "design-preview-bead" ? 0.48 : 0.82;
  const positionScale = beadClassName === "design-preview-bead" ? 0.62 : 1;
  const centerX = width / 2;
  const centerY = height / 2;
  const beads = layout.positions.map((position) => {
    const item = items.find((candidate) => candidate.id === position.id);
    const product = PRODUCTS.find((candidate) => candidate.id === item?.productId);
    const bead = document.createElement("span");
    bead.className = `${beadClassName} tone-${product?.tone ?? "clear"}`;
    const x = centerX + (position.x - centerX) * positionScale;
    const y = centerY + (position.y - centerY) * positionScale;
    bead.style.left = `${(x / width) * 100}%`;
    bead.style.top = `${(y / height) * 100}%`;
    bead.style.setProperty("--design-bead-size", `${Math.max(13, position.size * beadScale)}px`);
    bead.style.backgroundImage = buildBeadBackgroundImage(product);
    if (product?.imageUrl) {
      bead.classList.add("has-photo");
    }
    return bead;
  });
  container.replaceChildren(...beads);
}

// 渲染设计广场卡片，所有文本使用 textContent，避免以后接后端数据时引入注入风险。
function createDesignCard(design, options = {}) {
  const result = createBraceletStateFromDesign(design);
  warnAndReturn(result.error);
  if (result.error) {
    return null;
  }

  const card = document.createElement("article");
  card.className = "design-item";

  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "design-open";
  openButton.dataset.designId = design.id;
  openButton.setAttribute("aria-label", `查看设计${design.title}，${design.likes.toLocaleString("zh-CN")}人使用`);

  const preview = document.createElement("span");
  preview.className = "design-preview";
  renderDesignPreview(preview, result.state.items, 260, 260);

  const likes = createTextElement("span", "design-like", design.group === "saved" ? "本地保存" : `${design.likes.toLocaleString("zh-CN")}人使用`);
  const title = createTextElement("strong", "design-name", design.title);
  const author = createTextElement("span", "design-author", design.author);
  preview.append(likes);
  openButton.append(preview, title, author);
  card.append(openButton);

  if (options.withDelete) {
    const deleteButton = createTextElement("button", "design-delete", "删除");
    deleteButton.type = "button";
    deleteButton.dataset.savedDeleteId = design.id;
    deleteButton.setAttribute("aria-label", `删除${design.title}`);
    card.append(deleteButton);
  }

  return card;
}

function renderDesignGallery(elements, group = "designer", savedDesigns = []) {
  const designs = group === "saved" ? savedDesigns : getSortedDesignPresets(group);
  const cards = designs.map((design) => createDesignCard(design, { withDelete: group === "saved" })).filter(Boolean);

  if (group === "saved" && cards.length === 0) {
    const empty = createTextElement("p", "design-empty", "还没有保存设计，回到 DIY 做一条喜欢的手链吧。");
    elements.designGrid.replaceChildren(empty);
    return;
  }

  elements.designGrid.replaceChildren(...cards);
}


// 按当前状态更新数量提示、总价和清空按钮。
function renderSummary(elements, state) {
  const summary = calculateSummary(state.items, RULES.minimumBeadCount);
  warnAndReturn(summary.error);
  const isAtMaximum = summary.count >= RULES.maximumBeadCount;
  const wristCm = estimateBraceletWristCm(state.items);
  elements.countStatus.textContent = isAtMaximum
    ? `珠子数量已满（${RULES.maximumBeadCount}/${RULES.maximumBeadCount}）`
    : summary.isInsufficient
      ? `珠子数量不足（${summary.count}/${RULES.minimumBeadCount}）`
      : `珠子数量已满（${RULES.maximumBeadCount}/${RULES.maximumBeadCount}）`;
  elements.countStatus.classList.toggle("is-ready", !summary.isInsufficient);
  elements.countStatus.classList.toggle("is-limit", isAtMaximum);
  elements.wristStatus.textContent = wristCm > 0 ? `手围: ${wristCm.toFixed(1)}cm` : "手围: --";
  elements.wristStatus.classList.toggle("is-ready", wristCm > 0);
  elements.priceStatus.textContent = `总价格: ${formatPrice(summary.totalCents)}`;
  elements.clearButton.disabled = summary.count === 0;
}

// 获取 3D 预览绘制材质，缺失商品时回落到白水晶。
function getTonePalette(productId) {
  const tone = PRODUCTS.find((candidate) => candidate.id === productId)?.tone ?? "clear";
  return TONE_PALETTES[tone] ?? TONE_PALETTES.clear;
}

// 按已计算好的 3D 珠子 tone 获取色板，避免 canvas 绘制时重新依赖商品查找。
function getPreviewTonePalette(bead) {
  return TONE_PALETTES[bead.tone] ?? getTonePalette(bead.item.productId);
}

// 懒加载真实珠子图片，canvas 未加载完成时仍使用本地渐变材质兜底。
function getProductImage(imageUrl, onLoad = null) {
  if (!imageUrl || typeof Image === "undefined") {
    return null;
  }

  if (PRODUCT_IMAGE_CACHE.has(imageUrl)) {
    return PRODUCT_IMAGE_CACHE.get(imageUrl);
  }

  const image = new Image();
  if (typeof onLoad === "function") {
    image.addEventListener("load", onLoad, { once: true });
  }
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
function drawPreviewBead(context, bead, rotation, onImageLoad = null) {
  const palette = getPreviewTonePalette(bead);
  const productImage = getProductImage(bead.textureImageUrl, onImageLoad);
  const hasPhotoTexture = Boolean(productImage?.complete && productImage.naturalWidth > 0);
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
  if (hasPhotoTexture) {
    drawCoverImage(context, productImage, bead.x, bead.y, maxRadius * 2.12);
    context.restore();
    return;
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
}

// 在珠子下方绘制短麻绳段，只连接珠子间空隙，不穿过珠子内部。
function drawPreviewCordSegment(context, segment) {
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = segment.shadowColor;
  context.lineWidth = segment.lineWidth + 2.2;
  context.beginPath();
  context.moveTo(segment.x1, segment.y1 + 1.4);
  context.quadraticCurveTo(segment.cx, segment.cy + 1.4, segment.x2, segment.y2 + 1.4);
  context.stroke();

  context.strokeStyle = segment.color;
  context.lineWidth = segment.lineWidth;
  context.beginPath();
  context.moveTo(segment.x1, segment.y1);
  context.quadraticCurveTo(segment.cx, segment.cy, segment.x2, segment.y2);
  context.stroke();

  context.strokeStyle = segment.fiberColor;
  context.lineWidth = Math.max(0.8, segment.lineWidth * 0.32);
  context.setLineDash([3.2, 3.8]);
  context.beginPath();
  context.moveTo(segment.x1, segment.y1 - segment.lineWidth * 0.25);
  context.quadraticCurveTo(segment.cx, segment.cy - segment.lineWidth * 0.25, segment.x2, segment.y2 - segment.lineWidth * 0.25);
  context.stroke();
  context.restore();
}

// 将整条手链绘制到 canvas，按深度排序制造真实的前后遮挡。
function renderInspectorBracelet(elements, items, rotation = 0, options = {}) {
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
  const onImageLoad = options.skipImageLoadRedraw ? null : () => {
    if (elements.inspector.open) {
      renderInspectorBracelet(elements, items, rotation, { skipImageLoadRedraw: true });
    }
  };

  scene.cordSegments.forEach((segment) => {
    drawPreviewCordSegment(context, segment);
  });

  scene.beads.forEach((bead) => {
    drawPreviewBead(context, bead, rotation, onImageLoad);
  });
}

// 兼容 dialog 能力不足的浏览器，确保弹窗能被打开。
function openModalDialog(dialog) {
  dialog.classList.remove("is-closing");
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
    return;
  }

  dialog.setAttribute("open", "");
}

// 关闭弹窗时先播放退出动画，再真正释放 dialog，避免弹层瞬间消失。
function closeModalDialog(dialog, afterClose = null) {
  if (!dialog.open && !dialog.hasAttribute("open")) {
    afterClose?.();
    return;
  }

  const finishClose = () => {
    dialog.classList.remove("is-closing");
    if (typeof dialog.close === "function" && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
    afterClose?.();
  };

  const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (isReducedMotion) {
    finishClose();
    return;
  }

  dialog.classList.add("is-closing");
  const fallbackTimer = window.setTimeout(finishClose, 220);
  dialog.addEventListener("animationend", () => {
    window.clearTimeout(fallbackTimer);
    finishClose();
  }, { once: true });
}

// 控制 3D 展示的轻量 loading 层，避免 canvas 首帧绘制阻塞弹窗入场动画。
function showInspectorLoading(elements, isLoading) {
  elements.inspectorStage.classList.toggle("is-loading", isLoading);
  elements.inspectorLoading.hidden = false;
  if (!isLoading) {
    window.setTimeout(() => {
      elements.inspectorLoading.hidden = true;
    }, 170);
  }
}

// 在弹层中展示整条手链，并支持拖入商品形成临时预览。
function openBraceletInspector(elements, items, label = "整条手链") {
  showInspectorLoading(elements, true);
  const summary = calculateSummary(items, RULES.minimumBeadCount);
  warnAndReturn(summary.error);
  elements.inspectorName.textContent = label;
  elements.inspectorDetail.textContent = items.length === 0
    ? "请先选择珠子"
    : `${items.length}颗 · ${formatPrice(summary.totalCents)}`;
  if (!elements.inspector.open) {
    openModalDialog(elements.inspector);
  }
  window.requestAnimationFrame(() => {
    renderInspectorBracelet(elements, items);
    showInspectorLoading(elements, false);
  });
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
  const hasBeads = state.items.length > 0;
  const track = calculateBraceletTrackFrame(state.items, stageWidth, stageHeight);
  warnAndReturn(track.error);
  elements.stage.classList.toggle("has-beads", hasBeads);
  elements.track.classList.toggle("has-beads", hasBeads);
  elements.track.classList.toggle("is-string-covered", state.items.length >= RULES.stringCoveredBeadCount);
  elements.trackCircles.forEach((trackCircle) => trackCircle.setAttribute("r", `${track.viewBoxRadius}`));
  const layout = calculateBeadPositions(state.items, stageWidth, stageHeight);
  warnAndReturn(layout.error);

  elements.selectedItems.replaceChildren(
    ...layout.positions.map((position, index) => {
      const item = state.items.find((candidate) => candidate.id === position.id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "selected-bead";
      button.classList.toggle("is-design-entering", state.enteringItemIds?.includes(position.id));
      button.classList.toggle("is-entering", position.id === state.lastAddedItemId);
      button.classList.toggle("is-rolling", position.id === state.rollingItemId);
      button.classList.toggle("is-selected", position.id === state.selectedItemId);
      button.dataset.itemId = item.id;
      button.style.left = `${(position.x / stageWidth) * 100}%`;
      button.style.top = `${(position.y / stageHeight) * 100}%`;
      button.style.setProperty("--enter-delay", `${Math.min(index * 34, 360)}ms`);
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
    designBuyButton: document.querySelector("#design-buy-button"),
    designDesc: document.querySelector("#design-dialog-desc"),
    designDialog: document.querySelector("#design-dialog"),
    designGrid: document.querySelector("#design-grid"),
    designLoading: document.querySelector("#design-loading"),
    designMeta: document.querySelector("#design-dialog-meta"),
    designPreview: document.querySelector("#design-dialog-preview"),
    designRemixButton: document.querySelector("#design-remix-button"),
    designStats: document.querySelector("#design-stats"),
    designTabs: [...document.querySelectorAll("[data-design-group]")],
    designTitle: document.querySelector("#design-dialog-title"),
    emptyState: document.querySelector("#empty-state"),
    feedback: document.querySelector("#editor-feedback"),
    inspectButton: document.querySelector("#inspect-button"),
    inspector: document.querySelector("#bead-inspector"),
    inspectorCanvas: document.querySelector("#inspector-canvas"),
    inspectorCheckoutButton: document.querySelector("#inspector-checkout-button"),
    inspectorDetail: document.querySelector("#inspector-detail"),
    inspectorLoading: document.querySelector("#inspector-loading"),
    inspectorName: document.querySelector("#inspector-name"),
    inspectorStage: document.querySelector(".inspector-stage"),
    noticeButton: document.querySelector("#notice-button"),
    noResults: document.querySelector("#no-results"),
    orderConfirmButton: document.querySelector("#order-confirm-button"),
    orderDialog: document.querySelector("#order-dialog"),
    orderPreview: document.querySelector("#order-preview"),
    orderSummary: document.querySelector("#order-summary"),
    priceStatus: document.querySelector("#price-status"),
    productGrid: document.querySelector("#product-grid"),
    saveDesignButton: document.querySelector("#save-design-button"),
    searchInput: document.querySelector("#search-input"),
    selectedItems: document.querySelector("#selected-items"),
    soundButton: document.querySelector("#sound-button"),
    stage: document.querySelector("#bracelet-stage"),
    shell: document.querySelector(".app-shell"),
    track: document.querySelector(".bracelet-track"),
    trackCircle: document.querySelector("#bracelet-track-circle"),
    trackCircles: [...document.querySelectorAll(".rope-circle")],
    usageDialog: document.querySelector("#usage-dialog"),
    viewButtons: [...document.querySelectorAll("[data-view-target]")],
    viewPanels: [...document.querySelectorAll("[data-view-panel]")],
    wristStatus: document.querySelector("#wrist-status"),
  };

  if (Object.values(elements).some((element) => (Array.isArray(element) ? element.length === 0 : !element))) {
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
  let soundContext = null;
  let soundMuted = false;
  let suppressProductClick = false;
  let activeDesignId = null;
  let activeDesignGroup = "designer";
  let designEnterTimer = null;
  const savedDesignReadResult = readSavedDesigns(window.localStorage);
  warnAndReturn(savedDesignReadResult.error);
  let savedDesigns = savedDesignReadResult.designs;

  // 用 WebAudio 生成短促、低音量的反馈音，不依赖外部音频文件。
  function playInteractionSound(kind) {
    const plan = createInteractionSoundPlan(kind, { muted: soundMuted });
    if (plan.muted || plan.frequencies.length === 0) {
      return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    soundContext ??= new AudioContextClass();
    const startAt = soundContext.currentTime;
    plan.frequencies.forEach((frequency, index) => {
      const oscillator = soundContext.createOscillator();
      const gain = soundContext.createGain();
      oscillator.type = index === 0 ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, startAt + index * 0.035);
      gain.gain.setValueAtTime(0.0001, startAt + index * 0.035);
      gain.gain.exponentialRampToValueAtTime(plan.gain, startAt + index * 0.035 + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + plan.durationMs / 1000);
      oscillator.connect(gain).connect(soundContext.destination);
      oscillator.start(startAt + index * 0.035);
      oscillator.stop(startAt + plan.durationMs / 1000 + 0.02);
    });
  }

  // 切换音效开关，并保持按钮语义与视觉状态同步。
  function toggleSound() {
    soundMuted = !soundMuted;
    elements.soundButton.classList.toggle("is-muted", soundMuted);
    elements.soundButton.setAttribute("aria-pressed", String(!soundMuted));
    elements.soundButton.textContent = soundMuted ? "♪ 静音" : "♪ 音效";
    if (!soundMuted) {
      playInteractionSound("modal");
    }
  }

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

  // 在 DIY 和设计广场之间切换一级视图，hash 异常时默认回到 DIY。
  function showView(viewName, options = {}) {
    const safeViewName = viewName === "gallery" ? "gallery" : "diy";
    elements.shell.classList.toggle("is-gallery", safeViewName === "gallery");
    elements.viewPanels.forEach((panel) => {
      panel.hidden = panel.dataset.viewPanel !== safeViewName;
    });
    elements.viewButtons.forEach((button) => {
      const isActive = button.dataset.viewTarget === safeViewName;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });

    if (!options.skipHash) {
      const nextHash = safeViewName === "gallery" ? "#gallery" : "#diy";
      if (window.location.hash !== nextHash) {
        window.location.hash = nextHash;
      }
    }

    if (safeViewName === "diy") {
      window.requestAnimationFrame(() => renderBracelet(elements, state));
    }
  }

  // 为设计操作提供短暂 loading 态，避免重复点击导致状态反复写入。
  function setDesignBusy(isBusy) {
    elements.designLoading.hidden = !isBusy;
    elements.designBuyButton.disabled = isBusy;
    elements.designRemixButton.disabled = isBusy;
  }

  // 同步设计广场统计和当前 tab 内容，保存/删除后只刷新必要区域。
  function refreshDesignGallery() {
    elements.designStats.textContent = createDesignGalleryStats(savedDesigns);
    renderDesignGallery(elements, activeDesignGroup, savedDesigns);
  }

  // 切换设计广场二级 tab，异常值回到设计师款，避免 hash 或数据污染导致空白。
  function switchDesignGroup(group) {
    activeDesignGroup = group === "customer" || group === "saved" ? group : "designer";
    elements.designTabs.forEach((tab) => {
      const isActive = tab.dataset.designGroup === activeDesignGroup;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });
    refreshDesignGallery();
  }

  // 打开设计详情弹窗，并用同一套珠子预览样式展示大图。
  function openDesignDialog(designId) {
    const result = createBraceletStateFromDesignPreset(designId);
    warnAndReturn(result.error);
    notifyError(result.error);
    if (result.error) {
      return;
    }

    activeDesignId = designId;
    elements.designTitle.textContent = result.design.title;
    elements.designMeta.textContent = `${result.design.author} · ${result.design.likes.toLocaleString("zh-CN")}人使用 · ${result.state.items.length}颗`;
    elements.designDesc.textContent = result.design.desc;
    renderDesignPreview(elements.designPreview, result.state.items, 360, 240, "design-dialog-bead");
    setDesignBusy(false);
    openModalDialog(elements.designDialog);
    playInteractionSound("modal");
  }

  // 将设计复制到当前 DIY 状态，返回是否成功，供购买和二次设计共用。
  function applyDesignToCurrentState(designId, options = {}) {
    const result = options.animate
      ? createBraceletStateFromDesignPreset(designId, { animate: true })
      : createBraceletStateFromDesignPreset(designId);
    warnAndReturn(result.error);
    notifyError(result.error);
    if (result.error) {
      return false;
    }

    state = result.state;
    if (!options.deferRender) {
      state = render(elements, state);
    }
    return true;
  }

  // 将当前 DIY 手链保存到“我的设计”，先存本地缓存，后续可平滑替换为后端接口。
  function saveCurrentDesign() {
    const result = saveBraceletDesign(window.localStorage, state.items);
    warnAndReturn(result.error);
    if (result.error) {
      notifyError(result.error);
      return;
    }

    savedDesigns = result.designs;
    refreshDesignGallery();
    notify("已保存到我的设计");
    playInteractionSound("modal");
  }

  // 打开本地设计时直接回到 DIY 修改，不再多弹一层详情。
  function applySavedDesignToCurrentState(designId) {
    const design = savedDesigns.find((candidate) => candidate.id === designId);
    const result = createBraceletStateFromDesign(design);
    warnAndReturn(result.error);
    notifyError(result.error);
    if (result.error) {
      return;
    }

    state = result.state;
    state = render(elements, state);
    showView("diy");
    notify("已载入我的设计，可继续修改");
  }

  // 删除我的设计并刷新统计，失败时保留当前列表。
  function deleteSavedDesign(designId) {
    const result = removeSavedDesign(window.localStorage, designId);
    warnAndReturn(result.error);
    if (result.error) {
      notifyError(result.error);
      return;
    }

    savedDesigns = result.designs;
    refreshDesignGallery();
    notify("已删除设计");
  }

  // 播放视频模板里的商品卡按压涟漪，给用户明确的“从这里装珠”反馈。
  function playProductPlacementFeedback(productButton) {
    if (!productButton) {
      return;
    }

    productButton.classList.remove("is-placing");
    void productButton.offsetWidth;
    productButton.classList.add("is-placing");
    window.setTimeout(() => productButton.classList.remove("is-placing"), 620);
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
    playInteractionSound("add");
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
      playInteractionSound("clear");
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
      closeModalDialog(elements.inspector, () => openModalDialog(elements.orderDialog));
      playInteractionSound("modal");
      return;
    }
    openModalDialog(elements.orderDialog);
    playInteractionSound("modal");
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
    playInteractionSound("modal");
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
  refreshDesignGallery();
  state = render(elements, state);
  showView(window.location.hash === "#gallery" ? "gallery" : "diy", { skipHash: true });

  window.addEventListener("hashchange", () => {
    showView(window.location.hash === "#gallery" ? "gallery" : "diy", { skipHash: true });
  });

  elements.viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showView(button.dataset.viewTarget);
      playInteractionSound("modal");
    });
  });

  elements.designGrid.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("button[data-saved-delete-id]");
    if (deleteButton) {
      deleteSavedDesign(deleteButton.dataset.savedDeleteId);
      return;
    }

    const designButton = event.target.closest("button[data-design-id]");
    if (!designButton) {
      return;
    }

    if (activeDesignGroup === "saved") {
      applySavedDesignToCurrentState(designButton.dataset.designId);
      return;
    }

    openDesignDialog(designButton.dataset.designId);
  });

  elements.designTabs.forEach((button) => {
    button.addEventListener("click", () => {
      switchDesignGroup(button.dataset.designGroup);
      playInteractionSound("tap");
    });
  });

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

  elements.saveDesignButton.addEventListener("click", saveCurrentDesign);

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
      const refreshedProductButton = elements.productGrid.querySelector(`button[data-product-id="${product.id}"]`);
      playProductPlacementFeedback(refreshedProductButton);
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
        const addedItemId = result.state.lastAddedItemId;
        state = result.state;
        state = render(elements, state);
        if (target.type === "stage" && addedItemId) {
          playBeadPlacementAnimation(
            dragSession.product,
            dragSession.sourceRect,
            elements.selectedItems.querySelector(`button[data-item-id="${addedItemId}"]`),
          );
        } else if (target.type === "item") {
          playInteractionSound("roll");
        }
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
      playInteractionSound("roll");
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
      playInteractionSound("clear");
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

  elements.soundButton.addEventListener("click", toggleSound);

  elements.checkoutButton.addEventListener("click", () => showOrderDialog(state.items));

  elements.inspectorCheckoutButton.addEventListener("click", () => showOrderDialog(inspectorItems));

  elements.inspector.addEventListener("click", (event) => {
    if (event.target === elements.inspector || event.target.closest(".inspector-close")) {
      closeModalDialog(elements.inspector);
    }
  });
  elements.inspector.addEventListener("close", stopInspectorAnimation);
  elements.inspector.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeModalDialog(elements.inspector);
  });

  elements.orderDialog.addEventListener("click", (event) => {
    if (event.target === elements.orderDialog || event.target.closest(".order-close, .order-dismiss")) {
      closeModalDialog(elements.orderDialog);
    }
  });

  elements.orderDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeModalDialog(elements.orderDialog);
  });

  elements.orderConfirmButton.addEventListener("click", () => {
    notify("订单已确认（演示）");
    closeModalDialog(elements.orderDialog);
  });

  elements.designDialog.addEventListener("click", (event) => {
    if (event.target === elements.designDialog || event.target.closest(".design-close")) {
      closeModalDialog(elements.designDialog);
    }
  });

  elements.designDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeModalDialog(elements.designDialog);
  });

  elements.designBuyButton.addEventListener("click", () => {
    if (!activeDesignId) {
      notify("请先选择一个设计");
      return;
    }

    setDesignBusy(true);
    if (!applyDesignToCurrentState(activeDesignId)) {
      setDesignBusy(false);
      return;
    }

    closeModalDialog(elements.designDialog, () => {
      setDesignBusy(false);
      showOrderDialog(state.items);
    });
  });

  elements.designRemixButton.addEventListener("click", () => {
    if (!activeDesignId) {
      notify("请先选择一个设计");
      return;
    }

    setDesignBusy(true);
    if (!applyDesignToCurrentState(activeDesignId, { animate: true, deferRender: true })) {
      setDesignBusy(false);
      return;
    }

    closeModalDialog(elements.designDialog, () => {
      showView("diy");
      window.requestAnimationFrame(() => {
        state = render(elements, state);
      });
      window.clearTimeout(designEnterTimer);
      designEnterTimer = window.setTimeout(() => {
        state = { ...state, enteringItemIds: [] };
        designEnterTimer = null;
      }, 980);
      setDesignBusy(false);
      notify("已复制到 DIY，可以继续二次设计");
      playInteractionSound("add");
    });
  });

  elements.noticeButton.addEventListener("click", () => {
    openModalDialog(elements.usageDialog);
    playInteractionSound("modal");
  });

  elements.usageDialog.addEventListener("click", (event) => {
    if (event.target === elements.usageDialog || event.target.closest(".usage-close")) {
      closeModalDialog(elements.usageDialog);
    }
  });
  elements.usageDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeModalDialog(elements.usageDialog);
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
