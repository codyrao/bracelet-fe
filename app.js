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
    nextItemNumber: 1,
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
export function addBraceletItem(state, product) {
  if (!isValidBraceletState(state)) {
    return { state: createInitialState(), error: new Error("手链状态无效，已恢复为空状态。") };
  }

  if (!isValidProduct(product)) {
    return { state, error: new Error("商品信息不完整，无法加入手链。") };
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
      nextItemNumber: state.nextItemNumber + 1,
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

  return {
    state: { ...state, items: remainingItems },
    error: null,
  };
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
  const radiusX = width * 0.27;
  const radiusY = height * 0.28;

  const positions = items.map((item) => {
    const weight = item.diameterMm + 4;
    const angle = -Math.PI / 2 + ((consumedWeight + weight / 2) / totalWeight) * Math.PI * 2;
    consumedWeight += weight;

    return {
      id: item.id,
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY,
      size: Math.max(28, Math.min(52, item.diameterMm * 4)),
    };
  });

  return { positions, error: null };
}

// 原型使用的本地商品库，避免依赖网络图片或后端接口。
const PRODUCTS = [
  { id: "clear-6", category: "clear", name: "净体白水晶", diameterMm: 6, priceCents: 300, tone: "clear" },
  { id: "clear-8", category: "clear", name: "净体白水晶", diameterMm: 8, priceCents: 500, tone: "clear" },
  { id: "clear-10", category: "clear", name: "净体白水晶", diameterMm: 10, priceCents: 1000, tone: "clear" },
  { id: "milk-8", category: "milk", name: "奶白晶", diameterMm: 8, priceCents: 400, tone: "milk" },
  { id: "milk-10", category: "milk", name: "奶白晶", diameterMm: 10, priceCents: 800, tone: "milk" },
  { id: "rose-8", category: "rose", name: "粉水晶", diameterMm: 8, priceCents: 600, tone: "rose" },
  { id: "tea-10", category: "tea", name: "茶水晶", diameterMm: 10, priceCents: 700, tone: "tea" },
  { id: "black-8", category: "black", name: "黑曜石", diameterMm: 8, priceCents: 500, tone: "black" },
  { id: "clear-12", category: "clear", name: "净体白水晶", diameterMm: 12, priceCents: 1500, tone: "clear" },
];

// 集中保存演示原型的可调整业务规则。
const RULES = {
  minimumBeadCount: 16,
};

// 侧边分类与商品库 category 字段一一对应。
const CATEGORIES = [
  { id: "all", label: "全部" },
  { id: "clear", label: "白水晶" },
  { id: "milk", label: "奶白晶" },
  { id: "rose", label: "粉水晶" },
  { id: "tea", label: "茶水晶" },
  { id: "black", label: "黑曜石" },
];

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
  elements.productGrid.replaceChildren(
    ...products.map((product) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "product-card";
      button.dataset.productId = product.id;
      button.setAttribute("aria-label", `添加${product.name} ${product.diameterMm}毫米，${formatPrice(product.priceCents)}`);

      const bead = document.createElement("span");
      bead.className = `product-bead tone-${product.tone}`;
      bead.style.setProperty("--bead-diameter", `${Math.max(28, Math.min(48, product.diameterMm * 4))}px`);

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
  elements.countStatus.textContent = summary.isInsufficient
    ? `珠子数量不足（${summary.count}/${RULES.minimumBeadCount}）`
    : `珠子数量已满足（${summary.count}/${RULES.minimumBeadCount}）`;
  elements.countStatus.classList.toggle("is-ready", !summary.isInsufficient);
  elements.priceStatus.textContent = `总价格: ${formatPrice(summary.totalCents)}`;
  elements.clearButton.disabled = summary.count === 0;
}

// 根据椭圆轨道坐标渲染可删除的已选珠子。
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
      button.dataset.itemId = item.id;
      button.style.left = `${(position.x / stageWidth) * 100}%`;
      button.style.top = `${(position.y / stageHeight) * 100}%`;
      button.style.setProperty("--selected-size", `${position.size}px`);
      button.setAttribute("aria-label", `删除${item.name} ${item.diameterMm}毫米`);

      const core = document.createElement("span");
      core.className = `selected-bead-core tone-${PRODUCTS.find((product) => product.id === item.productId)?.tone ?? "clear"}`;
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
}

// 初始化页面交互，并将状态更新限制在本地内存中。
function initializeApp() {
  const elements = {
    categoryList: document.querySelector("#category-list"),
    clearButton: document.querySelector("#clear-button"),
    countStatus: document.querySelector("#count-status"),
    emptyState: document.querySelector("#empty-state"),
    noResults: document.querySelector("#no-results"),
    priceStatus: document.querySelector("#price-status"),
    productGrid: document.querySelector("#product-grid"),
    searchInput: document.querySelector("#search-input"),
    selectedItems: document.querySelector("#selected-items"),
    stage: document.querySelector("#bracelet-stage"),
  };

  if (Object.values(elements).some((element) => !element)) {
    console.warn("页面缺少 DIY 手链所需的渲染节点。");
    return;
  }

  let state = createInitialState();
  render(elements, state);

  elements.categoryList.addEventListener("click", (event) => {
    const categoryButton = event.target.closest("button[data-category]");
    if (!categoryButton) {
      return;
    }

    state = { ...state, selectedCategory: categoryButton.dataset.category };
    render(elements, state);
  });

  elements.searchInput.addEventListener("input", (event) => {
    state = { ...state, query: event.target.value };
    render(elements, state);
  });

  elements.productGrid.addEventListener("click", (event) => {
    const productButton = event.target.closest("button[data-product-id]");
    if (!productButton) {
      return;
    }

    const product = PRODUCTS.find((candidate) => candidate.id === productButton.dataset.productId);
    const result = addBraceletItem(state, product);
    warnAndReturn(result.error);
    state = result.state;
    render(elements, state);
  });

  elements.selectedItems.addEventListener("click", (event) => {
    const beadButton = event.target.closest("button[data-item-id]");
    if (!beadButton) {
      return;
    }

    const result = removeBraceletItem(state, beadButton.dataset.itemId);
    warnAndReturn(result.error);
    state = result.state;
    render(elements, state);
  });

  elements.clearButton.addEventListener("click", () => {
    state = { ...state, items: [] };
    render(elements, state);
  });

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
