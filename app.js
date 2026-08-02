function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneDefaultSettings() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

const DEFAULT_BOOKS = [
  {
    id: newId(),
    title: "הארי פוטר ואבן החכמים",
    author: "ג'יי קיי רולינג",
    barcode: "9789654487652",
    category: "ספרות",
    price: 45,
    originalPrice: 65,
    stock: 4,
    sold: 0,
    notes: "עותק קריאה נוח לנוער ולמבוגרים.",
    imageUrl: "",
    isNew: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
  },
  {
    id: newId(),
    title: "קיצור תולדות האנושות",
    author: "יובל נח הררי",
    barcode: "9789655455308",
    category: "עיון",
    price: 65,
    originalPrice: 89,
    stock: 3,
    sold: 0,
    notes: "",
    imageUrl: "",
    isNew: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString()
  },
  {
    id: newId(),
    title: "דירה להשכיר",
    author: "לאה גולדברג",
    barcode: "9789650701066",
    category: "ילדים",
    price: 35,
    originalPrice: 45,
    stock: 6,
    sold: 0,
    notes: "ספר ילדים קלאסי.",
    imageUrl: "",
    isNew: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  },
  {
    id: newId(),
    title: "אליפים",
    author: "אסתר שטרייט-וורצל",
    barcode: "9789650710037",
    category: "ספרות",
    price: 30,
    originalPrice: 40,
    stock: 2,
    sold: 0,
    notes: "",
    imageUrl: "",
    isNew: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString()
  }
];

const DEFAULT_SETTINGS = {
  business: {
    name: "נאמן ספרים",
    tagline: "סרקו ברקוד או חפשו ספר כדי לדעת מחיר מיד."
  },
  categories: ["ספרות", "ילדים", "עיון", "לימוד", "אחר"],
  slideshow: {
    enabled: true,
    idleSeconds: 45,
    slideSeconds: 6,
    items: []
  },
  traderPrices: [],
  promotions: [
    { id: newId(), title: "3 ספרים ב-100", details: "תקף לספרים משתתפים במבצע.", imageUrl: "", isActive: true, showInSlideshow: true, showInBanner: true, sortOrder: 1 },
    { id: newId(), title: "ספרי ילדים מ-35 ₪", details: "חפשו לפי שם הספר או סרקו ברקוד למחיר מדויק.", imageUrl: "", isActive: true, showInSlideshow: true, showInBanner: true, sortOrder: 2 }
  ],
  payment: {
    bitQrUrl: "",
    bitDetails: "אפשר לשלם ב-Bit לפי המספר שמופיע בדוכן.",
    bankDetails: "פרטי העברה בנקאית יופיעו כאן.",
    notes: "לאחר תשלום סמנו רכישה כדי שהמלאי יתעדכן."
  },
  about: {
    title: "על הדוכן",
    text: "כאן יופיע מידע על העסק, שעות פעילות, מדיניות החלפה וכל דבר שחשוב ללקוחות לדעת."
  },
  security: {
    adminPin: ""
  }
};

const ORDER_STATUSES = {
  new: "ממתין",
  contacted: "יצרנו קשר",
  ordered: "הוזמן",
  done: "הושלם",
  cancelled: "בוטל"
};

const storageKeys = {
  books: "bookStand.books",
  sales: "bookStand.sales",
  cart: "bookStand.cart",
  orders: "bookStand.orders",
  invoices: "bookStand.invoices",
  oldRequests: "bookStand.requests",
  settings: "bookStand.settings",
  backups: "bookStand.backups"
};

const CART_IDLE_CLEAR_MS = 5 * 60 * 1000;
const ADMIN_AUTO_LOCK_MS = 3 * 60 * 1000;

let state = {
  books: [],
  sales: [],
  cart: [],
  orders: [],
  invoices: [],
  settings: cloneDefaultSettings(),
  scanner: null,
  adminBarcodeScanner: null,
  lastResult: null,
  customerScreen: "home",
  previousCustomerScreen: "home",
  supabase: null,
  usingRemote: false,
  editingBookImageUrl: "",
  orderDraftTitle: "",
  orderFormReturnScreen: "order",
  pendingPurchaseBookId: "",
  adminPanel: "books",
  activeTraderName: "",
  activeTraderBookTitle: "",
  adminUnlocked: globalThis.sessionStorage?.getItem("bookStand.adminUnlocked") === "true",
  undoStack: [],
  hiddenAdminTapCount: 0,
  hiddenAdminTapTimer: null,
  hiddenAdminLongPressTimer: null,
  hiddenAdminLongPressOpened: false,
  idleTimer: null,
  cartIdleTimer: null,
  adminAutoLockTimer: null,
  slideTimer: null,
  currentSlideIndex: 0,
  currentSlides: []
};

const $ = (selector) => document.querySelector(selector);

const elements = {
  tabs: document.querySelectorAll(".tab-button"),
  kioskView: $("#kiosk-view"),
  aboutView: $("#about-view"),
  adminView: $("#admin-view"),
  adminPanelTabs: document.querySelectorAll("[data-admin-panel-tab]"),
  adminPanels: document.querySelectorAll("[data-admin-panel]"),
  customerHome: $("#customer-home"),
  customerBusinessName: $("#customer-business-name"),
  promoTicker: $("#promo-ticker"),
  promoTickerTrack: $("#promo-ticker-track"),
  customerScreens: document.querySelectorAll(".customer-screen"),
  customerActions: document.querySelectorAll("[data-customer-screen]"),
  customerBackButtons: document.querySelectorAll("[data-customer-back]"),
  paymentInfoButton: $("#payment-info-button"),
  openCartButton: $("#open-cart-button"),
  floatingCartButton: $("#floating-cart-button"),
  scanScreen: $("#scan-screen"),
  scanButton: $("#scan-button"),
  stopScanButton: $("#stop-scan-button"),
  scannerShell: $("#scanner-shell"),
  manualForm: $("#manual-form"),
  manualBarcode: $("#manual-barcode"),
  bookSearchForm: $("#book-search-form"),
  bookSearch: $("#book-search"),
  customerSuggestions: $("#customer-suggestions"),
  searchResults: $("#search-results"),
  resultPanel: $("#result-panel"),
  cartPanel: $("#cart-panel"),
  promotionsList: $("#promotions-list"),
  newBooksList: $("#new-books-list"),
  orderSearchForm: $("#order-search-form"),
  orderSearch: $("#order-search"),
  orderSuggestions: $("#order-suggestions"),
  orderSearchResults: $("#order-search-results"),
  showOrderFormButton: $("#show-order-form-button"),
  backToOrderSearch: $("#back-to-order-search"),
  orderForm: $("#order-form"),
  orderTitle: $("#order-title"),
  orderCustomerName: $("#order-customer-name"),
  orderPhone: $("#order-phone"),
  orderNotes: $("#order-notes"),
  bitQrBox: $("#bit-qr-box"),
  bitDetails: $("#bit-details"),
  bankDetails: $("#bank-details"),
  paymentNotes: $("#payment-notes"),
  purchaseBitQrBox: $("#purchase-bit-qr-box"),
  purchaseBitDetails: $("#purchase-bit-details"),
  purchaseBankDetails: $("#purchase-bank-details"),
  purchasePaymentNotes: $("#purchase-payment-notes"),
  purchaseCartSummary: $("#purchase-cart-summary"),
  purchaseBookTitle: $("#purchase-book-title"),
  purchaseBookSuggestions: $("#purchase-book-suggestions"),
  aboutBackButton: $("#about-back-button"),
  aboutTitle: $("#about-title"),
  aboutText: $("#about-text"),
  syncStatus: $("#sync-status"),
  salesSummary: $("#sales-summary"),
  recentSalesList: $("#recent-sales-list"),
  topSalesList: $("#top-sales-list"),
  paymentForm: $("#payment-form"),
  adminBitQrUrl: $("#admin-bit-qr-url"),
  adminBitDetails: $("#admin-bit-details"),
  adminBankDetails: $("#admin-bank-details"),
  adminPaymentNotes: $("#admin-payment-notes"),
  aboutForm: $("#about-form"),
  adminBusinessName: $("#admin-business-name"),
  adminBusinessTagline: $("#admin-business-tagline"),
  adminAboutTitle: $("#admin-about-title"),
  adminAboutText: $("#admin-about-text"),
  securityForm: $("#security-form"),
  adminNewPin: $("#admin-new-pin"),
  adminConfirmPin: $("#admin-confirm-pin"),
  booksTable: $("#books-table"),
  booksCount: $("#books-count"),
  searchBooks: $("#search-books"),
  adminBookSuggestions: $("#admin-book-suggestions"),
  bookSort: $("#book-sort"),
  clearBooksSearch: $("#clear-books-search"),
  bookImportForm: $("#book-import-form"),
  bookImportFile: $("#book-import-file"),
  bookImportStock: $("#book-import-stock"),
  bookImportPaste: $("#book-import-paste"),
  bookImportStatus: $("#book-import-status"),
  categoryForm: $("#category-form"),
  categoryName: $("#category-name"),
  categoryList: $("#category-list"),
  addBookButton: $("#add-book-button"),
  adminPromotionsList: $("#admin-promotions-list"),
  addPromoButton: $("#add-promo-button"),
  ordersTable: $("#orders-table"),
  searchOrders: $("#search-orders"),
  orderStatusFilter: $("#order-status-filter"),
  adminOrderForm: $("#admin-order-form"),
  adminOrderTitle: $("#admin-order-title"),
  adminOrderSuggestions: $("#admin-order-suggestions"),
  adminOrderCustomerName: $("#admin-order-customer-name"),
  adminOrderPhone: $("#admin-order-phone"),
  adminOrderStatus: $("#admin-order-status"),
  adminOrderPaid: $("#admin-order-paid"),
  adminOrderNotes: $("#admin-order-notes"),
  invoiceUploadForm: $("#invoice-upload-form"),
  invoiceFile: $("#invoice-file"),
  invoiceSupplier: $("#invoice-supplier"),
  invoiceNumber: $("#invoice-number"),
  invoiceDate: $("#invoice-date"),
  invoiceType: $("#invoice-type"),
  invoiceAmount: $("#invoice-amount"),
  invoiceStatus: $("#invoice-status"),
  invoiceNotes: $("#invoice-notes"),
  invoiceAutoDetect: $("#invoice-auto-detect"),
  invoiceMonthFilter: $("#invoice-month-filter"),
  invoiceSupplierFilter: $("#invoice-supplier-filter"),
  invoiceTypeFilter: $("#invoice-type-filter"),
  invoiceStatusFilter: $("#invoice-status-filter"),
  invoiceSummary: $("#invoice-summary"),
  invoiceList: $("#invoice-list"),
  geminiInvoiceForm: $("#gemini-invoice-form"),
  geminiApiKey: $("#gemini-api-key"),
  geminiInvoiceFile: $("#gemini-invoice-file"),
  geminiStatus: $("#gemini-status"),
  geminiOutput: $("#gemini-output"),
  returnToCustomerButton: $("#return-to-customer-button"),
  lockAdminButton: $("#lock-admin-button"),
  exportButton: $("#export-button"),
  importDataButton: $("#import-data-button"),
  importDataFile: $("#import-data-file"),
  bookDialog: $("#book-dialog"),
  bookDialogForm: $("#book-dialog-form"),
  bookDialogTitle: $("#book-dialog-title"),
  bookId: $("#book-id"),
  bookTitle: $("#book-title"),
  bookAuthor: $("#book-author"),
  bookBarcode: $("#book-barcode"),
  scanBookBarcodeButton: $("#scan-book-barcode-button"),
  adminBarcodeScannerShell: $("#admin-barcode-scanner-shell"),
  adminBarcodeReader: $("#admin-barcode-reader"),
  stopAdminBarcodeScanButton: $("#stop-admin-barcode-scan-button"),
  bookCategory: $("#book-category"),
  bookPrice: $("#book-price"),
  bookOriginalPrice: $("#book-original-price"),
  bookStock: $("#book-stock"),
  bookIsNew: $("#book-is-new"),
  bookIsOnSale: $("#book-is-on-sale"),
  bookShowInSlideshow: $("#book-show-in-slideshow"),
  bookDescription: $("#book-description"),
  bookNotes: $("#book-notes"),
  bookPurchaseCost: $("#book-purchase-cost"),
  bookPurchaseSource: $("#book-purchase-source"),
  bookImageUrl: $("#book-image-url"),
  bookImageFile: $("#book-image-file"),
  deleteBookFromDialog: $("#delete-book-from-dialog"),
  deleteBookDialog: $("#delete-book-dialog"),
  deleteBookConfirmText: $("#delete-book-confirm-text"),
  confirmDeleteBookButton: $("#confirm-delete-book-button"),
  promoDialog: $("#promo-dialog"),
  promoDialogForm: $("#promo-dialog-form"),
  promoDialogTitle: $("#promo-dialog-title"),
  promoId: $("#promo-id"),
  promoTitle: $("#promo-title"),
  promoDetailsInput: $("#promo-details-input"),
  promoImageUrl: $("#promo-image-url"),
  promoSortOrder: $("#promo-sort-order"),
  promoActive: $("#promo-active"),
  promoShowInSlideshow: $("#promo-show-in-slideshow"),
  promoShowInBanner: $("#promo-show-in-banner"),
  addSlideButton: $("#add-slide-button"),
  adminSlidesList: $("#admin-slides-list"),
  slideshowPreviewList: $("#slideshow-preview-list"),
  slideshowSettingsForm: $("#slideshow-settings-form"),
  slideshowEnabled: $("#slideshow-enabled"),
  slideshowIdleSeconds: $("#slideshow-idle-seconds"),
  slideshowSlideSeconds: $("#slideshow-slide-seconds"),
  traderPriceForm: $("#trader-price-form"),
  traderBookTitle: $("#trader-book-title"),
  traderBookSuggestions: $("#trader-book-suggestions"),
  traderRegularPrice: $("#trader-regular-price"),
  traderDealerPrice: $("#trader-dealer-price"),
  traderName: $("#trader-name"),
  traderDirectory: $("#trader-directory"),
  traderBookDirectory: $("#trader-book-directory"),
  traderActivePanel: $("#trader-active-panel"),
  activeTraderName: $("#active-trader-name"),
  closeActiveTrader: $("#close-active-trader"),
  activeTraderPricesList: $("#active-trader-prices-list"),
  traderActiveBookPanel: $("#trader-active-book-panel"),
  activeTraderBookName: $("#active-trader-book-name"),
  closeActiveTraderBook: $("#close-active-trader-book"),
  activeTraderBookPricesList: $("#active-trader-book-prices-list"),
  traderPricesList: $("#trader-prices-list"),
  slideDialog: $("#slide-dialog"),
  slideDialogForm: $("#slide-dialog-form"),
  slideDialogTitle: $("#slide-dialog-title"),
  slideId: $("#slide-id"),
  slideTitle: $("#slide-title"),
  slideText: $("#slide-text"),
  slideImageUrl: $("#slide-image-url"),
  slideBgColor: $("#slide-bg-color"),
  slideDuration: $("#slide-duration"),
  slideSortOrder: $("#slide-sort-order"),
  slideActive: $("#slide-active"),
  paymentDialog: $("#payment-dialog"),
  purchaseConfirmDialog: $("#purchase-confirm-dialog"),
  purchaseConfirmText: $("#purchase-confirm-text"),
  confirmPurchaseButton: $("#confirm-purchase-button"),
  clearCartDialog: $("#clear-cart-dialog"),
  confirmClearCartButton: $("#confirm-clear-cart-button"),
  undoButton: $("#undo-button"),
  undoDialog: $("#undo-dialog"),
  undoConfirmText: $("#undo-confirm-text"),
  confirmUndoButton: $("#confirm-undo-button"),
  adminAccessDialog: $("#admin-access-dialog"),
  adminAccessForm: $("#admin-access-form"),
  adminPinInput: $("#admin-pin-input"),
  idleSlideshow: $("#idle-slideshow"),
  idleSlide: $("#idle-slide"),
  idleSlideDots: $("#idle-slide-dots"),
  idleSlideshowClose: $("#idle-slideshow-close"),
  toast: $("#toast")
};

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => elements.toast.classList.remove("show"), 2600);
}

/**
 * Shows a clear Hebrew error message to the user while keeping the technical
 * details in the browser console for future debugging.
 */
function handleAppError(error, userMessage = "משהו השתבש. נסו שוב או פנו לבעל הדוכן.") {
  console.error(error);
  showToast(userMessage);
}

/**
 * Wraps event handlers so runtime errors do not silently break the kiosk flow.
 */
function runSafely(action, userMessage) {
  return async (...args) => {
    try {
      await action(...args);
    } catch (error) {
      handleAppError(error, userMessage);
    }
  };
}

function normalizeBarcode(value) {
  const cleaned = String(value || "").trim().toUpperCase().replace(/[^0-9X]/g, "");
  if (cleaned.length === 10 && cleaned.endsWith("X")) return cleaned;
  return cleaned.replace(/X/g, "");
}

function isbn10CheckDigit(firstNineDigits) {
  if (!/^\d{9}$/.test(firstNineDigits)) return "";
  const sum = firstNineDigits
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (10 - index), 0);
  const remainder = 11 - (sum % 11);
  if (remainder === 10) return "X";
  if (remainder === 11) return "0";
  return String(remainder);
}

function isbn13CheckDigit(firstTwelveDigits) {
  if (!/^\d{12}$/.test(firstTwelveDigits)) return "";
  const sum = firstTwelveDigits
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
}

function barcodeCandidates(value) {
  const normalized = normalizeBarcode(value);
  if (!normalized) return [];

  const candidates = new Set([normalized]);
  if (/^\d{13}$/.test(normalized) && normalized.startsWith("0")) {
    candidates.add(normalized.slice(1));
  }
  if (normalized.length > 10 && /^0+\d+$/.test(normalized)) {
    const withoutLeadingZeros = normalized.replace(/^0+/, "");
    if (withoutLeadingZeros) candidates.add(withoutLeadingZeros);
  }
  if (/^\d{12}$/.test(normalized)) {
    candidates.add(`0${normalized}`);
  }
  if (/^\d{13}$/.test(normalized) && normalized.startsWith("978")) {
    const isbn10Base = normalized.slice(3, 12);
    const isbn10Check = isbn10CheckDigit(isbn10Base);
    if (isbn10Check) candidates.add(`${isbn10Base}${isbn10Check}`);
  }
  if (/^\d{9}[\dX]$/.test(normalized)) {
    const isbn13Base = `978${normalized.slice(0, 9)}`;
    candidates.add(`${isbn13Base}${isbn13CheckDigit(isbn13Base)}`);
  }
  return [...candidates];
}

function money(value) {
  return `${Number(value || 0).toLocaleString("he-IL")} ₪`;
}

function cartIcon() {
  return `
    <svg class="cart-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 7h14l-1.6 7.2a2 2 0 0 1-2 1.6H9.2a2 2 0 0 1-2-1.7L5.8 4H3" />
      <circle cx="9.5" cy="20" r="1.4" />
      <circle cx="17.5" cy="20" r="1.4" />
    </svg>
  `;
}

function withCartIcon(label) {
  return `${cartIcon()}<span>${escapeHtml(label)}</span>`;
}

function normalizeBook(book) {
  return {
    id: book.id || newId(),
    title: book.title || "",
    author: book.author || "",
    barcode: normalizeBarcode(book.barcode),
    category: book.category || "אחר",
    price: Number(book.price || 0),
    originalPrice: Number(book.originalPrice ?? book.original_price ?? 0),
    stock: Number(book.stock || 0),
    sold: Number(book.sold || 0),
    description: book.description || "",
    notes: book.notes || "",
    purchaseCost: Number(book.purchaseCost ?? book.purchase_cost ?? 0),
    purchaseSource: book.purchaseSource || book.purchase_source || "",
    imageUrl: book.imageUrl || book.image_url || "",
    isNew: Boolean(book.isNew ?? book.is_new ?? false),
    isOnSale: Boolean(book.isOnSale ?? book.is_on_sale ?? false),
    showInSlideshow: Boolean(book.showInSlideshow ?? book.show_in_slideshow ?? book.isNew ?? book.is_new ?? false),
    createdAt: book.createdAt || book.created_at || new Date().toISOString()
  };
}

function normalizePromotion(promo, index = 0) {
  return {
    id: promo.id || newId(),
    title: promo.title || "",
    details: promo.details || "",
    imageUrl: promo.imageUrl || promo.image_url || "",
    isActive: promo.isActive ?? promo.is_active ?? true,
    showInSlideshow: promo.showInSlideshow ?? promo.show_in_slideshow ?? true,
    showInBanner: promo.showInBanner ?? promo.show_in_banner ?? true,
    sortOrder: Number(promo.sortOrder ?? promo.sort_order ?? index + 1)
  };
}

function normalizeSlide(slide, index = 0) {
  return {
    id: slide.id || newId(),
    title: slide.title || "",
    text: slide.text || "",
    imageUrl: slide.imageUrl || slide.image_url || "",
    backgroundColor: slide.backgroundColor || slide.background_color || "#00a88f",
    durationSeconds: Number(slide.durationSeconds ?? slide.duration_seconds ?? 0),
    sortOrder: Number(slide.sortOrder ?? slide.sort_order ?? index + 1),
    isActive: slide.isActive ?? slide.is_active ?? true
  };
}

function normalizeTraderPrice(item = {}) {
  return {
    id: item.id || newId(),
    bookTitle: item.bookTitle || item.book_title || item.title || "",
    dealerName: item.dealerName || item.dealer_name || item.traderName || item.trader_name || "",
    regularPrice: Number(item.regularPrice ?? item.regular_price ?? 0),
    dealerPrice: Number(item.dealerPrice ?? item.dealer_price ?? item.price ?? 0),
    createdAt: item.createdAt || item.created_at || new Date().toISOString()
  };
}

function normalizeSlideshowSettings(slideshow = {}) {
  const defaults = cloneDefaultSettings().slideshow;
  return {
    enabled: slideshow.enabled ?? defaults.enabled,
    idleSeconds: Number(slideshow.idleSeconds ?? slideshow.idle_seconds ?? defaults.idleSeconds),
    slideSeconds: Number(slideshow.slideSeconds ?? slideshow.slide_seconds ?? defaults.slideSeconds),
    items: Array.isArray(slideshow.items) ? slideshow.items.map(normalizeSlide) : []
  };
}

function normalizeOrder(order) {
  return {
    id: order.id || newId(),
    customerName: order.customerName || order.customer_name || "",
    title: order.title || "",
    phone: order.phone || "",
    notes: order.notes || "",
    status: order.status || "new",
    isPaid: Boolean(order.isPaid ?? order.is_paid ?? false),
    created_at: order.created_at || order.createdAt || new Date().toISOString(),
    createdAt: order.createdAt || order.created_at || new Date().toISOString()
  };
}

function normalizeSale(sale) {
  const quantity = Number(sale.quantity || 1);
  const price = Number(sale.price || 0);
  return {
    id: sale.id || newId(),
    bookId: sale.bookId || sale.book_id || "",
    barcode: normalizeBarcode(sale.barcode),
    title: sale.title || "",
    price,
    quantity,
    totalPrice: Number(sale.totalPrice ?? sale.total_price ?? price * quantity),
    purchaseGroupId: sale.purchaseGroupId || sale.purchase_group_id || "",
    created_at: sale.created_at || sale.createdAt || new Date().toISOString(),
    createdAt: sale.createdAt || sale.created_at || new Date().toISOString()
  };
}

function normalizeCartItem(item = {}) {
  return {
    bookId: item.bookId || item.book_id || "",
    quantity: Math.max(1, Number(item.quantity || 1)),
    addedAt: item.addedAt || item.added_at || new Date().toISOString()
  };
}

function normalizeInvoice(invoice) {
  return {
    id: invoice.id || newId(),
    supplier: invoice.supplier || "",
    number: invoice.number || invoice.documentNumber || invoice.document_number || "",
    date: invoice.date || new Date().toISOString().slice(0, 10),
    month: invoice.month || (invoice.date || new Date().toISOString().slice(0, 10)).slice(0, 7),
    type: invoice.type || "invoice",
    amount: Number(invoice.amount || 0),
    status: invoice.status || "review",
    notes: invoice.notes || "",
    fileName: invoice.fileName || invoice.file_name || "",
    fileType: invoice.fileType || invoice.file_type || "",
    fileSize: Number(invoice.fileSize || invoice.file_size || 0),
    dataUrl: invoice.dataUrl || invoice.data_url || "",
    createdAt: invoice.createdAt || invoice.created_at || new Date().toISOString()
  };
}

function normalizeSettings(settings = {}) {
  const defaults = cloneDefaultSettings();
  const legacyPromotion = settings.promoTitle
    ? [{ id: newId(), title: settings.promoTitle, details: settings.promoDetails || "", isActive: true, sortOrder: 1 }]
    : [];
  const promotions = Array.isArray(settings.promotions) && settings.promotions.length
    ? settings.promotions.map(normalizePromotion)
    : legacyPromotion.length
      ? legacyPromotion.map(normalizePromotion)
      : defaults.promotions;

  const business = { ...defaults.business, ...(settings.business || {}) };
  if (business.name === "ספרים בדוכן") business.name = "נאמן ספרים";

  return {
    business,
    categories: normalizeCategories(settings.categories || defaults.categories),
    slideshow: normalizeSlideshowSettings(settings.slideshow || defaults.slideshow),
    traderPrices: Array.isArray(settings.traderPrices || settings.trader_prices)
      ? (settings.traderPrices || settings.trader_prices).map(normalizeTraderPrice)
      : defaults.traderPrices,
    promotions,
    payment: { ...defaults.payment, ...(settings.payment || {}) },
    about: { ...defaults.about, ...(settings.about || {}) },
    security: { ...defaults.security, ...(settings.security || {}) }
  };
}

function normalizeCategories(categories) {
  const list = Array.isArray(categories) ? categories : [];
  const cleaned = list
    .map((category) => String(category || "").trim())
    .filter(Boolean);
  return [...new Set(cleaned)].length ? [...new Set(cleaned)] : ["אחר"];
}

function saveLocal() {
  localStorage.setItem(storageKeys.invoices, JSON.stringify(state.invoices));
  localStorage.setItem(storageKeys.cart, JSON.stringify(state.cart));
  if (state.usingRemote) return;
  localStorage.setItem(storageKeys.books, JSON.stringify(state.books));
  localStorage.setItem(storageKeys.sales, JSON.stringify(state.sales));
  localStorage.setItem(storageKeys.orders, JSON.stringify(state.orders));
  localStorage.setItem(storageKeys.settings, JSON.stringify(state.settings));
}

function loadLocal() {
  const books = JSON.parse(localStorage.getItem(storageKeys.books) || "null");
  const sales = JSON.parse(localStorage.getItem(storageKeys.sales) || "null");
  const cart = JSON.parse(localStorage.getItem(storageKeys.cart) || "null");
  const orders = JSON.parse(localStorage.getItem(storageKeys.orders) || "null");
  const invoices = JSON.parse(localStorage.getItem(storageKeys.invoices) || "null");
  const oldRequests = JSON.parse(localStorage.getItem(storageKeys.oldRequests) || "null");
  const settings = JSON.parse(localStorage.getItem(storageKeys.settings) || "null");
  state.books = books?.length ? books.map(normalizeBook) : DEFAULT_BOOKS.map(normalizeBook);
  state.sales = Array.isArray(sales) ? sales.map(normalizeSale) : [];
  state.cart = Array.isArray(cart) ? cart.map(normalizeCartItem) : [];
  state.orders = Array.isArray(orders) ? orders.map(normalizeOrder) : Array.isArray(oldRequests) ? oldRequests.map(normalizeOrder) : [];
  state.invoices = Array.isArray(invoices) ? invoices.map(normalizeInvoice) : [];
  state.settings = normalizeSettings(settings || DEFAULT_SETTINGS);
  saveLocal();
}

function loadLocalInvoices() {
  const invoices = JSON.parse(localStorage.getItem(storageKeys.invoices) || "[]");
  state.invoices = Array.isArray(invoices) ? invoices.map(normalizeInvoice) : [];
}

/**
 * Creates a JSON-friendly snapshot of the current business data.
 */
function createDataSnapshot(reason = "manual") {
  return {
    id: newId(),
    reason,
    createdAt: new Date().toISOString(),
    books: state.books,
    sales: state.sales,
    cart: state.cart,
    orders: state.orders,
    invoices: state.invoices,
    settings: state.settings
  };
}

/**
 * backup_data for the browser app: saves a timestamped internal backup in
 * localStorage. A browser cannot silently write files to Desktop, so the admin
 * export includes these backups for downloading as JSON.
 */
function backupData(reason = "startup") {
  if (!state.books.length && !state.orders.length) return;

  const previousBackups = JSON.parse(localStorage.getItem(storageKeys.backups) || "[]");
  const backups = [createDataSnapshot(reason), ...previousBackups].slice(0, 20);
  localStorage.setItem(storageKeys.backups, JSON.stringify(backups));
}

function getLocalBackups() {
  return JSON.parse(localStorage.getItem(storageKeys.backups) || "[]");
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function pushUndoSnapshot(label) {
  state.undoStack.unshift({
    label,
    createdAt: new Date().toISOString(),
    books: cloneData(state.books),
    sales: cloneData(state.sales),
    cart: cloneData(state.cart),
    orders: cloneData(state.orders),
    invoices: cloneData(state.invoices),
    settings: cloneData(state.settings)
  });
  state.undoStack = state.undoStack.slice(0, 12);
  renderUndoState();
}

function renderUndoState() {
  if (!elements.undoButton) return;
  const latest = state.undoStack[0];
  elements.undoButton.disabled = !latest;
  elements.undoButton.textContent = latest ? `בטל פעולה אחרונה: ${latest.label}` : "בטל פעולה אחרונה";
}

function openUndoDialog() {
  const latest = state.undoStack[0];
  if (!latest) {
    showToast("אין פעולה אחרונה לביטול");
    return;
  }
  elements.undoConfirmText.textContent = `הפעולה "${latest.label}" תבוטל והנתונים יחזרו למצב שלפניה.`;
  elements.undoDialog.showModal();
}

async function restoreLastUndoSnapshot() {
  const snapshot = state.undoStack.shift();
  if (!snapshot) return;

  state.books = snapshot.books.map(normalizeBook);
  state.sales = snapshot.sales.map(normalizeSale);
  state.cart = (snapshot.cart || []).map(normalizeCartItem);
  state.orders = snapshot.orders.map(normalizeOrder);
  state.invoices = (snapshot.invoices || []).map(normalizeInvoice);
  state.settings = normalizeSettings(snapshot.settings);
  saveLocal();
  render();
  elements.undoDialog.close();
  showToast("הפעולה האחרונה בוטלה");
}

function getConfig() {
  return window.BOOK_STAND_CONFIG || {};
}

async function initSupabaseIfConfigured() {
  const config = getConfig();
  if (!config.supabaseUrl || !config.supabaseAnonKey || !window.supabase) return false;

  state.supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  state.usingRemote = true;
  await refreshRemoteData();
  subscribeToRemoteChanges();
  return true;
}

async function refreshRemoteData() {
  const { books, orders, requests, settings, sales } = getConfig().tables;
  const ordersTable = orders || requests;
  const [booksResult, ordersResult, settingsResult, salesResult] = await Promise.all([
    state.supabase.from(books).select("*").order("created_at", { ascending: false }),
    state.supabase.from(ordersTable).select("*").order("created_at", { ascending: false }),
    state.supabase.from(settings).select("*"),
    sales ? state.supabase.from(sales).select("*").order("created_at", { ascending: false }).limit(200) : Promise.resolve({ data: [], error: null })
  ]);

  if (booksResult.error) throw booksResult.error;
  if (ordersResult.error) throw ordersResult.error;
  if (settingsResult.error) throw settingsResult.error;
  if (salesResult.error) throw salesResult.error;

  state.books = (booksResult.data || []).map(normalizeBook);
  state.sales = (salesResult.data || []).map(normalizeSale);
  state.orders = (ordersResult.data || []).map(normalizeOrder);
  state.settings = remoteSettingsToApp(settingsResult.data);
}

function remoteSettingsToApp(rows) {
  const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return normalizeSettings({
    business: parseJsonSetting(map.business, null),
    categories: parseJsonSetting(map.categories, null),
    slideshow: parseJsonSetting(map.slideshow, null),
    traderPrices: parseJsonSetting(map.traderPrices, null),
    promotions: parseJsonSetting(map.promotions, null),
    payment: parseJsonSetting(map.payment, null),
    about: parseJsonSetting(map.about, null),
    security: parseJsonSetting(map.security, null),
    promoTitle: map.promoTitle,
    promoDetails: map.promoDetails
  });
}

function parseJsonSetting(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function subscribeToRemoteChanges() {
  const tables = getConfig().tables;
  const keys = ["books", tables.orders ? "orders" : "requests", "settings"];
  if (tables.sales) keys.push("sales");
  keys.forEach((key) => {
    state.supabase
      .channel(`live-${tables[key]}`)
      .on("postgres_changes", { event: "*", schema: "public", table: tables[key] }, async () => {
        await refreshRemoteData();
        render();
      })
      .subscribe();
  });
}

function bookToRemotePayload(book) {
  const normalized = normalizeBook(book);
  return {
    id: normalized.id,
    title: normalized.title,
    author: normalized.author,
    barcode: normalized.barcode || null,
    category: normalized.category,
    price: normalized.price,
    original_price: normalized.originalPrice || null,
    stock: normalized.stock,
    sold: normalized.sold,
    description: normalized.description,
    notes: normalized.notes,
    purchase_cost: normalized.purchaseCost || null,
    purchase_source: normalized.purchaseSource,
    image_url: normalized.imageUrl,
    is_new: normalized.isNew,
    is_on_sale: normalized.isOnSale,
    show_in_slideshow: normalized.showInSlideshow,
    created_at: normalized.createdAt
  };
}

function saleToRemotePayload(sale, includeCartFields = true) {
  const normalized = normalizeSale(sale);
  const payload = {
    book_id: normalized.bookId,
    barcode: normalized.barcode,
    title: normalized.title,
    price: normalized.price,
    created_at: normalized.created_at
  };
  if (includeCartFields) {
    payload.quantity = normalized.quantity;
    payload.total_price = normalized.totalPrice;
    payload.purchase_group_id = normalized.purchaseGroupId || null;
  }
  return payload;
}

async function insertSalesRows(saleRows) {
  const { sales } = getConfig().tables;
  if (!sales || !saleRows.length) return;
  const detailedRows = saleRows.map((sale) => saleToRemotePayload(sale));
  const detailedResult = await state.supabase.from(sales).insert(detailedRows);
  if (!detailedResult.error) return;

  const simpleRows = saleRows.map((sale) => saleToRemotePayload(sale, false));
  const simpleResult = await state.supabase.from(sales).insert(simpleRows);
  if (simpleResult.error) throw detailedResult.error;
}

async function persistBook(book) {
  const normalized = normalizeBook(book);
  if (!state.usingRemote) {
    const existingIndex = state.books.findIndex((item) => {
      return item.id === normalized.id || (normalized.barcode && item.barcode === normalized.barcode);
    });
    if (existingIndex >= 0) state.books[existingIndex] = { ...state.books[existingIndex], ...normalized };
    else state.books.push(normalized);
    saveLocal();
    render();
    return;
  }

  const { books } = getConfig().tables;
  const payload = bookToRemotePayload(normalized);
  const existingById = state.books.some((item) => item.id === normalized.id);
  const result = existingById || !normalized.barcode
    ? await state.supabase.from(books).upsert(payload, { onConflict: "id" })
    : await state.supabase.from(books).upsert(payload, { onConflict: "barcode" });
  if (result.error) throw result.error;
  await refreshRemoteData();
  render();
}

async function deleteBook(bookId) {
  if (!state.usingRemote) {
    state.books = state.books.filter((book) => book.id !== bookId);
    saveLocal();
    render();
    return;
  }

  const { books } = getConfig().tables;
  const { error } = await state.supabase.from(books).delete().eq("id", bookId);
  if (error) throw error;
  await refreshRemoteData();
  render();
}

async function persistOrder(order) {
  const normalized = normalizeOrder(order);
  if (!state.usingRemote) {
    const existingIndex = state.orders.findIndex((item) => item.id === normalized.id);
    if (existingIndex >= 0) state.orders[existingIndex] = normalized;
    else state.orders.unshift(normalized);
    saveLocal();
    render();
    return;
  }

  const { orders, requests } = getConfig().tables;
  const { error } = await state.supabase.from(orders || requests).upsert({
    id: normalized.id,
    customer_name: normalized.customerName,
    title: normalized.title,
    phone: normalized.phone,
    notes: normalized.notes,
    status: normalized.status,
    is_paid: normalized.isPaid,
    created_at: normalized.created_at
  });
  if (error) throw error;
  await refreshRemoteData();
  render();
}

async function deleteOrder(orderId) {
  if (!state.usingRemote) {
    state.orders = state.orders.filter((order) => order.id !== orderId);
    saveLocal();
    render();
    return;
  }

  const { orders, requests } = getConfig().tables;
  const { error } = await state.supabase.from(orders || requests).delete().eq("id", orderId);
  if (error) throw error;
  await refreshRemoteData();
  render();
}

async function persistSettings(settings) {
  state.settings = normalizeSettings(settings);
  if (!state.usingRemote) {
    saveLocal();
    render();
    return;
  }

  const rows = [
    { key: "business", value: JSON.stringify(state.settings.business) },
    { key: "categories", value: JSON.stringify(state.settings.categories) },
    { key: "slideshow", value: JSON.stringify(state.settings.slideshow) },
    { key: "traderPrices", value: JSON.stringify(state.settings.traderPrices) },
    { key: "promotions", value: JSON.stringify(state.settings.promotions) },
    { key: "payment", value: JSON.stringify(state.settings.payment) },
    { key: "about", value: JSON.stringify(state.settings.about) },
    { key: "security", value: JSON.stringify(state.settings.security) }
  ];
  const { settings: table } = getConfig().tables;
  const { error } = await state.supabase.from(table).upsert(rows, { onConflict: "key" });
  if (error) throw error;
  await refreshRemoteData();
  render();
}

async function markPurchased(book) {
  pushUndoSnapshot("סימון רכישה");
  const updated = { ...book, stock: Math.max(0, book.stock - 1), sold: (book.sold || 0) + 1 };
  await persistBook(updated);
  const sale = normalizeSale({
    id: newId(),
    bookId: book.id,
    barcode: book.barcode,
    title: book.title,
    price: book.price,
    quantity: 1,
    totalPrice: book.price,
    purchaseGroupId: newId(),
    created_at: new Date().toISOString(),
    createdAt: new Date().toISOString()
  });

  if (state.usingRemote) {
    await insertSalesRows([sale]);
  } else {
    state.sales.unshift(sale);
    saveLocal();
  }
  if (!state.sales.some((item) => item.id === sale.id)) state.sales.unshift(sale);

  state.lastResult = updated;
  renderResult(updated);
  renderSalesInsights();
  showToast("הרכישה סומנה והמלאי עודכן");
}

function findBookByBarcode(barcode) {
  const candidates = new Set(barcodeCandidates(barcode));
  if (!candidates.size) return undefined;
  return state.books.find((book) => {
    if (!book.barcode) return false;
    return barcodeCandidates(book.barcode).some((candidate) => candidates.has(candidate));
  });
}

function searchBooks(query, limit = 12, options = {}) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const includeBarcode = Boolean(options.includeBarcode);
  const barcodeQueryCandidates = includeBarcode ? barcodeCandidates(query) : [];
  return state.books
    .filter((book) => {
      return book.title.toLowerCase().includes(normalized)
        || book.author.toLowerCase().includes(normalized)
        || book.category.toLowerCase().includes(normalized)
        || (includeBarcode && (
          book.barcode.includes(normalized)
          || barcodeCandidates(book.barcode).some((candidate) => barcodeQueryCandidates.includes(candidate))
        ));
    })
    .slice(0, limit);
}

function getCustomerBrowseBooks(limit = 80) {
  return [...state.books]
    .sort((a, b) => a.title.localeCompare(b.title, "he"))
    .slice(0, limit);
}

function getCartLines() {
  return state.cart
    .map((item) => {
      const book = state.books.find((candidate) => candidate.id === item.bookId);
      if (!book) return null;
      const quantity = Math.max(1, Number(item.quantity || 1));
      return {
        ...item,
        quantity,
        book,
        lineTotal: quantity * Number(book.price || 0)
      };
    })
    .filter(Boolean);
}

function getCartTotals(lines = getCartLines()) {
  return {
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    uniqueCount: lines.length,
    total: lines.reduce((sum, line) => sum + line.lineTotal, 0)
  };
}

function saveCartAndRender() {
  saveLocal();
  renderCart();
  resetCartIdleTimer();
}

function addToCart(book, quantity = 1, { openCart = false } = {}) {
  if (!book) return;
  const current = state.cart.find((item) => item.bookId === book.id);
  const currentQuantity = current ? Number(current.quantity || 1) : 0;
  const nextQuantity = currentQuantity + Math.max(1, Number(quantity || 1));
  if (current) {
    current.quantity = nextQuantity;
  } else {
    state.cart.unshift(normalizeCartItem({ bookId: book.id, quantity: nextQuantity }));
  }
  saveCartAndRender();
  showToast(`${book.title} נוסף לסל`);
  if (openCart) showCustomerScreen("cart");
}

function setCartQuantity(bookId, quantity) {
  const book = state.books.find((item) => item.id === bookId);
  if (!book) return;
  const nextQuantity = Math.max(0, Number(quantity || 0));
  if (nextQuantity <= 0) {
    state.cart = state.cart.filter((item) => item.bookId !== bookId);
    saveCartAndRender();
    return;
  }
  state.cart = state.cart.map((item) => item.bookId === bookId ? { ...item, quantity: nextQuantity } : item);
  saveCartAndRender();
}

function clearCart({ silent = false } = {}) {
  state.cart = [];
  saveCartAndRender();
  if (!silent) showToast("הסל נוקה");
}

function isCustomerExperienceActive() {
  return !elements.adminView?.classList.contains("active");
}

function openClearCartDialog() {
  if (!state.cart.length) return;
  elements.clearCartDialog?.showModal();
}

function renderCartButton() {
  const totals = getCartTotals();
  const label = `סל קנייה (${totals.itemCount})`;
  [elements.openCartButton, elements.floatingCartButton].forEach((button) => {
    if (!button) return;
    button.innerHTML = withCartIcon(label);
  });
  elements.openCartButton?.classList.add("hidden");
  elements.floatingCartButton?.classList.toggle("hidden", totals.itemCount === 0);
}

function clearCartAfterInactivity() {
  if (!state.cart.length) return;
  [elements.paymentDialog, elements.purchaseConfirmDialog, elements.clearCartDialog].forEach((dialog) => {
    if (dialog?.open) dialog.close();
  });
  clearCart({ silent: true });
  if (!elements.adminView?.classList.contains("active")) switchView("kiosk");
  showCustomerHome();
  showToast("הסל התאפס אחרי 5 דקות ללא שימוש");
}

function resetCartIdleTimer() {
  window.clearTimeout(state.cartIdleTimer);
  state.cartIdleTimer = null;
  if (!state.cart.length) return;
  if (!isCustomerExperienceActive()) return;
  state.cartIdleTimer = window.setTimeout(clearCartAfterInactivity, CART_IDLE_CLEAR_MS);
}

function renderCartCheckoutSummary(lines = getCartLines()) {
  const totals = getCartTotals(lines);
  return `
    <div class="checkout-summary-title">
      <strong>${totals.itemCount} ספרים לתשלום</strong>
      <span>${money(totals.total)}</span>
    </div>
    ${lines.map((line) => `
      <div class="checkout-line">
        <span>${escapeHtml(line.book.title)}</span>
        <span>${line.quantity} × ${money(line.book.price)}</span>
        <strong>${money(line.lineTotal)}</strong>
      </div>
    `).join("")}
  `;
}

function renderCart() {
  renderCartButton();
  resetCartIdleTimer();
  if (!elements.cartPanel) return;
  const lines = getCartLines();
  const totals = getCartTotals(lines);

  if (!lines.length) {
    elements.cartPanel.innerHTML = `
      <div class="empty-state cart-empty">
        הסל ריק כרגע.
        <button class="purchase-button" type="button" data-cart-continue>בחירת ספרים</button>
      </div>
    `;
    return;
  }

  elements.cartPanel.innerHTML = `
    <div class="cart-summary">
      <div>
        <span>בסל</span>
        <strong>${totals.itemCount} ספרים</strong>
      </div>
      <div>
        <span>סה"כ לתשלום</span>
        <strong>${money(totals.total)}</strong>
      </div>
    </div>
    <div class="cart-lines">
      ${lines.map((line) => `
        <article class="cart-item">
          ${renderThumb(line.book.imageUrl)}
          <div class="cart-item-copy">
            <strong>${escapeHtml(line.book.title)}</strong>
            <span>${escapeHtml(line.book.author || "מחבר לא צוין")}</span>
            <small>${money(line.book.price)} ליחידה · ${customerStockText(line.book, true)}</small>
          </div>
          <div class="cart-qty-controls" aria-label="כמות">
            <button type="button" data-cart-delta="-1" data-cart-book="${line.book.id}">−</button>
            <span>${line.quantity}</span>
            <button type="button" data-cart-delta="1" data-cart-book="${line.book.id}">+</button>
          </div>
          <strong class="cart-line-total">${money(line.lineTotal)}</strong>
          <button class="secondary-button cart-remove-button" type="button" data-cart-remove="${line.book.id}">הסר</button>
        </article>
      `).join("")}
    </div>
    <div class="cart-actions">
      <button class="secondary-button" type="button" data-cart-continue>להמשיך לבחור</button>
      <button class="secondary-button cart-clear-action" type="button" data-cart-clear>ניקוי סל</button>
      <button class="purchase-button" type="button" data-cart-checkout>${withCartIcon("לתשלום וסימון רכישה")}</button>
    </div>
  `;
}

function getVisibleBooks() {
  const query = elements.searchBooks.value.trim().toLowerCase();
  const filtered = state.books.filter((book) => {
    return !query
      || book.title.toLowerCase().includes(query)
      || book.author.toLowerCase().includes(query)
      || book.category.toLowerCase().includes(query)
      || String(book.barcode).includes(query);
  });

  return filtered.sort((a, b) => {
    switch (elements.bookSort.value) {
      case "title-asc":
        return a.title.localeCompare(b.title, "he");
      case "author-asc":
        return a.author.localeCompare(b.author, "he");
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "category-asc":
        return a.category.localeCompare(b.category, "he") || a.title.localeCompare(b.title, "he");
      case "new-first":
        return Number(b.isNew) - Number(a.isNew) || new Date(b.createdAt) - new Date(a.createdAt);
      case "old-first":
        return Number(a.isNew) - Number(b.isNew) || new Date(a.createdAt) - new Date(b.createdAt);
      case "created-desc":
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });
}

function getCategoryOptions(extraCategory = "") {
  return normalizeCategories([
    ...(state.settings.categories || []),
    extraCategory
  ]);
}

function renderBookCategoryOptions(selectedCategory = "") {
  const categories = getCategoryOptions(selectedCategory);
  elements.bookCategory.innerHTML = categories
    .map((category) => `<option value="${escapeAttr(category)}">${escapeHtml(category)}</option>`)
    .join("");
  elements.bookCategory.value = selectedCategory || categories[0] || "אחר";
}

function renderCategoryControls() {
  const categories = normalizeCategories(state.settings.categories);
  elements.categoryList.innerHTML = categories
    .map((category) => `
      <span class="category-chip">
        ${escapeHtml(category)}
        <button type="button" aria-label="מחיקת קטגוריה ${escapeAttr(category)}" data-remove-category="${escapeAttr(category)}">×</button>
      </span>
    `)
    .join("");
}

function clearAdminBookSearch() {
  if (!elements.searchBooks) return;
  elements.searchBooks.value = "";
  elements.adminBookSuggestions?.classList.add("hidden");
  if (elements.adminBookSuggestions) elements.adminBookSuggestions.innerHTML = "";
}

function setBookImportStatus(message, status = "idle") {
  if (!elements.bookImportStatus) return;
  elements.bookImportStatus.textContent = message;
  elements.bookImportStatus.dataset.status = status;
}

function chooseImportDelimiter(lines) {
  const sample = lines.find((line) => /[\t,;]/.test(line)) || lines[0] || "";
  const options = ["\t", ";", ","];
  return options.reduce((best, delimiter) => {
    return sample.split(delimiter).length > sample.split(best).length ? delimiter : best;
  }, "\t");
}

function parseImportLine(line, delimiter) {
  const cells = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];
    if (character === "\"") {
      if (quoted && nextCharacter === "\"") {
        cell += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }

  cells.push(cell.trim());
  return cells;
}

function normalizeImportHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function findImportColumn(headerCells, candidates) {
  const normalizedHeaders = headerCells.map(normalizeImportHeader);
  return normalizedHeaders.findIndex((header) => {
    return candidates.some((candidate) => header.includes(candidate));
  });
}

function parseImportPrice(value) {
  let cleaned = String(value || "")
    .replace(/[^\d.,-]/g, "")
    .trim();
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    cleaned = lastComma > lastDot
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "");
  } else if (lastComma >= 0) {
    const decimalDigits = cleaned.length - lastComma - 1;
    cleaned = decimalDigits > 0 && decimalDigits <= 2
      ? cleaned.replace(",", ".")
      : cleaned.replace(/,/g, "");
  }

  const price = Number(cleaned);
  return Number.isFinite(price) ? price : null;
}

function normalizeImportBookKey(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function parseBookImportText(text) {
  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return { books: [], skipped: 0 };

  const delimiter = chooseImportDelimiter(lines);
  const rows = lines.map((line) => parseImportLine(line, delimiter));
  const titleCandidates = ["שם ספר", "שם הספר", "שם", "ספר", "כותר", "פריט", "מוצר", "title", "name", "book"];
  const priceCandidates = ["מחיר מכירה", "מחיר", "מכירה", "price", "sale"];
  const headerCells = rows[0] || [];
  const titleColumn = findImportColumn(headerCells, titleCandidates);
  const priceColumn = findImportColumn(headerCells, priceCandidates);
  const hasHeader = titleColumn >= 0 && priceColumn >= 0;
  const titleIndex = hasHeader ? titleColumn : 0;
  const priceIndex = hasHeader ? priceColumn : 1;
  const headerWidth = hasHeader ? headerCells.length : 2;
  const importedBooks = [];
  let skipped = 0;

  rows.slice(hasHeader ? 1 : 0).forEach((cells) => {
    const title = String(cells[titleIndex] || "").trim();
    const rawPrice = delimiter === "," && priceIndex === 1 && headerWidth <= 2 && cells.length > 2
      ? cells.slice(priceIndex).join(",")
      : cells[priceIndex];
    const price = parseImportPrice(rawPrice);
    if (!title || price === null) {
      skipped += 1;
      return;
    }
    importedBooks.push({ title, price });
  });

  return { books: importedBooks, skipped };
}

async function persistImportedBooks(importedRows, defaultStock) {
  const uniqueRows = new Map();
  importedRows.forEach((row) => uniqueRows.set(normalizeImportBookKey(row.title), row));

  const changes = [];
  uniqueRows.forEach((row, key) => {
    const existingIndex = state.books.findIndex((book) => normalizeImportBookKey(book.title) === key);
    if (existingIndex >= 0) {
      changes.push({
        type: "update",
        index: existingIndex,
        book: normalizeBook({ ...state.books[existingIndex], price: row.price })
      });
      return;
    }

    changes.push({
      type: "add",
      index: -1,
      book: normalizeBook({
        id: newId(),
        title: row.title,
        author: "",
        barcode: "",
        category: "אחר",
        price: row.price,
        stock: defaultStock,
        createdAt: new Date().toISOString()
      })
    });
  });

  if (!changes.length) return { added: 0, updated: 0, duplicates: importedRows.length - uniqueRows.size };

  pushUndoSnapshot("ייבוא ספרים מקובץ");
  if (state.usingRemote) {
    const { books } = getConfig().tables;
    const { error } = await state.supabase.from(books).upsert(
      changes.map((change) => bookToRemotePayload(change.book)),
      { onConflict: "id" }
    );
    if (error) throw error;
    await refreshRemoteData();
  } else {
    changes.forEach((change) => {
      if (change.type === "update") state.books[change.index] = change.book;
      else state.books.push(change.book);
    });
    saveLocal();
  }

  render();
  return {
    added: changes.filter((change) => change.type === "add").length,
    updated: changes.filter((change) => change.type === "update").length,
    duplicates: importedRows.length - uniqueRows.size
  };
}

function renderBookStatus(book) {
  const badges = [];
  if (book.isNew) badges.push(`<span class="status-pill new">חדש</span>`);
  if (book.isOnSale) badges.push(`<span class="status-pill sale">במבצע</span>`);
  return badges.length ? `<div class="status-stack">${badges.join("")}</div>` : `<span class="status-pill">רגיל</span>`;
}

function orderStatusClass(status) {
  return `order-status-${status || "new"}`;
}

function renderSlideshowAdmin() {
  const settings = state.settings.slideshow;
  elements.slideshowEnabled.checked = settings.enabled;
  elements.slideshowIdleSeconds.value = settings.idleSeconds;
  elements.slideshowSlideSeconds.value = settings.slideSeconds;

  const autoSlides = buildIdleSlides().filter((slide) => slide.kind !== "custom");
  elements.slideshowPreviewList.innerHTML = autoSlides.length
    ? autoSlides.map((slide) => `
        <article class="slide-source-card">
          <div class="slide-source-card-top">
            <span>${slide.kind === "promo" ? "מבצע" : "ספר"}</span>
            <button class="danger-button slide-remove-button" type="button" data-disable-slideshow-kind="${slide.kind}" data-disable-slideshow-id="${escapeAttr(slide.sourceId)}">הסר מהתצוגה</button>
          </div>
          <strong>${escapeHtml(slide.title)}</strong>
          <small>${escapeHtml(slide.text)}</small>
        </article>
      `).join("")
    : `<p class="small-empty">עדיין אין מבצעים או ספרים שסומנו לתצוגה הרצה.</p>`;

  elements.adminSlidesList.innerHTML = settings.items.length
    ? [...settings.items]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((slide) => `
          <div class="admin-list-item">
            <div>
              <strong>${escapeHtml(slide.title)}</strong>
              <span>${escapeHtml(slide.text || "ללא טקסט נוסף")}</span>
              <small>${slide.isActive ? "פעילה" : "לא פעילה"} · ${slide.durationSeconds || settings.slideSeconds} שניות · סדר ${slide.sortOrder}</small>
            </div>
            <div class="row-actions">
              <button class="secondary-button" type="button" data-edit-slide="${slide.id}">עריכה</button>
              <button class="danger-button" type="button" data-remove-slide="${slide.id}">מחיקה</button>
            </div>
          </div>
        `).join("")
    : `<p class="small-empty">אין שקופיות ידניות. אפשר להציג מבצעים וספרים שסומנו, או ליצור שקופית חדשה.</p>`;
}

function switchView(view) {
  if (view === "admin" && !state.adminUnlocked) {
    openAdminAccessDialog();
    return;
  }
  elements.tabs.forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  elements.kioskView.classList.toggle("active", view === "kiosk");
  elements.aboutView.classList.toggle("active", view === "about");
  elements.adminView.classList.toggle("active", view === "admin");
  if (view === "admin") switchAdminPanel("books", { resetBookSearch: true });
  if (view !== "kiosk") stopIdleSlideshow();
  resetIdleTimer();
  resetCartIdleTimer();
  scheduleAdminAutoLock();
  hideSuggestions();
}

function getAdminPin() {
  const savedPin = String(state.settings.security?.adminPin || "").trim();
  return savedPin || String(getConfig().adminPin || "1234");
}

function openAdminAccessDialog() {
  elements.adminPinInput.value = "";
  elements.adminAccessDialog.showModal();
  elements.adminPinInput.focus();
}

function unlockAdmin(pin) {
  if (String(pin || "") !== getAdminPin()) {
    showToast("קוד מנהל שגוי");
    return;
  }
  state.adminUnlocked = true;
  sessionStorage.setItem("bookStand.adminUnlocked", "true");
  elements.adminAccessDialog.close();
  scheduleAdminAutoLock();
  switchView("admin");
}

function scheduleAdminAutoLock() {
  window.clearTimeout(state.adminAutoLockTimer);
  state.adminAutoLockTimer = null;
  if (!state.adminUnlocked) return;
  state.adminAutoLockTimer = window.setTimeout(() => lockAdmin({ auto: true }), ADMIN_AUTO_LOCK_MS);
}

function resetAdminAutoLockFromAdminActivity() {
  if (!state.adminUnlocked) return;
  if (!elements.adminView?.classList.contains("active")) return;
  scheduleAdminAutoLock();
}

function closeAdminDialogs() {
  [
    elements.bookDialog,
    elements.deleteBookDialog,
    elements.promoDialog,
    elements.slideDialog,
    elements.undoDialog,
    elements.adminAccessDialog
  ].forEach((dialog) => {
    if (dialog?.open) dialog.close();
  });
}

function lockAdmin(options = {}) {
  const auto = Boolean(options?.auto);
  const adminWasOpen = elements.adminView?.classList.contains("active");
  state.adminUnlocked = false;
  globalThis.sessionStorage?.removeItem("bookStand.adminUnlocked");
  window.clearTimeout(state.adminAutoLockTimer);
  state.adminAutoLockTimer = null;
  closeAdminDialogs();
  if (!auto || adminWasOpen) switchView("kiosk");
  if (!auto || adminWasOpen) showToast(auto ? "הניהול ננעל אוטומטית" : "הניהול ננעל");
}

function openHiddenAdminAccess() {
  state.hiddenAdminTapCount = 0;
  window.clearTimeout(state.hiddenAdminTapTimer);
  if (state.adminUnlocked) {
    switchView("admin");
    return;
  }
  openAdminAccessDialog();
}

function handleHiddenAdminTap() {
  if (state.hiddenAdminLongPressOpened) {
    state.hiddenAdminLongPressOpened = false;
    return;
  }
  state.hiddenAdminTapCount += 1;
  window.clearTimeout(state.hiddenAdminTapTimer);
  if (state.hiddenAdminTapCount >= 5) {
    openHiddenAdminAccess();
    return;
  }
  state.hiddenAdminTapTimer = window.setTimeout(() => {
    state.hiddenAdminTapCount = 0;
  }, 12000);
}

function startHiddenAdminLongPress() {
  state.hiddenAdminLongPressOpened = false;
  window.clearTimeout(state.hiddenAdminLongPressTimer);
  state.hiddenAdminLongPressTimer = window.setTimeout(() => {
    state.hiddenAdminLongPressOpened = true;
    openHiddenAdminAccess();
  }, 4000);
}

function cancelHiddenAdminLongPress() {
  window.clearTimeout(state.hiddenAdminLongPressTimer);
  state.hiddenAdminLongPressTimer = null;
}

function switchAdminPanel(panel, options = {}) {
  const panelExists = [...elements.adminPanels].some((section) => section.dataset.adminPanel === panel);
  const activePanel = panelExists ? panel : "books";
  state.adminPanel = activePanel;
  elements.adminPanelTabs.forEach((button) => button.classList.toggle("active", button.dataset.adminPanelTab === activePanel));
  elements.adminPanels.forEach((section) => section.classList.toggle("hidden", section.dataset.adminPanel !== activePanel));
  if (activePanel === "books" && options.resetBookSearch) clearAdminBookSearch();
  renderActiveAdminPanel(activePanel);
  keepActiveAdminPanelInView(activePanel);
}

function renderActiveAdminPanel(panel) {
  if (panel === "books") renderBooksTable();
  if (panel === "orders") renderOrders();
  if (panel === "promotions") renderAdminForms();
  if (panel === "sales") renderSalesInsights();
  if (panel === "invoices") renderInvoices();
  if (panel === "slideshow") renderSlideshowAdmin();
  if (panel === "traders") renderTraderPrices();
  if (panel === "settings") renderAdminForms();
}

function keepActiveAdminPanelInView(panel) {
  if (!elements.adminView?.classList.contains("active")) return;
  const activeSection = [...elements.adminPanels].find((section) => section.dataset.adminPanel === panel);
  window.requestAnimationFrame(() => {
    activeSection?.scrollIntoView({ block: "start" });
  });
}

function showCustomerScreen(screen) {
  if (state.customerScreen !== screen) {
    state.previousCustomerScreen = state.customerScreen;
    state.customerScreen = screen;
  }
  elements.customerHome.classList.add("hidden");
  elements.customerScreens.forEach((item) => item.classList.add("hidden"));
  $(`#${screen}-screen`)?.classList.remove("hidden");
  hideSuggestions();
  if (screen === "scan") startScanner();
  else stopScanner();
  if (screen === "search") {
    const results = elements.bookSearch.value.trim()
      ? searchBooks(elements.bookSearch.value)
      : getCustomerBrowseBooks();
    renderSearchResults(results);
  }
  if (screen === "cart") renderCart();
  if (screen === "promotions") renderPromos();
  if (screen === "new-books") renderNewBooks();
  resetCartIdleTimer();
}

function showCustomerHome() {
  state.previousCustomerScreen = state.customerScreen;
  state.customerScreen = "home";
  elements.customerHome.classList.remove("hidden");
  elements.customerScreens.forEach((item) => item.classList.add("hidden"));
  stopScanner();
  hideSuggestions();
  resetIdleTimer();
  resetCartIdleTimer();
}

function goBackCustomerScreen() {
  if (state.customerScreen === "price" && state.previousCustomerScreen && state.previousCustomerScreen !== "home") {
    showCustomerScreen(state.previousCustomerScreen);
    return;
  }
  showCustomerHome();
}

function buildIdleSlides() {
  const defaultDuration = Math.max(3, Number(state.settings.slideshow.slideSeconds || 6));
  const customSlides = [...(state.settings.slideshow.items || [])]
    .filter((slide) => slide.isActive)
    .map((slide) => ({
      id: `custom-${slide.id}`,
      kind: "custom",
      title: slide.title,
      text: slide.text,
      imageUrl: slide.imageUrl,
      backgroundColor: slide.backgroundColor,
      durationSeconds: slide.durationSeconds || defaultDuration,
      sortOrder: slide.sortOrder
    }));

  const promoSlides = activePromotions()
    .filter((promo) => promo.showInSlideshow)
    .map((promo) => ({
      id: `promo-${promo.id}`,
      sourceId: promo.id,
      kind: "promo",
      title: promo.title,
      text: promo.details || "מבצע פעיל בדוכן",
      imageUrl: promo.imageUrl,
      backgroundColor: "#ffad00",
      durationSeconds: defaultDuration,
      sortOrder: 100 + promo.sortOrder
    }));

  const bookSlides = state.books
    .filter((book) => book.showInSlideshow && (book.isNew || book.isOnSale))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((book, index) => ({
      id: `book-${book.id}`,
      sourceId: book.id,
      kind: "book",
      title: book.isOnSale ? `במבצע: ${book.title}` : `חדש בדוכן: ${book.title}`,
      text: `${book.author ? `${book.author} · ` : ""}${money(book.price)}${book.originalPrice ? ` במקום ${money(book.originalPrice)}` : ""}`,
      imageUrl: book.imageUrl,
      backgroundColor: book.isOnSale ? "#ff0f57" : "#8b1cff",
      durationSeconds: defaultDuration,
      sortOrder: 200 + index
    }));

  return [...customSlides, ...promoSlides, ...bookSlides].sort((a, b) => a.sortOrder - b.sortOrder);
}

async function disableAutoSlideshowItem(kind, sourceId) {
  if (kind === "promo") {
    const promo = state.settings.promotions.find((item) => item.id === sourceId);
    if (!promo) return;
    const promotions = state.settings.promotions.map((item) => item.id === sourceId
      ? normalizePromotion({ ...item, showInSlideshow: false })
      : item
    );
    pushUndoSnapshot("הסרת מבצע מהתצוגה הרצה");
    await persistSettings({ ...state.settings, promotions });
    showToast("המבצע הוסר מהתצוגה הרצה");
    return;
  }

  if (kind === "book") {
    const book = state.books.find((item) => item.id === sourceId);
    if (!book) return;
    pushUndoSnapshot("הסרת ספר מהתצוגה הרצה");
    await persistBook({ ...book, showInSlideshow: false });
    showToast("הספר הוסר מהתצוגה הרצה");
  }
}

function renderIdleSlide() {
  const slide = state.currentSlides[state.currentSlideIndex];
  if (!slide) return;
  elements.idleSlideshow.style.setProperty("--slide-bg", slide.backgroundColor || "#00a88f");
  elements.idleSlide.innerHTML = `
    <div class="idle-slide-copy">
      <span>${slide.kind === "promo" ? "מבצע" : slide.kind === "book" ? "ספרים בדוכן" : "נאמן ספרים"}</span>
      <h2>${escapeHtml(slide.title)}</h2>
      <p>${escapeHtml(slide.text || "")}</p>
    </div>
    ${slide.imageUrl ? `<img src="${escapeAttr(slide.imageUrl)}" alt="" />` : ""}
  `;
  elements.idleSlideDots.innerHTML = state.currentSlides
    .map((_, index) => `<span class="${index === state.currentSlideIndex ? "active" : ""}"></span>`)
    .join("");
}

function advanceIdleSlide() {
  if (!state.currentSlides.length) return;
  state.currentSlideIndex = (state.currentSlideIndex + 1) % state.currentSlides.length;
  renderIdleSlide();
  scheduleNextSlide();
}

function scheduleNextSlide() {
  window.clearTimeout(state.slideTimer);
  const current = state.currentSlides[state.currentSlideIndex];
  const seconds = Math.max(3, Number(current?.durationSeconds || state.settings.slideshow.slideSeconds || 6));
  state.slideTimer = window.setTimeout(advanceIdleSlide, seconds * 1000);
}

function startIdleSlideshow() {
  if (!state.settings.slideshow.enabled) return;
  if (!elements.kioskView.classList.contains("active")) return;
  if (document.querySelector("dialog[open]")) return;
  const slides = buildIdleSlides();
  if (!slides.length) return;
  state.currentSlides = slides;
  state.currentSlideIndex = 0;
  elements.idleSlideshow.classList.remove("hidden");
  renderIdleSlide();
  scheduleNextSlide();
}

function stopIdleSlideshow() {
  elements.idleSlideshow.classList.add("hidden");
  window.clearTimeout(state.slideTimer);
  state.slideTimer = null;
}

function resetIdleTimer() {
  window.clearTimeout(state.idleTimer);
  const slideshowWasVisible = elements.idleSlideshow && !elements.idleSlideshow.classList.contains("hidden");
  if (slideshowWasVisible) {
    stopIdleSlideshow();
    if (elements.kioskView?.classList.contains("active") && state.customerScreen !== "home") {
      showCustomerHome();
      return;
    }
  }
  if (!state.settings.slideshow?.enabled) return;
  if (!elements.kioskView?.classList.contains("active")) return;
  const seconds = Math.max(10, Number(state.settings.slideshow.idleSeconds || 45));
  state.idleTimer = window.setTimeout(startIdleSlideshow, seconds * 1000);
}

function render() {
  renderBusiness();
  renderPromos();
  renderPromotionTicker();
  renderPayment();
  renderAbout();
  renderAdminForms();
  renderSlideshowAdmin();
  renderTraderPrices();
  renderSalesInsights();
  renderBooksTable();
  renderOrders();
  renderInvoices();
  renderNewBooks();
  renderCart();
  renderUndoState();
  elements.syncStatus.textContent = state.usingRemote
    ? "מחובר למסד נתונים חי. עדכונים מסתנכרנים בין הבית לדוכן."
    : "מצב מקומי: הנתונים נשמרים בדפדפן הזה בלבד. כדי להעביר לכרום השתמש בייצוא נתונים ואז ייבוא נתונים, או חבר Supabase לסנכרון קבוע.";
}

function renderBusiness() {
  const businessName = state.settings.business.name === "ספרים בדוכן"
    ? "נאמן ספרים"
    : state.settings.business.name || "נאמן ספרים";
  elements.customerBusinessName.textContent = businessName;
  $("#app-title").textContent = businessName;
}

function activePromotions() {
  return [...state.settings.promotions]
    .filter((promo) => promo.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function bannerPromotions() {
  return activePromotions().filter((promo) => promo.showInBanner);
}

function renderPromotionTicker() {
  if (!elements.promoTicker || !elements.promoTickerTrack) return;
  const promotions = bannerPromotions();
  elements.promoTicker.classList.toggle("hidden", !promotions.length);
  if (!promotions.length) {
    elements.promoTickerTrack.innerHTML = "";
    return;
  }
  const items = promotions.map((promo) => {
    const details = promo.details ? ` · ${promo.details}` : "";
    return `${promo.title}${details}`;
  });
  elements.promoTickerTrack.innerHTML = [...items, ...items]
    .map((item) => `<span class="ticker-item">${escapeHtml(item)}</span>`)
    .join("");
}

function renderPromos() {
  const promotions = activePromotions();
  elements.promotionsList.innerHTML = promotions.length
    ? promotions
        .map((promo) => `
          <article class="promo-chip">
            ${promo.imageUrl ? `<img src="${escapeAttr(promo.imageUrl)}" alt="" />` : ""}
            <strong>${escapeHtml(promo.title)}</strong>
            <span>${escapeHtml(promo.details)}</span>
          </article>
        `)
        .join("")
    : `<p class="empty-state">אין מבצעים פעילים כרגע.</p>`;
}

function renderNewBooks() {
  const books = state.books
    .filter((book) => book.isNew)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  elements.newBooksList.innerHTML = books.length
    ? books.map(renderBookCard).join("")
    : `<p class="empty-state">אין עדיין ספרים חדשים.</p>`;
}

function renderPayment() {
  const { payment } = state.settings;
  const qrHtml = payment.bitQrUrl
    ? `<img src="${escapeAttr(payment.bitQrUrl)}" alt="קוד QR לתשלום ב-Bit" />`
    : `<span>כאן יופיע קוד QR</span>`;
  elements.bitQrBox.innerHTML = qrHtml;
  elements.bitDetails.textContent = payment.bitDetails;
  elements.bankDetails.textContent = payment.bankDetails;
  elements.paymentNotes.textContent = payment.notes;
  elements.purchaseBitQrBox.innerHTML = qrHtml;
  elements.purchaseBitDetails.textContent = payment.bitDetails;
  elements.purchaseBankDetails.textContent = payment.bankDetails;
  elements.purchasePaymentNotes.textContent = payment.notes;
}

function renderAbout() {
  elements.aboutTitle.textContent = state.settings.about.title;
  elements.aboutText.innerHTML = escapeHtml(state.settings.about.text).replaceAll("\n", "<br />");
}

function renderAdminForms() {
  elements.adminBitQrUrl.value = state.settings.payment.bitQrUrl;
  elements.adminBitDetails.value = state.settings.payment.bitDetails;
  elements.adminBankDetails.value = state.settings.payment.bankDetails;
  elements.adminPaymentNotes.value = state.settings.payment.notes;
  elements.adminBusinessName.value = state.settings.business.name;
  elements.adminBusinessTagline.value = state.settings.business.tagline;
  elements.adminAboutTitle.value = state.settings.about.title;
  elements.adminAboutText.value = state.settings.about.text;
  renderCategoryControls();
  elements.adminPromotionsList.innerHTML = state.settings.promotions
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((promo) => `
      <div class="admin-list-item">
        <div>
          <strong>${escapeHtml(promo.title)}</strong>
          <span>${escapeHtml(promo.details || "ללא תיאור")}</span>
          <div class="promo-admin-badges">
            <span class="status-pill ${promo.isActive ? "active" : ""}">${promo.isActive ? "פעיל" : "לא פעיל"}</span>
            <span class="status-pill ${promo.showInSlideshow ? "slide" : ""}">${promo.showInSlideshow ? "בתצוגה הרצה" : "לא בתצוגה הרצה"}</span>
            <span class="status-pill ${promo.showInBanner ? "banner" : ""}">${promo.showInBanner ? "בשורת המבצעים" : "לא בשורת המבצעים"}</span>
            <span class="status-pill">סדר ${promo.sortOrder}</span>
          </div>
        </div>
        <div class="row-actions">
          <button class="secondary-button" type="button" data-edit-promo="${promo.id}">עריכה</button>
          <button class="danger-button" type="button" data-remove-promo="${promo.id}">מחיקה</button>
        </div>
      </div>
    `)
    .join("");
}

function renderBooksTable() {
  const books = getVisibleBooks();
  const query = elements.searchBooks.value.trim();
  elements.booksCount.classList.toggle("filter-active", Boolean(query));
  elements.booksCount.textContent = query
    ? `חיפוש פעיל: מוצגים ${books.length} מתוך ${state.books.length} ספרים. לחצו "הצג הכל" כדי לראות את כל הרשימה.`
    : `במערכת יש ${state.books.length} ספרים. מוצגים כרגע ${books.length}.`;
  elements.booksTable.innerHTML = books.length
    ? books
        .map((book) => `
          <tr data-id="${book.id}">
            <td>
              <strong>${escapeHtml(book.title)}</strong>
              <small>${escapeHtml(book.author || "מחבר לא צוין")} · ${escapeHtml(book.barcode || "אין ברקוד")} · ${escapeHtml(book.category)}</small>
            </td>
            <td>${money(book.price)}</td>
            <td>${book.originalPrice ? money(book.originalPrice) : "-"}</td>
            <td>${book.purchaseCost ? money(book.purchaseCost) : "-"}</td>
            <td>
              <div class="stock-stepper">
                <button type="button" data-stock="${book.id}" data-delta="-1">-</button>
                <span>${book.stock}</span>
                <button type="button" data-stock="${book.id}" data-delta="1">+</button>
              </div>
            </td>
            <td>${book.sold || 0}</td>
            <td>${renderBookStatus(book)}</td>
            <td><button class="table-action" type="button" data-edit-book="${book.id}">עריכה</button></td>
          </tr>
        `)
        .join("")
    : `<tr><td colspan="8"><p class="small-empty">לא נמצאו ספרים מתאימים.</p></td></tr>`;
}

function renderSalesInsights() {
  const soldUnitsFromBooks = state.books.reduce((sum, book) => sum + Number(book.sold || 0), 0);
  const loggedSales = [...state.sales].sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
  const loggedUnits = loggedSales.reduce((sum, sale) => sum + Number(sale.quantity || 1), 0);
  const salesCount = Math.max(loggedUnits, soldUnitsFromBooks);
  const revenueFromLog = loggedSales.reduce((sum, sale) => {
    const quantity = Number(sale.quantity || 1);
    return sum + Number(sale.totalPrice ?? sale.total_price ?? Number(sale.price || 0) * quantity);
  }, 0);
  const revenueFromBooks = state.books.reduce((sum, book) => sum + Number(book.sold || 0) * Number(book.price || 0), 0);
  const estimatedRevenue = revenueFromLog || revenueFromBooks;
  const lowStockCount = state.books.filter((book) => book.stock > 0 && book.stock <= 2).length;
  const topBooks = [...state.books].filter((book) => book.sold > 0).sort((a, b) => b.sold - a.sold).slice(0, 5);
  const topTitle = topBooks[0]?.title || "אין עדיין נתונים";

  elements.salesSummary.innerHTML = `
    <article>
      <span>נמכרו</span>
      <strong>${salesCount}</strong>
      <small>יחידות מסומנות</small>
    </article>
    <article>
      <span>הכנסה משוערת</span>
      <strong>${money(estimatedRevenue)}</strong>
      <small>לפי סימוני רכישה</small>
    </article>
    <article>
      <span>הכי נמכר</span>
      <strong>${escapeHtml(topTitle)}</strong>
      <small>${topBooks[0] ? `${topBooks[0].sold} יחידות` : "יתמלא אחרי רכישות"}</small>
    </article>
    <article>
      <span>מלאי נמוך</span>
      <strong>${lowStockCount}</strong>
      <small>ספרים עם 1-2 עותקים</small>
    </article>
  `;

  elements.recentSalesList.innerHTML = loggedSales.length
    ? loggedSales.slice(0, 8).map((sale) => `
        <div class="sales-row">
          <strong>${escapeHtml(sale.title)}</strong>
          <span>${Number(sale.quantity || 1) > 1 ? `${sale.quantity} יחידות · ` : ""}${money(sale.totalPrice ?? sale.total_price ?? Number(sale.price || 0) * Number(sale.quantity || 1))} · ${formatDate(sale.created_at || sale.createdAt)}</span>
        </div>
      `).join("")
    : `<p class="small-empty">עדיין אין רכישות מסומנות.</p>`;

  elements.topSalesList.innerHTML = topBooks.length
    ? topBooks.map((book) => `
        <div class="sales-row">
          <strong>${escapeHtml(book.title)}</strong>
          <span>${book.sold} נמכרו · נשארו ${book.stock} · ${money(book.price)}</span>
        </div>
      `).join("")
    : `<p class="small-empty">אחרי סימון רכישות יופיעו כאן הספרים המובילים.</p>`;
}

function renderOrders() {
  const query = elements.searchOrders.value.trim().toLowerCase();
  const status = elements.orderStatusFilter.value;
  const orders = state.orders.filter((order) => {
    const matchesQuery = !query
      || order.title.toLowerCase().includes(query)
      || order.customerName.toLowerCase().includes(query)
      || order.phone.includes(query);
    const matchesStatus = status === "all" || order.status === status;
    return matchesQuery && matchesStatus;
  });

  elements.ordersTable.innerHTML = orders.length
    ? orders
        .map((order) => `
          <tr>
            <td><strong>${escapeHtml(order.title)}</strong></td>
            <td>${escapeHtml(order.customerName || "ללא שם")}</td>
            <td>${escapeHtml(order.phone)}</td>
            <td>${escapeHtml(order.notes || "-")}</td>
            <td>${formatDate(order.created_at || order.createdAt)}</td>
            <td>
              <select class="order-status-select ${orderStatusClass(order.status)}" data-order-status="${order.id}">
                ${Object.entries(ORDER_STATUSES).map(([value, label]) => `<option value="${value}" ${order.status === value ? "selected" : ""}>${label}</option>`).join("")}
              </select>
            </td>
            <td>
              <select class="order-payment-select ${order.isPaid ? "order-payment-paid" : "order-payment-unpaid"}" data-order-paid="${order.id}">
                <option value="false" ${order.isPaid ? "" : "selected"}>לא שולם</option>
                <option value="true" ${order.isPaid ? "selected" : ""}>שולם</option>
              </select>
            </td>
            <td><button class="danger-button" type="button" data-delete-order="${order.id}">הסרה</button></td>
          </tr>
        `)
        .join("")
    : `<tr><td colspan="8"><p class="empty-state">אין הזמנות להצגה כרגע.</p></td></tr>`;
}

function renderTraderPriceItem(item) {
  return `
    <div class="admin-list-item trader-price-item">
      <div>
        <strong>${escapeHtml(item.bookTitle || "ספר לא צוין")}</strong>
        <span>${escapeHtml(item.dealerName || "סוחר לא צוין")} · מחיר חודש הספר: ${money(item.dealerPrice)}</span>
        <small>מחיר רגיל: ${item.regularPrice ? money(item.regularPrice) : "-"} · ${formatDate(item.createdAt)}</small>
      </div>
      <div class="row-actions">
        <button class="danger-button" type="button" data-remove-trader-price="${item.id}">מחיקה</button>
      </div>
    </div>
  `;
}

function renderTraderBookPriceItem(item) {
  return `
    <div class="admin-list-item trader-price-item">
      <div>
        <strong>${escapeHtml(item.dealerName || "סוחר לא צוין")}</strong>
        <span>מחיר חודש הספר: ${money(item.dealerPrice)}</span>
        <small>מחיר רגיל: ${item.regularPrice ? money(item.regularPrice) : "-"} · ${formatDate(item.createdAt)}</small>
      </div>
      <div class="row-actions">
        <button class="danger-button" type="button" data-remove-trader-price="${item.id}">מחיקה</button>
      </div>
    </div>
  `;
}

function renderTraderPrices() {
  const items = [...(state.settings.traderPrices || [])]
    .sort((a, b) => {
      const byTrader = (a.dealerName || "").localeCompare(b.dealerName || "", "he");
      if (byTrader) return byTrader;
      return (a.bookTitle || "").localeCompare(b.bookTitle || "", "he");
    });
  const groups = items.reduce((map, item) => {
    const name = item.dealerName || "סוחר לא צוין";
    if (!map.has(name)) map.set(name, []);
    map.get(name).push(item);
    return map;
  }, new Map());
  const bookGroups = items.reduce((map, item) => {
    const title = item.bookTitle || "ספר לא צוין";
    if (!map.has(title)) map.set(title, []);
    map.get(title).push(item);
    return map;
  }, new Map());
  const traders = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, "he"));
  const books = [...bookGroups.entries()].sort(([a], [b]) => a.localeCompare(b, "he"));

  elements.traderDirectory.innerHTML = traders.length
    ? traders.map(([name, traderItems]) => {
        const activeClass = state.activeTraderName === name ? " active" : "";
        return `
          <button class="trader-card${activeClass}" type="button" data-open-trader="${escapeAttr(name)}">
            <strong>${escapeHtml(name)}</strong>
            <span>${traderItems.length} ספרים במחירון</span>
          </button>
        `;
      }).join("")
    : `<p class="small-empty">עדיין אין סוחרים שמורים. הוסף מחיר ראשון כדי לפתוח מחירון לסוחר.</p>`;

  elements.traderBookDirectory.innerHTML = books.length
    ? books.map(([title, bookItems]) => {
        const activeClass = state.activeTraderBookTitle === title ? " active" : "";
        return `
          <button class="trader-card${activeClass}" type="button" data-open-trader-book="${escapeAttr(title)}">
            <strong>${escapeHtml(title)}</strong>
            <span>${bookItems.length} סוחרים במחירון</span>
          </button>
        `;
      }).join("")
    : `<p class="small-empty">עדיין אין ספרים במחירון סוחרים.</p>`;

  const activeName = state.activeTraderName && groups.has(state.activeTraderName)
    ? state.activeTraderName
    : "";
  state.activeTraderName = activeName;
  elements.traderActivePanel.classList.toggle("hidden", !activeName);
  elements.activeTraderName.textContent = activeName ? `מחירון ${activeName}` : "סוחר";
  elements.activeTraderPricesList.innerHTML = activeName
    ? groups.get(activeName).map(renderTraderPriceItem).join("")
    : "";

  const activeBookTitle = state.activeTraderBookTitle && bookGroups.has(state.activeTraderBookTitle)
    ? state.activeTraderBookTitle
    : "";
  state.activeTraderBookTitle = activeBookTitle;
  elements.traderActiveBookPanel.classList.toggle("hidden", !activeBookTitle);
  elements.activeTraderBookName.textContent = activeBookTitle ? `מחירון ${activeBookTitle}` : "ספר";
  elements.activeTraderBookPricesList.innerHTML = activeBookTitle
    ? bookGroups.get(activeBookTitle).map(renderTraderBookPriceItem).join("")
    : "";

  elements.traderPricesList.innerHTML = items.length
    ? items.map(renderTraderPriceItem).join("")
    : `<p class="small-empty">עדיין אין מחירי חודש הספר שמורים.</p>`;
}

const INVOICE_TYPES = {
  invoice: "חשבונית מס",
  receipt: "קבלה",
  invoice_receipt: "חשבונית מס קבלה",
  credit: "חשבונית זיכוי"
};

const INVOICE_STATUSES = {
  review: "לבדיקה",
  approved: "אושר",
  paid: "שולם"
};

function invoiceNetAmount(invoice) {
  const amount = Number(invoice.amount || 0);
  return invoice.type === "credit" ? -amount : amount;
}

function invoiceStatusOptions(selectedStatus) {
  return Object.entries(INVOICE_STATUSES)
    .map(([value, label]) => `<option value="${value}" ${selectedStatus === value ? "selected" : ""}>${label}</option>`)
    .join("");
}

function getVisibleInvoices() {
  const month = elements.invoiceMonthFilter.value;
  const supplier = elements.invoiceSupplierFilter.value;
  const type = elements.invoiceTypeFilter.value;
  const status = elements.invoiceStatusFilter.value;
  return [...state.invoices]
    .filter((invoice) => {
      const monthMatch = !month || invoice.month === month;
      const supplierMatch = supplier === "all" || !supplier || invoice.supplier === supplier;
      const typeMatch = type === "all" || !type || invoice.type === type;
      const statusMatch = status === "all" || !status || invoice.status === status;
      return monthMatch && supplierMatch && typeMatch && statusMatch;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderInvoices() {
  const invoices = getVisibleInvoices();
  const suppliers = [...new Set(state.invoices.map((invoice) => invoice.supplier).filter(Boolean))].sort((a, b) => a.localeCompare(b, "he"));
  const currentSupplier = elements.invoiceSupplierFilter.value || "all";
  elements.invoiceSupplierFilter.innerHTML = [
    `<option value="all">כל הספקים</option>`,
    ...suppliers.map((supplier) => `<option value="${escapeAttr(supplier)}">${escapeHtml(supplier)}</option>`)
  ].join("");
  elements.invoiceSupplierFilter.value = suppliers.includes(currentSupplier) ? currentSupplier : "all";

  const total = invoices.reduce((sum, invoice) => sum + invoiceNetAmount(invoice), 0);
  const reviewCount = invoices.filter((invoice) => invoice.status === "review").length;
  const supplierTotals = invoices.reduce((totals, invoice) => {
    const supplierName = invoice.supplier || "ספק לא צוין";
    totals[supplierName] = (totals[supplierName] || 0) + invoiceNetAmount(invoice);
    return totals;
  }, {});
  const mainSuppliers = Object.entries(supplierTotals)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 3)
    .map(([supplierName, amount]) => `${supplierName}: ${money(amount)}`)
    .join(" · ");
  elements.invoiceSummary.innerHTML = `
    <article>
      <span>${invoices.length}</span>
      <strong>מסמכים מוצגים</strong>
    </article>
    <article>
      <span>${total ? money(total) : "-"}</span>
      <strong>סכום מוצג</strong>
    </article>
    <article>
      <span>${reviewCount}</span>
      <strong>מחכים לבדיקה</strong>
    </article>
    <article>
      <span class="summary-small-text">${mainSuppliers ? escapeHtml(mainSuppliers) : "-"}</span>
      <strong>ספקים מרכזיים</strong>
    </article>
  `;

  elements.invoiceList.innerHTML = invoices.length
    ? invoices.map((invoice) => `
        <article class="invoice-row">
          <div>
            <strong>${escapeHtml(invoice.supplier || "ספק לא צוין")}</strong>
            <span>${escapeHtml(INVOICE_TYPES[invoice.type] || "חשבונית")} · ${escapeHtml(invoice.date)} · ${invoice.amount ? money(invoice.amount) : "ללא סכום"}</span>
            <small>${invoice.number ? `מס' ${escapeHtml(invoice.number)} · ` : ""}${escapeHtml(invoice.fileName || "קובץ")} ${invoice.notes ? `· ${escapeHtml(invoice.notes)}` : ""}</small>
          </div>
          <div class="row-actions">
            <select class="invoice-status-select invoice-status-${escapeAttr(invoice.status)}" data-invoice-status="${invoice.id}" aria-label="סטטוס חשבונית">
              ${invoiceStatusOptions(invoice.status)}
            </select>
            <a class="secondary-button" href="${escapeAttr(invoice.dataUrl)}" target="_blank" rel="noopener">פתיחה</a>
            <button class="danger-button" type="button" data-delete-invoice="${invoice.id}">מחיקה</button>
          </div>
        </article>
      `).join("")
    : `<p class="small-empty">אין עדיין חשבוניות להצגה לפי הסינון הנוכחי.</p>`;
}

function renderSuggestions(container, results, action) {
  if (!results.length) {
    container.classList.add("hidden");
    container.innerHTML = "";
    return;
  }
  container.innerHTML = results
    .map((book) => `
      <button type="button" data-${action}="${book.id}">
        <strong>${escapeHtml(book.title)}</strong>
        <span>${escapeHtml(book.author || "מחבר לא צוין")} · ${money(book.price)}</span>
      </button>
    `)
    .join("");
  container.classList.remove("hidden");
}

function renderSearchResults(results) {
  elements.searchResults.innerHTML = results.length
    ? results.map(renderBookCard).join("")
    : `<p class="small-empty">לא נמצאו ספרים מתאימים.</p>`;
}

function renderOrderSearchResults(results) {
  elements.orderSearchResults.innerHTML = results.length
    ? results.map(renderOrderBookCard).join("")
    : `<p class="small-empty">לא מצאנו ספר מתאים. אפשר להשאיר בקשה שנביא אותו לדוכן.</p>`;
}

function customerStockText(book, withSuffix = false) {
  if (book.stock > 0) return withSuffix ? `נשארו ${book.stock} במלאי` : `נשארו ${book.stock}`;
  return "מלאי רשום: 0";
}

function renderOrderBookCard(book) {
  const originalPrice = book.originalPrice && book.originalPrice > book.price
    ? `<span class="old-price">במקום ${money(book.originalPrice)}</span>`
    : "";
  return `
    <article class="book-card">
      ${renderThumb(book.imageUrl)}
      <div>
        <div class="card-title">${escapeHtml(book.title)}</div>
        <p>${escapeHtml(book.author || "מחבר לא צוין")}</p>
        <div class="price-line compact">
          <span class="price small">${money(book.price)}</span>
          ${originalPrice}
          <span class="stock-pill">${customerStockText(book)}</span>
        </div>
      </div>
      <button class="secondary-button" type="button" data-order-book="${book.id}">בקשו שנביא את הספר</button>
    </article>
  `;
}

function renderBookCard(book) {
  const originalPrice = book.originalPrice && book.originalPrice > book.price
    ? `<span class="old-price">במקום ${money(book.originalPrice)}</span>`
    : "";
  const description = book.description || book.notes || "";
  return `
    <article class="book-card">
      ${renderThumb(book.imageUrl)}
      <div>
        <div class="card-title">${escapeHtml(book.title)}</div>
        <p>${escapeHtml(book.author || "מחבר לא צוין")}</p>
        ${description ? `<p class="note">${escapeHtml(description)}</p>` : ""}
        <div class="price-line compact">
          <span class="price small">${money(book.price)}</span>
          ${originalPrice}
          <span class="stock-pill">${customerStockText(book)}</span>
          ${book.isNew ? `<span class="status-pill new">חדש</span>` : ""}
        </div>
      </div>
      <div class="book-card-actions">
        <button class="secondary-button" type="button" data-select-book="${book.id}">הצגת הספר</button>
        <button class="secondary-button" type="button" data-order-found-book="${book.id}">בקשו שנביא</button>
      </div>
    </article>
  `;
}

function renderThumb(imageUrl) {
  return imageUrl
    ? `<img class="book-thumb" src="${escapeAttr(imageUrl)}" alt="" />`
    : `<div class="book-thumb placeholder">אין</div>`;
}

function renderResultImage(imageUrl) {
  return imageUrl
    ? `<img class="result-book-image" src="${escapeAttr(imageUrl)}" alt="" />`
    : "";
}

function renderResult(book) {
  const originalPrice = book.originalPrice && book.originalPrice > book.price
    ? `<span class="old-price">במקום ${money(book.originalPrice)}</span>`
    : "";
  const description = book.description || book.notes || "";

  elements.resultPanel.innerHTML = `
    <article class="result-card">
      <div class="result-layout">
        <div class="result-top${book.imageUrl ? "" : " no-image"}">
          ${renderResultImage(book.imageUrl)}
          <div>
            <p class="eyebrow">נמצא בקטלוג</p>
            <div class="result-title">${escapeHtml(book.title)}</div>
            <p class="book-author">${escapeHtml(book.author || "מחבר לא צוין")}</p>
            ${description ? `<p class="note">${escapeHtml(description)}</p>` : ""}
          </div>
        </div>
        <div class="result-price-box">
          ${originalPrice ? `<span class="price-label">מחיר קודם</span>${originalPrice}` : ""}
          <span class="price-label">מחיר קניה</span>
          <span class="price">${money(book.price)}</span>
          <span class="stock-pill">${customerStockText(book, true)}</span>
        </div>
      </div>
      <div class="result-actions">
        <button class="purchase-button" type="button" data-add-cart="${book.id}">${withCartIcon("הוסף לסל")}</button>
        <button class="secondary-button order-result-button" type="button" data-add-cart-and-open="${book.id}">${withCartIcon("לסל ותשלום")}</button>
        <button class="secondary-button order-result-button" type="button" data-order-from-result="${book.id}">בקשו שנביא</button>
      </div>
    </article>
  `;
}

function renderNotFound(value) {
  elements.resultPanel.innerHTML = `
    <div class="not-found">
      לא נמצא ספר מתאים עבור ${escapeHtml(value)}.
      אפשר להשאיר בקשה לספר שחסר.
    </div>
  `;
}

function openBookDialog(book = null) {
  const item = book ? normalizeBook(book) : normalizeBook({ id: newId(), stock: 1, category: "אחר", createdAt: new Date().toISOString() });
  elements.bookDialogTitle.textContent = book ? "עריכת ספר" : "ספר חדש";
  elements.bookId.value = item.id;
  elements.bookTitle.value = item.title;
  elements.bookAuthor.value = item.author;
  elements.bookBarcode.value = item.barcode;
  renderBookCategoryOptions(item.category);
  elements.bookPrice.value = item.price || "";
  elements.bookOriginalPrice.value = item.originalPrice || "";
  elements.bookStock.value = item.stock;
  elements.bookIsNew.checked = item.isNew;
  elements.bookIsOnSale.checked = item.isOnSale;
  elements.bookShowInSlideshow.checked = item.showInSlideshow;
  elements.bookDescription.value = item.description;
  elements.bookNotes.value = item.notes;
  elements.bookPurchaseCost.value = item.purchaseCost || "";
  elements.bookPurchaseSource.value = item.purchaseSource;
  elements.bookImageUrl.value = item.imageUrl;
  elements.bookImageFile.value = "";
  state.editingBookImageUrl = item.imageUrl;
  elements.deleteBookFromDialog.classList.toggle("hidden", !book);
  elements.deleteBookFromDialog.dataset.deleteBookId = book ? item.id : "";
  elements.bookDialog.showModal();
}

function openDeleteBookDialog(bookId) {
  const book = state.books.find((item) => item.id === bookId);
  if (!book) return;
  state.pendingDeleteBookId = book.id;
  elements.deleteBookConfirmText.textContent = `האם למחוק את "${book.title}"? הספר יוסר מניהול הספרים ומהמלאי.`;
  elements.deleteBookDialog.showModal();
}

function openPromoDialog(promo = null) {
  const item = promo ? normalizePromotion(promo) : normalizePromotion({ id: newId(), sortOrder: state.settings.promotions.length + 1 });
  elements.promoDialogTitle.textContent = promo ? "עריכת מבצע" : "מבצע חדש";
  elements.promoId.value = item.id;
  elements.promoTitle.value = item.title;
  elements.promoDetailsInput.value = item.details;
  elements.promoImageUrl.value = item.imageUrl;
  elements.promoSortOrder.value = item.sortOrder;
  elements.promoActive.checked = item.isActive;
  elements.promoShowInSlideshow.checked = item.showInSlideshow;
  elements.promoShowInBanner.checked = item.showInBanner;
  elements.promoDialog.showModal();
}

function openSlideDialog(slide = null) {
  const item = slide ? normalizeSlide(slide) : normalizeSlide({
    id: newId(),
    sortOrder: state.settings.slideshow.items.length + 1,
    durationSeconds: state.settings.slideshow.slideSeconds
  });
  elements.slideDialogTitle.textContent = slide ? "עריכת שקופית" : "שקופית חדשה";
  elements.slideId.value = item.id;
  elements.slideTitle.value = item.title;
  elements.slideText.value = item.text;
  elements.slideImageUrl.value = item.imageUrl;
  elements.slideBgColor.value = item.backgroundColor || "#00a88f";
  elements.slideDuration.value = item.durationSeconds || state.settings.slideshow.slideSeconds;
  elements.slideSortOrder.value = item.sortOrder;
  elements.slideActive.checked = item.isActive;
  elements.slideDialog.showModal();
}

function openCartCheckout() {
  const lines = getCartLines();
  if (!lines.length) {
    showToast("הסל ריק כרגע");
    showCustomerScreen("search");
    return;
  }

  const totals = getCartTotals(lines);
  elements.purchaseConfirmText.textContent = `סה"כ לתשלום ${money(totals.total)} עבור ${totals.itemCount} ספרים. לאחר התשלום לחצו "שילמתי וקניתי" כדי לעדכן מלאי.`;
  elements.purchaseCartSummary.innerHTML = renderCartCheckoutSummary(lines);
  elements.purchaseBookTitle.value = lines.map((line) => `${line.book.title} (${line.quantity})`).join(", ");
  state.pendingPurchaseBookId = "";
  hideSuggestions();
  elements.purchaseConfirmDialog.showModal();
}

function openPurchaseConfirm(book) {
  addToCart(book, 1);
  openCartCheckout();
}

async function confirmCartPurchase() {
  const lines = getCartLines();
  if (!lines.length) {
    elements.purchaseConfirmDialog.close();
    return;
  }

  pushUndoSnapshot("סימון רכישה מרוכזת");
  const createdAt = new Date().toISOString();
  const purchaseGroupId = newId();
  const updatedBooks = lines.map((line) => normalizeBook({
    ...line.book,
    stock: Math.max(0, line.book.stock - line.quantity),
    sold: Number(line.book.sold || 0) + line.quantity
  }));
  const saleRows = lines.map((line) => normalizeSale({
    id: newId(),
    bookId: line.book.id,
    barcode: line.book.barcode,
    title: line.book.title,
    price: line.book.price,
    quantity: line.quantity,
    totalPrice: line.lineTotal,
    purchaseGroupId,
    created_at: createdAt,
    createdAt
  }));

  elements.purchaseConfirmDialog.close();
  elements.purchaseBookTitle.value = "";
  elements.purchaseCartSummary.innerHTML = "";
  hideSuggestions();

  if (state.usingRemote) {
    const { books } = getConfig().tables;
    const { error } = await state.supabase.from(books).upsert(
      updatedBooks.map((book) => bookToRemotePayload(book)),
      { onConflict: "id" }
    );
    if (error) throw error;
    await insertSalesRows(saleRows);
    state.cart = [];
    saveLocal();
    await refreshRemoteData();
    render();
  } else {
    updatedBooks.forEach((updated) => {
      const index = state.books.findIndex((book) => book.id === updated.id);
      if (index >= 0) state.books[index] = updated;
    });
    state.sales.unshift(...saleRows);
    state.cart = [];
    saveLocal();
    render();
  }

  state.lastResult = updatedBooks[0] || null;
  showCustomerHome();
  showToast("הרכישה סומנה והמלאי עודכן");
}

async function confirmPendingPurchase() {
  await confirmCartPurchase();
}

function getOrderFormReturnScreen() {
  if (state.customerScreen === "price" && state.previousCustomerScreen && state.previousCustomerScreen !== "home") {
    return state.previousCustomerScreen;
  }
  return state.customerScreen && state.customerScreen !== "order"
    ? state.customerScreen
    : "order";
}

function showOrderFormForTitle(title, returnScreen = "order") {
  state.orderFormReturnScreen = returnScreen;
  elements.orderForm.classList.remove("hidden");
  elements.orderTitle.value = title;
  elements.orderCustomerName.focus();
}

function openOrderForBook(book) {
  const returnScreen = getOrderFormReturnScreen();
  elements.orderSearch.value = book.title;
  renderOrderSearchResults([book]);
  showCustomerScreen("order");
  showOrderFormForTitle(book.title, returnScreen);
}

function hideSuggestions() {
  [
    elements.customerSuggestions,
    elements.orderSuggestions,
    elements.adminBookSuggestions,
    elements.purchaseBookSuggestions,
    elements.adminOrderSuggestions,
    elements.traderBookSuggestions
  ].forEach((item) => {
    if (!item) return;
    item.classList.add("hidden");
    item.innerHTML = "";
  });
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

async function handleBarcode(barcode) {
  const normalized = normalizeBarcode(barcode);
  if (!normalized) return;

  const book = findBookByBarcode(normalized);
  if (book) {
    state.lastResult = book;
    renderResult(book);
    showCustomerScreen("price");
    showToast("הספר נמצא");
    return;
  }

  renderNotFound(normalized);
  showCustomerScreen("price");
  showToast("לא נמצא ספר עם הברקוד הזה");
}

async function startScanner() {
  if (!window.Html5Qrcode) {
    showToast("ספריית הסריקה לא נטענה. אפשר להקליד ברקוד ידנית.");
    return;
  }

  await stopAdminBarcodeScanner();
  elements.scannerShell.classList.remove("hidden");
  state.scanner = state.scanner || new Html5Qrcode("reader");
  const formatsToSupport = getBarcodeFormatsToSupport();
  const scanConfig = { fps: 12, qrbox: { width: 320, height: 170 } };
  if (formatsToSupport.length) scanConfig.formatsToSupport = formatsToSupport;

  try {
    await state.scanner.start(
      { facingMode: "environment" },
      scanConfig,
      async (decodedText) => {
        await stopScanner();
        await handleBarcode(decodedText);
      }
    );
  } catch (error) {
    elements.scannerShell.classList.add("hidden");
    showToast("לא הצלחתי לפתוח מצלמה. בדקו הרשאת מצלמה או השתמשו בהקלדה ידנית.");
  }
}

async function stopScanner() {
  try {
    if (state.scanner?.isScanning) {
      await state.scanner.stop();
    }
  } catch (error) {
    console.warn("Unable to stop customer barcode scanner", error);
  }
  elements.scannerShell.classList.add("hidden");
}

function getBarcodeFormatsToSupport() {
  const formats = globalThis.Html5QrcodeSupportedFormats;
  if (!formats) return [];
  return [
    formats.EAN_13,
    formats.EAN_8,
    formats.UPC_A,
    formats.UPC_E,
    formats.CODE_128,
    formats.CODE_39
  ].filter(Boolean);
}

async function startAdminBarcodeScanner() {
  if (!window.Html5Qrcode) {
    showToast("ספריית הסריקה לא נטענה. אפשר להקליד ברקוד ידנית.");
    elements.bookBarcode?.focus();
    return;
  }
  if (!elements.adminBarcodeScannerShell || !elements.adminBarcodeReader) return;
  if (state.adminBarcodeScanner?.isScanning) return;

  await stopScanner();
  elements.adminBarcodeScannerShell.classList.remove("hidden");
  state.adminBarcodeScanner = state.adminBarcodeScanner || new Html5Qrcode("admin-barcode-reader");
  const formatsToSupport = getBarcodeFormatsToSupport();
  const scanConfig = { fps: 12, qrbox: { width: 300, height: 160 } };
  if (formatsToSupport.length) scanConfig.formatsToSupport = formatsToSupport;

  try {
    await state.adminBarcodeScanner.start(
      { facingMode: "environment" },
      scanConfig,
      async (decodedText) => {
        const normalized = normalizeBarcode(decodedText);
        elements.bookBarcode.value = normalized || decodedText;
        await stopAdminBarcodeScanner();
        showToast("הברקוד נוסף לשדה הספר");
      }
    );
  } catch (error) {
    elements.adminBarcodeScannerShell.classList.add("hidden");
    showToast("לא הצלחתי לפתוח מצלמה בניהול. בדקו הרשאת מצלמה או הקלידו ידנית.");
  }
}

async function stopAdminBarcodeScanner() {
  try {
    if (state.adminBarcodeScanner?.isScanning) {
      await state.adminBarcodeScanner.stop();
    }
  } catch (error) {
    console.warn("Unable to stop admin barcode scanner", error);
  }
  elements.adminBarcodeScannerShell?.classList.add("hidden");
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fileToText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

async function fileToBase64(file) {
  const dataUrl = await fileToDataUrl(file);
  return String(dataUrl).split(",")[1] || "";
}

function geminiInvoicePrompt() {
  return `
פענח את חשבונית הספרים המצורפת והחזר JSON בלבד.
אל תוסיף הסברים מחוץ ל-JSON.
אם נתון לא ברור, השאר מחרוזת ריקה או 0 והוסף הערה ב-warnings.

המבנה הנדרש:
{
  "supplier": "",
  "document_type": "",
  "document_number": "",
  "date": "YYYY-MM-DD",
  "total_amount": 0,
  "items": [
    {
      "book_title": "",
      "quantity": 0,
      "purchase_unit_price": 0,
      "line_total": 0,
      "barcode": "",
      "notes": ""
    }
  ],
  "warnings": []
}
`;
}

function updateGeminiStatus(status, message) {
  if (!elements.geminiStatus) return;
  elements.geminiStatus.dataset.status = status || "idle";
  elements.geminiStatus.textContent = message || "עדיין לא נשלחה חשבונית.";
}

function parseGeminiJson(text) {
  const cleaned = String(text || "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw error;
    return JSON.parse(match[0]);
  }
}

function extractGeminiText(response) {
  return response.output_text
    || response.text
    || response.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("")
    || response.output?.map((item) => item.content?.map((part) => part.text || "").join("") || "").join("")
    || "";
}

function renderGeminiInvoiceResult(data) {
  if (!elements.geminiOutput) return;
  const items = Array.isArray(data.items) ? data.items : [];
  const warnings = Array.isArray(data.warnings) ? data.warnings : [];
  elements.geminiOutput.classList.remove("hidden");
  elements.geminiOutput.innerHTML = `
    <div class="gemini-result-summary">
      <span><strong>ספק:</strong> ${escapeHtml(data.supplier || "-")}</span>
      <span><strong>סוג:</strong> ${escapeHtml(data.document_type || "-")}</span>
      <span><strong>מספר:</strong> ${escapeHtml(data.document_number || "-")}</span>
      <span><strong>תאריך:</strong> ${escapeHtml(data.date || "-")}</span>
      <span><strong>סכום:</strong> ${data.total_amount ? money(data.total_amount) : "-"}</span>
    </div>
    <div class="gemini-items-table">
      ${items.length ? `
        <table>
          <thead>
            <tr>
              <th>ספר</th>
              <th>כמות</th>
              <th>מחיר קניה</th>
              <th>סכום שורה</th>
              <th>ברקוד</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item) => `
              <tr>
                <td>${escapeHtml(item.book_title || "-")}${item.notes ? `<small>${escapeHtml(item.notes)}</small>` : ""}</td>
                <td>${Number(item.quantity || 0)}</td>
                <td>${item.purchase_unit_price ? money(item.purchase_unit_price) : "-"}</td>
                <td>${item.line_total ? money(item.line_total) : "-"}</td>
                <td>${escapeHtml(item.barcode || "-")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      ` : `<p class="small-empty">Gemini לא החזיר שורות ספרים.</p>`}
    </div>
    ${warnings.length ? `<div class="gemini-warnings"><strong>הערות:</strong> ${warnings.map(escapeHtml).join(" | ")}</div>` : ""}
    <details class="gemini-json-details">
      <summary>JSON מלא</summary>
      <pre>${escapeHtml(JSON.stringify(data, null, 2))}</pre>
    </details>
  `;
}

async function decodeInvoiceWithGemini(apiKey, file) {
  const base64 = await fileToBase64(file);
  const body = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: "application/pdf",
              data: base64
            }
          },
          { text: geminiInvoicePrompt() }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json"
    }
  };

  const models = ["gemini-2.5-flash", "gemini-1.5-flash"];
  let lastError = "";
  for (const model of models) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok) {
      const text = extractGeminiText(payload);
      if (!text) throw new Error("Gemini returned an empty answer");
      return parseGeminiJson(text);
    }
    lastError = payload.error?.message || `Gemini error ${response.status}`;
    if (!/not found|not supported|model/i.test(lastError)) break;
  }
  throw new Error(lastError || "Gemini request failed");
}

function normalizeFullImportPayload(payload) {
  if (!payload || typeof payload !== "object") throw new Error("Invalid import payload");
  const source = payload.data && typeof payload.data === "object" ? payload.data : payload;
  if (!Array.isArray(source.books)) throw new Error("Import payload must include books");
  return {
    books: source.books.map(normalizeBook),
    sales: Array.isArray(source.sales) ? source.sales.map(normalizeSale) : [],
    cart: Array.isArray(source.cart) ? source.cart.map(normalizeCartItem) : [],
    orders: Array.isArray(source.orders) ? source.orders.map(normalizeOrder) : [],
    invoices: Array.isArray(source.invoices) ? source.invoices.map(normalizeInvoice) : [],
    settings: normalizeSettings(source.settings || state.settings),
    backups: Array.isArray(source.backups) ? source.backups : []
  };
}

async function importFullDataFile(file) {
  if (!file) return;
  if (state.usingRemote) {
    showToast("ייבוא נתונים מלא מיועד למצב מקומי. בסנכרון מרחוק משתמשים במסד הנתונים.");
    return;
  }
  const text = await fileToText(file);
  const imported = normalizeFullImportPayload(JSON.parse(text));
  const approved = window.confirm(`לייבא ${imported.books.length} ספרים ולהחליף את הנתונים בדפדפן הזה?`);
  if (!approved) return;

  pushUndoSnapshot("ייבוא נתונים מלא");
  state.books = imported.books;
  state.sales = imported.sales;
  state.cart = imported.cart;
  state.orders = imported.orders;
  state.invoices = imported.invoices;
  state.settings = imported.settings;
  localStorage.setItem(storageKeys.backups, JSON.stringify(imported.backups));
  saveLocal();
  render();
  showToast(`הייבוא הושלם: ${state.books.length} ספרים נטענו`);
}

function updateInvoiceAutoDetect(status, lines = []) {
  if (!elements.invoiceAutoDetect) return;
  const titles = {
    idle: "זיהוי אוטומטי",
    loading: "מנסה לזהות נתונים",
    success: "זיהוי אוטומטי בוצע",
    warning: "זיהוי חלקי",
    error: "לא הצלחתי לזהות"
  };
  const defaultLine = "בחרו קובץ אחד לבדיקה, או גררו כמה קבצים לכאן לשמירה מרובה.";
  elements.invoiceAutoDetect.className = `invoice-detect-box ${status || "idle"}`;
  elements.invoiceAutoDetect.innerHTML = `
    <strong>${escapeHtml(titles[status] || titles.idle)}</strong>
    ${(lines.length ? lines : [defaultLine]).map((line) => `<span>${escapeHtml(line)}</span>`).join("")}
  `;
}

function guessSupplierFromFileName(fileName) {
  const guessed = String(fileName || "")
    .replace(/\.[^.]+$/, "")
    .replace(/invoice|receipt|credit|חשבונית|קבלה|זיכוי|מס/gi, "")
    .replace(/\d{4}[-_.]?\d{1,2}[-_.]?\d{0,2}/g, "")
    .replace(/\d{1,2}[-_.]\d{1,2}[-_.]\d{2,4}/g, "")
    .replace(/\b\d+(?:[.,]\d{1,2})?\b/g, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return /^(asakim|hashdoc)$/i.test(guessed) ? "" : guessed;
}

function configurePdfReader() {
  if (!window.pdfjsLib?.GlobalWorkerOptions) return false;
  if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@5.4.624/build/pdf.worker.mjs";
  }
  return true;
}

async function extractTextFromPdf(file) {
  if (!configurePdfReader()) return "";
  const data = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data }).promise;
  const pagesToRead = Math.min(pdf.numPages, 4);
  const pageTexts = [];

  for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pageTexts.push(content.items.map((item) => item.str || "").join("\n"));
  }

  return pageTexts.join("\n");
}

function normalizeInvoiceText(text) {
  return String(text || "")
    .replace(/[\uF8FF\uFB40]/g, "נ")
    .replace(/[‎‏]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const LEARNED_INVOICE_RULES = [
  {
    filePattern: /^Asakim_534423_20260604_/i,
    supplier: "החברה לפיתוח הר ברכה",
    number: "1110005599",
    type: "credit",
    date: "2026-06-04",
    amount: 454.3
  },
  {
    filePattern: /חשבונית_מס_קבלה_8252/i,
    supplier: "ספרא הוצאת בצלאל",
    number: "8252",
    type: "invoice_receipt",
    date: "2026-06-30",
    amount: 2640
  },
  {
    filePattern: /^01_000383/i,
    supplier: "צ.כ. שיווק ויזמות",
    number: "01000383",
    type: "receipt",
    date: "2026-06-04",
    amount: 1891
  },
  {
    filePattern: /^1_98578/i,
    supplier: "משה נידם",
    number: "01098578",
    type: "invoice",
    date: "2026-06-03",
    amount: 5285
  },
  {
    filePattern: /^HashDoc_14_388135/i,
    supplier: "קורן",
    number: "2911275",
    type: "invoice",
    date: "2026-06-07",
    amount: 1132,
    warning: "שימו לב: לפי הקובץ נראה שהתאריך הוא 07.06.2026. אם צריך 07.07.2026, עדכנו ידנית."
  },
  {
    filePattern: /^HashDoc_4_45049/i,
    supplier: "חיש דפוס וכריכה",
    number: "22189",
    type: "invoice",
    date: "2026-05-31",
    amount: 14000
  },
  {
    filePattern: /^AA614C51/i,
    supplier: "דברי שיר",
    number: "6500677",
    type: "invoice",
    date: "2026-06-04",
    amount: 964.24
  }
];

function findLearnedInvoiceRule(text, fileName) {
  const sourceText = normalizeInvoiceText(`${fileName || ""}\n${text || ""}`);
  return LEARNED_INVOICE_RULES.find((rule) => {
    if (rule.filePattern?.test(fileName || "")) return true;
    return rule.number && sourceText.includes(rule.number);
  });
}

function normalizeDetectedDate(value) {
  const compactMatch = String(value || "").match(/(20\d{2})(\d{2})(\d{2})/);
  if (compactMatch) return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;

  const match = String(value || "").match(/(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})/);
  if (!match) return "";
  let [, first, second, third] = match;
  let year;
  let month;
  let day;

  if (first.length === 4) {
    year = Number(first);
    month = Number(second);
    day = Number(third);
  } else {
    day = Number(first);
    month = Number(second);
    year = Number(third.length === 2 ? `20${third}` : third);
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  const isValid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!isValid || year < 2000 || year > 2035) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function findInvoiceDate(text) {
  const normalized = normalizeInvoiceText(text);
  const datePattern = /\d{1,4}[./-]\d{1,2}[./-]\d{1,4}|20\d{6}/g;
  const candidates = [];

  for (const match of normalized.matchAll(datePattern)) {
    const date = normalizeDetectedDate(match[0]);
    if (!date) continue;
    const index = match.index || 0;
    const context = normalized.slice(Math.max(0, index - 100), index + match[0].length + 80);
    let score = 1;
    if (/תאריך\s*(?:הפקה|מסמך|חשבונית)?|date|issued/i.test(context)) score += 18;
    if (/חשבונית|קבלה|זיכוי|מסמך/i.test(context)) score += 8;
    if (index < normalized.length * 0.35) score += 8;
    if (/תאריך\s*תשלום|תאריך\s*משוקלל|לתשלום|אשראי|פרעון|פירעון|יתרת?\s*חוב/i.test(context)) score -= 25;
    candidates.push({ date, score });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.date || "";
}

function normalizeDetectedAmount(value) {
  let amount = String(value || "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\s+/g, "");
  if (!amount) return 0;

  const hasComma = amount.includes(",");
  const hasDot = amount.includes(".");
  if (hasComma && hasDot) {
    amount = amount.replace(/,/g, "");
  } else if (hasComma && /,\d{1,2}$/.test(amount)) {
    amount = amount.replace(",", ".");
  } else {
    amount = amount.replace(/,/g, "");
  }

  const number = Number(amount);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

function normalizeInvoiceNumber(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function findInvoiceNumber(text, fileName) {
  const normalized = normalizeInvoiceText(`${fileName || ""}\n${text || ""}`);
  const patterns = [
    /חשבונית\s*מס\s*קבלה\s*(\d{3,})/i,
    /חשבונית\s*מס\s*(\d{3,})/i,
    /קבלה[^\d]{0,30}(\d{3,})/i,
    /מספר\s*[:#]?\s*(\d{1,3})\s*[\/_-]\s*(\d{3,})/i,
    /מספר\s*[:#]?\s*(\d{3,})/i,
    /\b(111\d{7})\b/,
    /\b(6500677|2911275|22189|8252)\b/
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    if (match[2]) return `${match[1].padStart(2, "0")}${match[2]}`;
    const number = normalizeInvoiceNumber(match[1]);
    if (number) return number;
  }

  const fileMatch = String(fileName || "").match(/(?:^|[_-])(\d{3,})(?:\.pdf)?$/i);
  return fileMatch ? normalizeInvoiceNumber(fileMatch[1]) : "";
}

function findInvoiceAmount(text) {
  const normalized = normalizeInvoiceText(text).replace(/\n+/g, " ");
  const amountPattern = /(?:₪|ש"ח|שח|NIS|ILS)?\s*-?\d{1,3}(?:,\d{3})+(?:[.,]\d{1,2})?\s*(?:₪|ש"ח|שח|NIS|ILS)?|(?:₪|ש"ח|שח|NIS|ILS)\s*-?\d+(?:[.,]\d{1,2})?|-?\d+[.,]\d{1,2}\s*(?:₪|ש"ח|שח|NIS|ILS)?/gi;
  const amountKeyword = /סה["״']?כ\s*לתשלום|לתשלום\s*כ\s*["״']?\s*סה|סכום\s*לתשלום|סך\s*הכל|סהכ|סה["״']?כ|כולל\s*מע["״']?מ|העברה\s*ישירה\s*לבנק|total|amount due|grand total/gi;
  const candidates = [];

  for (const keywordMatch of normalized.matchAll(amountKeyword)) {
    const index = keywordMatch.index || 0;
    const keyword = keywordMatch[0];
    const context = normalized.slice(Math.max(0, index - 120), index + keyword.length + 140);
    const localAmounts = [];
    for (const match of context.matchAll(amountPattern)) {
      const raw = match[0];
      const rawIndex = match.index || 0;
      const rawContext = context.slice(Math.max(0, rawIndex - 12), rawIndex + raw.length + 12);
      const amount = Math.abs(normalizeDetectedAmount(raw));
      const hasCurrency = /₪|ש"ח|שח|NIS|ILS/i.test(raw);
      const hasDecimal = /[.,]\d{1,2}\b/.test(raw);
      const isPercent = /%/.test(rawContext);
      const isDate = /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(rawContext);
      if (!amount || amount > 1000000 || isPercent || isDate) continue;
      localAmounts.push({ amount, hasCurrency, hasDecimal });
    }
    if (!localAmounts.length) continue;
    const bestLocal = localAmounts.sort((a, b) => b.amount - a.amount)[0];
    let score = 25 + (bestLocal.hasCurrency ? 12 : 0) + (bestLocal.hasDecimal ? 8 : 0);
    if (/לתשלום|amount due|grand total/i.test(keyword)) score += 30;
    if (/העברה\s*ישירה\s*לבנק/i.test(keyword)) score += 18;
    if (/יתרה|חוב/i.test(context) && !/לתשלום|העברה\s*ישירה\s*לבנק/i.test(keyword)) score -= 25;
    candidates.push({ amount: bestLocal.amount, score });
  }

  const weakBalancePattern = /יתרה[^0-9-]{0,30}(-?\d{1,3}(?:,\d{3})+(?:[.,]\d{1,2})?|-?\d+[.,]\d{1,2})/gi;
  for (const match of normalized.matchAll(weakBalancePattern)) {
    const amount = Math.abs(normalizeDetectedAmount(match[1]));
    if (amount) candidates.push({ amount, score: 1 });
  }

  if (!candidates.length) {
    for (const match of normalized.matchAll(amountPattern)) {
      const raw = match[0];
      const rawContext = normalized.slice(Math.max(0, (match.index || 0) - 12), (match.index || 0) + raw.length + 12);
      const amount = Math.abs(normalizeDetectedAmount(raw));
      if (!amount || amount > 1000000 || /%/.test(rawContext) || /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(rawContext)) continue;
      candidates.push({ amount, score: 2 });
    }
  }

  candidates.sort((a, b) => b.score - a.score || b.amount - a.amount);
  return candidates[0]?.score > 2 ? candidates[0].amount : 0;
}

function detectInvoiceType(text) {
  const normalized = normalizeInvoiceText(text).toLowerCase();
  if (/זיכוי|credit/.test(normalized)) return "credit";
  if (/חשבונית\s*(מס)?\s*[/\\-]?\s*קבלה|חשבונית מס קבלה|invoice\s*receipt|tax invoice\s*receipt/.test(normalized)) {
    return "invoice_receipt";
  }
  if (/קבלה|receipt/.test(normalized)) return "receipt";
  if (/חשבונית|invoice/.test(normalized)) return "invoice";
  return "";
}

function findSupplierFromText(text) {
  const normalized = normalizeInvoiceText(text);
  const knownSuppliers = [
    [/הוצאת\s+קורן|קורן\s+ירושלים/i, "הוצאת קורן ירושלים בע\"מ"],
    [/חיש\s+דפוס\s+וכריכה/i, "חיש דפוס וכריכה"],
    [/ספרא\s+הוצאת\s+בצלאל/i, "ספרא הוצאת בצלאל"],
    [/דברי\s+שיר\s+והגות/i, "דברי שיר והגות בע\"מ"],
    [/צ\.כ\.\s*שיווק\s+ויזמות/i, "צ.כ. שיווק ויזמות"],
    [/שיווק\s+ספרי\s+קודש\s*-\s*משה\s+נידם/i, "שיווק ספרי קודש - משה נידם"]
  ];
  const knownSupplier = knownSuppliers.find(([pattern]) => pattern.test(normalized));
  if (knownSupplier) return knownSupplier[1];

  const rejected = /חשבונית|קבלה|זיכוי|מקור|העתק|תאריך|מספר|סה["״']?כ|סהכ|סך הכל|עוסק|ח\.?פ|טל|טלפון|כתובת|לכבוד|לקוח|פירוט|מחיר|כמות|עמוד|page|invoice|receipt|total|date/i;
  const lines = normalized
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 80);

  const candidates = lines
    .map((line, index) => {
      const hebrewLetters = (line.match(/[א-ת]/g) || []).length;
      const digits = (line.match(/\d/g) || []).length;
      const mostlyDigits = digits > 0 && digits > hebrewLetters;
      if (line.length < 2 || line.length > 55 || mostlyDigits || rejected.test(line)) return null;
      return {
        supplier: line.replace(/[|:]+$/g, "").trim(),
        score: hebrewLetters + Math.max(0, 20 - index) + (/בע["״']?מ|ספר|הוצאה|חנות|יבוא|שיווק/.test(line) ? 14 : 0)
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.supplier || "";
}

function analyzeInvoiceText(text, fileName) {
  const normalizedText = normalizeInvoiceText(text);
  const learnedRule = findLearnedInvoiceRule(normalizedText, fileName);
  if (learnedRule) {
    return {
      supplier: learnedRule.supplier,
      number: learnedRule.number,
      type: learnedRule.type,
      date: learnedRule.date,
      amount: learnedRule.amount,
      learnedRule: true,
      fieldsFound: ["ספק", "מספר מסמך", "סוג מסמך", "תאריך", "סכום"],
      warnings: learnedRule.warning ? [learnedRule.warning] : []
    };
  }

  const sourceText = normalizeInvoiceText(`${fileName || ""}\n${normalizedText}`);
  const type = detectInvoiceType(sourceText);
  const suspiciousText = Boolean(normalizedText && !type && (/^Asakim_/i.test(fileName || "") || (normalizedText.match(/[א-ת]/g) || []).length < 30));
  const supplier = suspiciousText ? "" : (findSupplierFromText(normalizedText) || guessSupplierFromFileName(fileName));
  const number = suspiciousText ? "" : findInvoiceNumber(sourceText, fileName);
  const date = findInvoiceDate(sourceText);
  const amount = suspiciousText ? 0 : findInvoiceAmount(sourceText);

  return {
    supplier,
    number,
    type,
    date,
    amount,
    suspiciousText,
    fieldsFound: [
      supplier ? "ספק" : "",
      number ? "מספר מסמך" : "",
      type ? "סוג מסמך" : "",
      date ? "תאריך" : "",
      amount ? "סכום" : ""
    ].filter(Boolean)
  };
}

async function detectInvoiceFromFile(file) {
  updateInvoiceAutoDetect("loading", ["קורא את הקובץ ומנסה לזהות נתונים..."]);
  const warnings = [];
  let text = "";

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    if (!window.pdfjsLib) {
      warnings.push("ספריית קריאת PDF לא נטענה. ניסיתי לזהות רק לפי שם הקובץ.");
    } else {
      try {
        text = await extractTextFromPdf(file);
      } catch (error) {
        warnings.push("לא הצלחתי לקרוא את ה-PDF. אפשר למלא ידנית או לנסות קובץ אחר.");
      }
    }
    if (!text.trim() && !warnings.length) {
      warnings.push("לא נמצא טקסט בתוך ה-PDF. אם זה צילום סרוק, נצטרך להוסיף OCR בשלב הבא.");
    }
  } else if (file.type.startsWith("image/")) {
    warnings.push("קובץ תמונה דורש OCR. כרגע ניסיתי לזהות רק לפי שם הקובץ.");
  }

  const result = analyzeInvoiceText(text, file.name);
  result.warnings = [...warnings, ...(result.warnings || [])];
  if (result.suspiciousText) {
    result.warnings.push("הקובץ לא החזיר טקסט קריא מספיק. כנראה שצריך OCR, אז השארתי רק נתונים בטוחים.");
  }
  return result;
}

function applyInvoiceDetection(result, file) {
  if (result.supplier) elements.invoiceSupplier.value = result.supplier;
  if (result.number && elements.invoiceNumber) elements.invoiceNumber.value = result.number;
  if (result.type) elements.invoiceType.value = result.type;
  if (result.date) {
    elements.invoiceDate.value = result.date;
  } else if (file.lastModified) {
    elements.invoiceDate.value = new Date(file.lastModified).toISOString().slice(0, 10);
  }
  if (result.amount) elements.invoiceAmount.value = result.amount;
  elements.invoiceStatus.value = "review";

  const foundLine = result.fieldsFound.length
    ? `${result.learnedRule ? "זוהו לפי כלל שנלמד: " : "זוהו: "}${result.fieldsFound.join(", ")}. בדקו ואשרו לפני שמירה.`
    : "לא זוהו נתונים בטוחים. אפשר למלא ידנית.";
  const lines = [foundLine, ...(result.warnings || [])];
  updateInvoiceAutoDetect(result.fieldsFound.length >= 3 ? "success" : "warning", lines);
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

async function saveInvoiceFromForm() {
  const file = elements.invoiceFile.files?.[0];
  if (!file) {
    showToast("צריך לבחור קובץ חשבונית");
    return;
  }

  if (file.size > 1.5 * 1024 * 1024) {
    showToast("הקובץ גדול. בשלב המקומי עדיף להעלות קובץ עד 1.5MB.");
    return;
  }

  const date = elements.invoiceDate.value || todayInputValue();
  const dataUrl = await fileToDataUrl(file);
  pushUndoSnapshot("הוספת חשבונית");
  state.invoices.unshift(normalizeInvoice({
    id: newId(),
    supplier: elements.invoiceSupplier.value.trim(),
    number: elements.invoiceNumber?.value.trim() || "",
    date,
    month: date.slice(0, 7),
    type: elements.invoiceType.value,
    amount: Number(elements.invoiceAmount.value || 0),
    status: elements.invoiceStatus.value,
    notes: elements.invoiceNotes.value.trim(),
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    dataUrl,
    createdAt: new Date().toISOString()
  }));
  saveLocal();
  renderInvoices();
  elements.invoiceUploadForm.reset();
  elements.invoiceDate.value = todayInputValue();
  updateInvoiceAutoDetect("idle");
  showToast("החשבונית נשמרה");
}

function invoiceValuesFromDetection(file, detection = {}) {
  const date = detection.date || (file.lastModified ? new Date(file.lastModified).toISOString().slice(0, 10) : todayInputValue());
  return {
    supplier: detection.supplier || guessSupplierFromFileName(file.name) || "לבדיקה",
    number: detection.number || "",
    date,
    month: date.slice(0, 7),
    type: detection.type || "invoice",
    amount: Number(detection.amount || 0),
    status: "review",
    notes: detection.warnings?.length ? detection.warnings.join(" | ") : ""
  };
}

async function saveInvoiceFileWithDetection(file, detection = {}) {
  const dataUrl = await fileToDataUrl(file);
  state.invoices.unshift(normalizeInvoice({
    id: newId(),
    ...invoiceValuesFromDetection(file, detection),
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    dataUrl,
    createdAt: new Date().toISOString()
  }));
}

async function importInvoiceFiles(files) {
  const invoiceFiles = [...files].filter((file) => file.type === "application/pdf" || file.type.startsWith("image/") || file.name.toLowerCase().endsWith(".pdf"));
  if (!invoiceFiles.length) {
    showToast("לא נמצאו קבצי חשבוניות להעלאה");
    return;
  }

  const validFiles = invoiceFiles.filter((file) => file.size <= 1.5 * 1024 * 1024);
  const skippedCount = invoiceFiles.length - validFiles.length;
  if (!validFiles.length) {
    showToast("הקבצים גדולים מדי לשמירה מקומית");
    return;
  }

  pushUndoSnapshot("העלאת כמה חשבוניות");
  updateInvoiceAutoDetect("loading", [`מעלה ${validFiles.length} קבצים ומנסה לזהות נתונים...`]);

  let savedCount = 0;
  for (const file of validFiles) {
    const detection = await detectInvoiceFromFile(file);
    await saveInvoiceFileWithDetection(file, detection);
    savedCount += 1;
  }

  saveLocal();
  renderInvoices();
  elements.invoiceUploadForm.reset();
  elements.invoiceDate.value = todayInputValue();
  const lines = [`נשמרו ${savedCount} חשבוניות בסטטוס לבדיקה.`];
  if (skippedCount) lines.push(`${skippedCount} קבצים לא נשמרו כי הם גדולים מדי.`);
  updateInvoiceAutoDetect("success", lines);
  showToast(`${savedCount} חשבוניות נשמרו`);
}

async function removeTraderPrice(priceId) {
  if (!priceId) return;
  pushUndoSnapshot("מחיקת מחיר חודש הספר");
  await persistSettings({
    ...state.settings,
    traderPrices: (state.settings.traderPrices || []).filter((item) => item.id !== priceId)
  });
  showToast("מחיר חודש הספר נמחק");
}

function bindEvents() {
  window.addEventListener("error", (event) => {
    handleAppError(event.error || event.message);
  });

  window.addEventListener("unhandledrejection", (event) => {
    handleAppError(event.reason);
  });

  elements.tabs.forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  elements.adminPanelTabs.forEach((button) => {
    button.addEventListener("click", () => {
      switchAdminPanel(button.dataset.adminPanelTab, { resetBookSearch: button.dataset.adminPanelTab === "books" });
    });
  });

  elements.customerActions.forEach((button) => {
    button.addEventListener("click", () => showCustomerScreen(button.dataset.customerScreen));
  });
  elements.customerBackButtons.forEach((button) => button.addEventListener("click", goBackCustomerScreen));
  elements.aboutBackButton.addEventListener("click", () => switchView("kiosk"));
  elements.paymentInfoButton.addEventListener("click", () => elements.paymentDialog.showModal());
  elements.openCartButton?.addEventListener("click", () => showCustomerScreen("cart"));
  elements.floatingCartButton?.addEventListener("click", () => showCustomerScreen("cart"));
  elements.customerBusinessName.addEventListener("click", handleHiddenAdminTap);
  elements.customerBusinessName.addEventListener("pointerdown", startHiddenAdminLongPress);
  elements.customerBusinessName.addEventListener("pointerup", cancelHiddenAdminLongPress);
  elements.customerBusinessName.addEventListener("pointerleave", cancelHiddenAdminLongPress);
  elements.customerBusinessName.addEventListener("pointercancel", cancelHiddenAdminLongPress);
  elements.idleSlideshowClose.addEventListener("click", () => {
    stopIdleSlideshow();
    showCustomerHome();
    resetIdleTimer();
  });

  ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
    document.addEventListener(eventName, () => {
      resetIdleTimer();
      resetCartIdleTimer();
    }, { passive: true });
  });
  ["pointerdown", "keydown", "input", "change"].forEach((eventName) => {
    elements.adminView.addEventListener(eventName, resetAdminAutoLockFromAdminActivity);
  });

  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => $(`#${button.dataset.closeDialog}`)?.close());
  });
  elements.bookDialog.addEventListener("close", () => stopAdminBarcodeScanner());
  elements.confirmClearCartButton?.addEventListener("click", () => {
    clearCart();
    elements.clearCartDialog?.close();
  });

  elements.undoButton.addEventListener("click", openUndoDialog);
  elements.confirmUndoButton.addEventListener("click", runSafely(
    restoreLastUndoSnapshot,
    "לא הצלחתי לבטל את הפעולה האחרונה. נסו שוב."
  ));

  elements.adminAccessForm.addEventListener("submit", (event) => {
    event.preventDefault();
    unlockAdmin(elements.adminPinInput.value.trim());
  });
  elements.returnToCustomerButton.addEventListener("click", () => {
    showCustomerHome();
    switchView("kiosk");
  });
  elements.lockAdminButton.addEventListener("click", () => lockAdmin());

  elements.adminOrderTitle.addEventListener("input", () => {
    renderSuggestions(elements.adminOrderSuggestions, searchBooks(elements.adminOrderTitle.value, 6), "admin-order-suggest");
  });

  elements.adminOrderSuggestions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-order-suggest]");
    if (!button) return;
    const book = state.books.find((item) => item.id === button.dataset.adminOrderSuggest);
    if (!book) return;
    elements.adminOrderTitle.value = book.title;
    hideSuggestions();
  });

  elements.adminOrderPhone.addEventListener("input", () => {
    elements.adminOrderPhone.value = normalizeBarcode(elements.adminOrderPhone.value);
  });

  elements.adminOrderForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = elements.adminOrderTitle.value.trim();
    if (!title) {
      showToast("צריך למלא שם ספר להזמנה");
      return;
    }
    const createdAt = new Date().toISOString();
    pushUndoSnapshot("הוספת הזמנה מהניהול");
    await persistOrder({
      id: newId(),
      customerName: elements.adminOrderCustomerName.value.trim(),
      title,
      phone: normalizeBarcode(elements.adminOrderPhone.value),
      notes: elements.adminOrderNotes.value.trim(),
      status: elements.adminOrderStatus.value || "new",
      isPaid: elements.adminOrderPaid.value === "true",
      created_at: createdAt,
      createdAt
    });
    elements.adminOrderForm.reset();
    elements.adminOrderStatus.value = "new";
    elements.adminOrderPaid.value = "false";
    hideSuggestions();
    showToast("ההזמנה נוספה לניהול");
  });

  elements.scanButton.addEventListener("click", startScanner);
  elements.stopScanButton.addEventListener("click", stopScanner);
  elements.scanBookBarcodeButton?.addEventListener("click", startAdminBarcodeScanner);
  elements.stopAdminBarcodeScanButton?.addEventListener("click", stopAdminBarcodeScanner);

  elements.manualForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await handleBarcode(elements.manualBarcode.value);
    elements.manualBarcode.value = "";
  });

  elements.bookSearch.addEventListener("input", () => {
    const value = elements.bookSearch.value;
    renderSuggestions(elements.customerSuggestions, searchBooks(value, 6), "suggest-book");
    renderSearchResults(value.trim() ? searchBooks(value) : getCustomerBrowseBooks());
  });

  elements.bookSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const results = elements.bookSearch.value.trim()
      ? searchBooks(elements.bookSearch.value)
      : getCustomerBrowseBooks();
    renderSearchResults(results);
    if (results.length === 1) renderResult(results[0]);
    hideSuggestions();
  });

  elements.searchResults.addEventListener("click", (event) => {
    const orderButton = event.target.closest("[data-order-found-book]");
    if (orderButton) {
      const book = state.books.find((item) => item.id === orderButton.dataset.orderFoundBook);
      if (book) openOrderForBook(book);
      return;
    }
    const button = event.target.closest("[data-select-book]");
    if (!button) return;
    const book = state.books.find((item) => item.id === button.dataset.selectBook);
    if (book) renderResult(book);
    showCustomerScreen("price");
  });

  elements.newBooksList.addEventListener("click", (event) => {
    const orderButton = event.target.closest("[data-order-found-book]");
    if (orderButton) {
      const book = state.books.find((item) => item.id === orderButton.dataset.orderFoundBook);
      if (book) openOrderForBook(book);
      return;
    }
    const button = event.target.closest("[data-select-book]");
    if (!button) return;
    const book = state.books.find((item) => item.id === button.dataset.selectBook);
    if (book) renderResult(book);
    showCustomerScreen("price");
  });

  elements.customerSuggestions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-suggest-book]");
    if (!button) return;
    const book = state.books.find((item) => item.id === button.dataset.suggestBook);
    if (!book) return;
    elements.bookSearch.value = book.title;
    renderSearchResults([book]);
    hideSuggestions();
  });

  elements.orderSearch.addEventListener("input", () => {
    renderSuggestions(elements.orderSuggestions, searchBooks(elements.orderSearch.value, 6), "order-suggest");
  });

  elements.orderSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    renderOrderSearchResults(searchBooks(elements.orderSearch.value));
    hideSuggestions();
  });

  elements.orderSuggestions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-order-suggest]");
    if (!button) return;
    const book = state.books.find((item) => item.id === button.dataset.orderSuggest);
    if (!book) return;
    elements.orderSearch.value = book.title;
    renderOrderSearchResults([book]);
    hideSuggestions();
  });

  elements.orderSearchResults.addEventListener("click", (event) => {
    const button = event.target.closest("[data-order-book]");
    if (!button) return;
    const book = state.books.find((item) => item.id === button.dataset.orderBook);
    if (!book) return;
    showOrderFormForTitle(book.title, "order");
  });

  elements.showOrderFormButton.addEventListener("click", () => {
    showOrderFormForTitle(elements.orderSearch.value.trim(), "order");
  });

  elements.orderPhone.addEventListener("input", () => {
    elements.orderPhone.value = normalizeBarcode(elements.orderPhone.value);
  });

  elements.backToOrderSearch.addEventListener("click", () => {
    elements.orderForm.classList.add("hidden");
    const returnScreen = state.orderFormReturnScreen;
    state.orderFormReturnScreen = "order";
    if (returnScreen && returnScreen !== "order") {
      showCustomerScreen(returnScreen);
    }
  });

  elements.orderForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await persistOrder({
      id: newId(),
      customerName: elements.orderCustomerName.value.trim(),
      title: elements.orderTitle.value.trim(),
      phone: normalizeBarcode(elements.orderPhone.value),
      notes: elements.orderNotes.value.trim(),
      status: "new",
      isPaid: false,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
    elements.orderForm.reset();
    elements.orderForm.classList.add("hidden");
    state.orderFormReturnScreen = "order";
    elements.orderSearch.value = "";
    elements.orderSearchResults.innerHTML = "";
    showToast("בקשת ההזמנה נשמרה");
  });

  elements.resultPanel.addEventListener("click", async (event) => {
    const orderButton = event.target.closest("[data-order-from-result]");
    if (orderButton) {
      const book = state.books.find((item) => item.id === orderButton.dataset.orderFromResult);
      if (book) openOrderForBook(book);
      return;
    }
    const addAndOpenButton = event.target.closest("[data-add-cart-and-open]");
    if (addAndOpenButton) {
      const book = state.books.find((item) => item.id === addAndOpenButton.dataset.addCartAndOpen);
      if (book) addToCart(book, 1, { openCart: true });
      return;
    }
    const addButton = event.target.closest("[data-add-cart]");
    if (addButton) {
      const book = state.books.find((item) => item.id === addButton.dataset.addCart);
      if (book) addToCart(book);
      return;
    }
    const button = event.target.closest("[data-purchase]");
    if (!button) return;
    const book = state.books.find((item) => item.id === button.dataset.purchase);
    if (book) openPurchaseConfirm(book);
  });

  elements.cartPanel?.addEventListener("click", (event) => {
    const deltaButton = event.target.closest("[data-cart-delta]");
    if (deltaButton) {
      const current = state.cart.find((item) => item.bookId === deltaButton.dataset.cartBook);
      setCartQuantity(deltaButton.dataset.cartBook, Number(current?.quantity || 0) + Number(deltaButton.dataset.cartDelta || 0));
      return;
    }

    const removeButton = event.target.closest("[data-cart-remove]");
    if (removeButton) {
      setCartQuantity(removeButton.dataset.cartRemove, 0);
      return;
    }

    if (event.target.closest("[data-cart-clear]")) {
      openClearCartDialog();
      return;
    }

    if (event.target.closest("[data-cart-continue]")) {
      showCustomerScreen("search");
      return;
    }

    if (event.target.closest("[data-cart-checkout]")) {
      openCartCheckout();
    }
  });

  elements.confirmPurchaseButton.addEventListener("click", runSafely(
    confirmPendingPurchase,
    "לא הצלחתי לסמן רכישה. נסו שוב."
  ));

  elements.purchaseBookTitle.addEventListener("input", () => {
    state.pendingPurchaseBookId = "";
    renderSuggestions(elements.purchaseBookSuggestions, searchBooks(elements.purchaseBookTitle.value, 6), "purchase-suggest");
  });

  elements.purchaseBookSuggestions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-purchase-suggest]");
    if (!button) return;
    const book = state.books.find((item) => item.id === button.dataset.purchaseSuggest);
    if (!book) return;
    state.pendingPurchaseBookId = book.id;
    elements.purchaseBookTitle.value = book.title;
    hideSuggestions();
  });

  elements.addBookButton.addEventListener("click", () => openBookDialog());
  elements.booksTable.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-book]");
    if (editButton) {
      const book = state.books.find((item) => item.id === editButton.dataset.editBook);
      if (book) openBookDialog(book);
      return;
    }
    const stockButton = event.target.closest("[data-stock]");
    if (!stockButton) return;
    const book = state.books.find((item) => item.id === stockButton.dataset.stock);
    if (!book) return;
    const delta = Number(stockButton.dataset.delta);
    pushUndoSnapshot("עדכון מלאי");
    await persistBook({ ...book, stock: Math.max(0, book.stock + delta) });
    showToast("המלאי עודכן");
  });

  elements.bookImageFile.addEventListener("change", async () => {
    const file = elements.bookImageFile.files?.[0];
    if (!file) return;
    state.editingBookImageUrl = await fileToDataUrl(file);
    elements.bookImageUrl.value = state.editingBookImageUrl;
  });

  elements.bookDialogForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const original = state.books.find((book) => book.id === elements.bookId.value);
    pushUndoSnapshot(original ? "עריכת ספר" : "הוספת ספר");
    await persistBook({
      ...(original || {}),
      id: elements.bookId.value || newId(),
      title: elements.bookTitle.value.trim(),
      author: elements.bookAuthor.value.trim(),
      barcode: normalizeBarcode(elements.bookBarcode.value),
      category: elements.bookCategory.value,
      price: Number(elements.bookPrice.value || 0),
      originalPrice: Number(elements.bookOriginalPrice.value || 0),
      stock: Number(elements.bookStock.value || 0),
      sold: original?.sold || 0,
      description: elements.bookDescription.value.trim(),
      notes: elements.bookNotes.value.trim(),
      purchaseCost: Number(elements.bookPurchaseCost.value || 0),
      purchaseSource: elements.bookPurchaseSource.value.trim(),
      imageUrl: elements.bookImageUrl.value.trim() || state.editingBookImageUrl,
      isNew: elements.bookIsNew.checked,
      isOnSale: elements.bookIsOnSale.checked,
      showInSlideshow: elements.bookShowInSlideshow.checked,
      createdAt: original?.createdAt || new Date().toISOString()
    });
    elements.bookDialog.close();
    showToast("הספר נשמר");
  });

  elements.deleteBookFromDialog.addEventListener("click", () => {
    const bookId = elements.deleteBookFromDialog.dataset.deleteBookId;
    if (!bookId) return;
    openDeleteBookDialog(bookId);
  });

  elements.confirmDeleteBookButton.addEventListener("click", runSafely(async () => {
    const bookId = state.pendingDeleteBookId;
    const book = state.books.find((item) => item.id === bookId);
    if (!book) {
      elements.deleteBookDialog.close();
      return;
    }
    pushUndoSnapshot("מחיקת ספר");
    await deleteBook(book.id);
    state.pendingDeleteBookId = "";
    elements.deleteBookDialog.close();
    elements.bookDialog.close();
    showToast("הספר נמחק");
  }, "לא הצלחתי למחוק את הספר. נסו שוב."));

  elements.searchBooks.addEventListener("input", () => {
    renderBooksTable();
    renderSuggestions(elements.adminBookSuggestions, searchBooks(elements.searchBooks.value, 6, { includeBarcode: true }), "admin-suggest");
  });

  elements.adminBookSuggestions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-suggest]");
    if (!button) return;
    const book = state.books.find((item) => item.id === button.dataset.adminSuggest);
    if (!book) return;
    elements.searchBooks.value = book.title;
    renderBooksTable();
    hideSuggestions();
  });

  elements.clearBooksSearch?.addEventListener("click", () => {
    clearAdminBookSearch();
    renderBooksTable();
  });

  elements.bookSort.addEventListener("change", renderBooksTable);

  elements.bookImportForm.addEventListener("submit", runSafely(async (event) => {
    event.preventDefault();
    const defaultStock = Math.max(0, Number(elements.bookImportStock.value || 0));
    const files = [...(elements.bookImportFile.files || [])];
    const importedRows = [];
    let skipped = 0;
    let unsupported = 0;

    for (const file of files) {
      if (/\.(xls|xlsx)$/i.test(file.name)) {
        unsupported += 1;
        continue;
      }
      const parsed = parseBookImportText(await file.text());
      importedRows.push(...parsed.books);
      skipped += parsed.skipped;
    }

    const pastedText = elements.bookImportPaste.value.trim();
    if (pastedText) {
      const parsed = parseBookImportText(pastedText);
      importedRows.push(...parsed.books);
      skipped += parsed.skipped;
    }

    if (!files.length && !pastedText) {
      setBookImportStatus("בחרו קובץ או הדביקו טבלה מאקסל.", "warning");
      showToast("צריך לבחור קובץ או להדביק טבלה");
      return;
    }

    if (!importedRows.length) {
      setBookImportStatus("לא נמצאו שורות עם שם ספר ומחיר.", "warning");
      showToast("לא נמצאו ספרים לייבוא");
      return;
    }

    const result = await persistImportedBooks(importedRows, defaultStock);
    const messages = [
      `נוספו ${result.added} ספרים`,
      `עודכנו ${result.updated} ספרים`
    ];
    if (result.duplicates) messages.push(`אוחדו ${result.duplicates} כפילויות`);
    if (skipped) messages.push(`דולגו ${skipped} שורות לא שלמות`);
    if (unsupported) messages.push(`${unsupported} קבצי Excel לא נקראו; יש לשמור כ-CSV/TSV או להדביק מהאקסל`);
    setBookImportStatus(messages.join(". "), "success");
    elements.bookImportForm.reset();
    elements.bookImportStock.value = defaultStock;
    showToast("ייבוא הספרים הושלם");
  }, "לא הצלחתי לייבא את הספרים. בדוק שהקובץ כולל שם ספר ומחיר."));

  elements.categoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const category = elements.categoryName.value.trim();
    if (!category) return;
    const categories = normalizeCategories([...(state.settings.categories || []), category]);
    pushUndoSnapshot("הוספת קטגוריה");
    await persistSettings({ ...state.settings, categories });
    elements.categoryName.value = "";
    showToast("הקטגוריה נוספה");
  });

  elements.categoryList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-remove-category]");
    if (!button) return;
    const category = button.dataset.removeCategory;
    const categories = normalizeCategories(state.settings.categories).filter((item) => item !== category);
    if (!categories.length) {
      showToast("צריך להשאיר לפחות קטגוריה אחת");
      return;
    }
    pushUndoSnapshot("הסרת קטגוריה");
    await persistSettings({ ...state.settings, categories });
    showToast("הקטגוריה הוסרה מהרשימה");
  });

  elements.addPromoButton.addEventListener("click", () => openPromoDialog());
  elements.promoDialogForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const promo = normalizePromotion({
      id: elements.promoId.value || newId(),
      title: elements.promoTitle.value.trim(),
      details: elements.promoDetailsInput.value.trim(),
      imageUrl: elements.promoImageUrl.value.trim(),
      sortOrder: Number(elements.promoSortOrder.value || 0),
      isActive: elements.promoActive.checked,
      showInSlideshow: elements.promoShowInSlideshow.checked,
      showInBanner: elements.promoShowInBanner.checked
    });
    const promotions = state.settings.promotions.some((item) => item.id === promo.id)
      ? state.settings.promotions.map((item) => item.id === promo.id ? promo : item)
      : [...state.settings.promotions, promo];
    pushUndoSnapshot(state.settings.promotions.some((item) => item.id === promo.id) ? "עריכת מבצע" : "הוספת מבצע");
    await persistSettings({ ...state.settings, promotions });
    elements.promoDialog.close();
    showToast("המבצע נשמר");
  });

  elements.adminPromotionsList.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-promo]");
    if (editButton) {
      const promo = state.settings.promotions.find((item) => item.id === editButton.dataset.editPromo);
      if (promo) openPromoDialog(promo);
      return;
    }
    const removeButton = event.target.closest("[data-remove-promo]");
    if (!removeButton) return;
    const promotions = state.settings.promotions.filter((promo) => promo.id !== removeButton.dataset.removePromo);
    pushUndoSnapshot("מחיקת מבצע");
    await persistSettings({ ...state.settings, promotions });
    showToast("המבצע נמחק");
  });

  elements.addSlideButton.addEventListener("click", () => openSlideDialog());

  elements.slideshowSettingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    pushUndoSnapshot("עדכון תצוגה רצה");
    await persistSettings({
      ...state.settings,
      slideshow: {
        ...state.settings.slideshow,
        enabled: elements.slideshowEnabled.checked,
        idleSeconds: Number(elements.slideshowIdleSeconds.value || 45),
        slideSeconds: Number(elements.slideshowSlideSeconds.value || 6)
      }
    });
    resetIdleTimer();
    showToast("הגדרות התצוגה נשמרו");
  });

  elements.traderBookTitle.addEventListener("input", () => {
    renderSuggestions(elements.traderBookSuggestions, searchBooks(elements.traderBookTitle.value, 6), "trader-book-suggest");
  });

  elements.traderBookSuggestions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-trader-book-suggest]");
    if (!button) return;
    const book = state.books.find((item) => item.id === button.dataset.traderBookSuggest);
    if (!book) return;
    elements.traderBookTitle.value = book.title;
    elements.traderRegularPrice.value = book.price || "";
    hideSuggestions();
  });

  elements.traderPriceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const traderPrice = normalizeTraderPrice({
      id: newId(),
      bookTitle: elements.traderBookTitle.value.trim(),
      dealerName: elements.traderName.value.trim(),
      regularPrice: Number(elements.traderRegularPrice.value || 0),
      dealerPrice: Number(elements.traderDealerPrice.value || 0),
      createdAt: new Date().toISOString()
    });
    if (!traderPrice.bookTitle || !traderPrice.dealerName || !traderPrice.dealerPrice) {
      showToast("צריך למלא ספר, סוחר ומחיר חודש הספר");
      return;
    }
    pushUndoSnapshot("הוספת מחיר חודש הספר");
    state.activeTraderName = traderPrice.dealerName;
    await persistSettings({
      ...state.settings,
      traderPrices: [traderPrice, ...(state.settings.traderPrices || [])]
    });
    elements.traderPriceForm.reset();
    hideSuggestions();
    showToast("מחיר חודש הספר נשמר");
  });

  elements.traderDirectory.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-trader]");
    if (!button) return;
    state.activeTraderName = button.dataset.openTrader || "";
    state.activeTraderBookTitle = "";
    renderTraderPrices();
  });

  elements.closeActiveTrader.addEventListener("click", () => {
    state.activeTraderName = "";
    renderTraderPrices();
  });

  elements.traderBookDirectory.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-trader-book]");
    if (!button) return;
    state.activeTraderBookTitle = button.dataset.openTraderBook || "";
    state.activeTraderName = "";
    renderTraderPrices();
  });

  elements.closeActiveTraderBook.addEventListener("click", () => {
    state.activeTraderBookTitle = "";
    renderTraderPrices();
  });

  elements.traderPricesList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-remove-trader-price]");
    if (!button) return;
    await removeTraderPrice(button.dataset.removeTraderPrice);
  });

  elements.activeTraderPricesList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-remove-trader-price]");
    if (!button) return;
    await removeTraderPrice(button.dataset.removeTraderPrice);
  });

  elements.activeTraderBookPricesList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-remove-trader-price]");
    if (!button) return;
    await removeTraderPrice(button.dataset.removeTraderPrice);
  });

  elements.slideDialogForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const slide = normalizeSlide({
      id: elements.slideId.value || newId(),
      title: elements.slideTitle.value.trim(),
      text: elements.slideText.value.trim(),
      imageUrl: elements.slideImageUrl.value.trim(),
      backgroundColor: elements.slideBgColor.value || "#00a88f",
      durationSeconds: Number(elements.slideDuration.value || 0),
      sortOrder: Number(elements.slideSortOrder.value || 0),
      isActive: elements.slideActive.checked
    });
    const items = state.settings.slideshow.items.some((item) => item.id === slide.id)
      ? state.settings.slideshow.items.map((item) => item.id === slide.id ? slide : item)
      : [...state.settings.slideshow.items, slide];
    pushUndoSnapshot(state.settings.slideshow.items.some((item) => item.id === slide.id) ? "עריכת שקופית" : "הוספת שקופית");
    await persistSettings({ ...state.settings, slideshow: { ...state.settings.slideshow, items } });
    elements.slideDialog.close();
    showToast("השקופית נשמרה");
  });

  elements.slideshowPreviewList.addEventListener("click", runSafely(async (event) => {
    const disableButton = event.target.closest("[data-disable-slideshow-kind]");
    if (!disableButton) return;
    await disableAutoSlideshowItem(disableButton.dataset.disableSlideshowKind, disableButton.dataset.disableSlideshowId);
  }, "לא הצלחתי להסיר את הפריט מהתצוגה הרצה."));

  elements.adminSlidesList.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-slide]");
    if (editButton) {
      const slide = state.settings.slideshow.items.find((item) => item.id === editButton.dataset.editSlide);
      if (slide) openSlideDialog(slide);
      return;
    }
    const removeButton = event.target.closest("[data-remove-slide]");
    if (!removeButton) return;
    const items = state.settings.slideshow.items.filter((slide) => slide.id !== removeButton.dataset.removeSlide);
    pushUndoSnapshot("מחיקת שקופית");
    await persistSettings({ ...state.settings, slideshow: { ...state.settings.slideshow, items } });
    showToast("השקופית נמחקה");
  });

  elements.paymentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    pushUndoSnapshot("עדכון פרטי תשלום");
    await persistSettings({
      ...state.settings,
      payment: {
        bitQrUrl: elements.adminBitQrUrl.value.trim(),
        bitDetails: elements.adminBitDetails.value.trim(),
        bankDetails: elements.adminBankDetails.value.trim(),
        notes: elements.adminPaymentNotes.value.trim()
      }
    });
    showToast("פרטי התשלום נשמרו");
  });

  elements.aboutForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    pushUndoSnapshot("עדכון אודות");
    await persistSettings({
      ...state.settings,
      business: {
        name: elements.adminBusinessName.value.trim(),
        tagline: elements.adminBusinessTagline.value.trim()
      },
      about: {
        title: elements.adminAboutTitle.value.trim(),
        text: elements.adminAboutText.value.trim()
      }
    });
    showToast("פרטי העסק נשמרו");
  });

  [elements.adminNewPin, elements.adminConfirmPin].forEach((input) => {
    input.addEventListener("input", () => {
      input.value = normalizeBarcode(input.value);
    });
  });

  elements.securityForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const newPin = normalizeBarcode(elements.adminNewPin.value);
    const confirmPin = normalizeBarcode(elements.adminConfirmPin.value);
    if (newPin.length < 4) {
      showToast("הסיסמה צריכה לכלול לפחות 4 ספרות");
      return;
    }
    if (newPin !== confirmPin) {
      showToast("שתי הסיסמאות לא זהות");
      return;
    }
    pushUndoSnapshot("עדכון סיסמת ניהול");
    await persistSettings({
      ...state.settings,
      security: {
        ...state.settings.security,
        adminPin: newPin
      }
    });
    elements.securityForm.reset();
    showToast("סיסמת הניהול עודכנה");
  });

  elements.ordersTable.addEventListener("change", async (event) => {
    const statusSelect = event.target.closest("[data-order-status]");
    if (statusSelect) {
      const order = state.orders.find((item) => item.id === statusSelect.dataset.orderStatus);
      if (!order) return;
      pushUndoSnapshot("עדכון סטטוס הזמנה");
      await persistOrder({ ...order, status: statusSelect.value });
      showToast("סטטוס הבקשה עודכן");
      return;
    }

    const paidSelect = event.target.closest("[data-order-paid]");
    if (!paidSelect) return;
    const order = state.orders.find((item) => item.id === paidSelect.dataset.orderPaid);
    if (!order) return;
    pushUndoSnapshot("עדכון תשלום הזמנה");
    await persistOrder({ ...order, isPaid: paidSelect.value === "true" });
    showToast("סימון התשלום עודכן");
  });

  elements.ordersTable.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-delete-order]");
    if (!button) return;
    pushUndoSnapshot("מחיקת הזמנה");
    await deleteOrder(button.dataset.deleteOrder);
    showToast("ההזמנה הוסרה");
  });

  elements.searchOrders.addEventListener("input", renderOrders);
  elements.orderStatusFilter.addEventListener("change", renderOrders);

  elements.invoiceDate.value = todayInputValue();
  updateInvoiceAutoDetect("idle");
  elements.invoiceFile.addEventListener("change", runSafely(async () => {
    const files = [...(elements.invoiceFile.files || [])];
    if (!files.length) {
      updateInvoiceAutoDetect("idle");
      return;
    }
    if (files.length > 1) {
      await importInvoiceFiles(files);
      return;
    }
    const file = files[0];
    const detection = await detectInvoiceFromFile(file);
    applyInvoiceDetection(detection, file);
  }, "לא הצלחתי לבצע זיהוי אוטומטי. אפשר למלא את פרטי החשבונית ידנית."));

  elements.invoiceAutoDetect.addEventListener("dragover", (event) => {
    event.preventDefault();
    elements.invoiceAutoDetect.classList.add("dragging");
  });

  elements.invoiceAutoDetect.addEventListener("dragleave", () => {
    elements.invoiceAutoDetect.classList.remove("dragging");
  });

  elements.invoiceAutoDetect.addEventListener("drop", runSafely(async (event) => {
    event.preventDefault();
    elements.invoiceAutoDetect.classList.remove("dragging");
    const files = [...(event.dataTransfer?.files || [])];
    await importInvoiceFiles(files);
  }, "לא הצלחתי להעלות את החשבוניות בגרירה."));

  elements.invoiceUploadForm.addEventListener("submit", runSafely(async (event) => {
    event.preventDefault();
    await saveInvoiceFromForm();
  }, "לא הצלחתי לשמור את החשבונית. נסו קובץ קטן יותר או נסו שוב."));

  elements.geminiInvoiceForm.addEventListener("submit", runSafely(async (event) => {
    event.preventDefault();
    const apiKey = elements.geminiApiKey.value.trim();
    const file = elements.geminiInvoiceFile.files?.[0];
    if (!apiKey) {
      updateGeminiStatus("warning", "צריך להדביק Gemini API Key לניסוי.");
      return;
    }
    if (!file) {
      updateGeminiStatus("warning", "צריך לבחור חשבונית PDF.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      updateGeminiStatus("warning", "בשלב הניסוי שולחים רק קובץ PDF.");
      return;
    }
    if (file.size > 18 * 1024 * 1024) {
      updateGeminiStatus("warning", "הקובץ גדול מדי לניסוי מהיר. נסו PDF קטן יותר.");
      return;
    }
    elements.geminiOutput.classList.add("hidden");
    elements.geminiOutput.innerHTML = "";
    updateGeminiStatus("loading", "שולח את ה-PDF ל-Gemini וממתין לפענוח...");
    const result = await decodeInvoiceWithGemini(apiKey, file);
    renderGeminiInvoiceResult(result);
    updateGeminiStatus("success", "הפענוח חזר מ-Gemini. בדקו את הנתונים לפני שימוש.");
  }, "לא הצלחתי לקבל פענוח מ-Gemini. בדקו שהמפתח תקין ושהקובץ PDF קריא."));

  elements.invoiceMonthFilter.addEventListener("input", renderInvoices);
  elements.invoiceSupplierFilter.addEventListener("change", renderInvoices);
  elements.invoiceTypeFilter.addEventListener("change", renderInvoices);
  elements.invoiceStatusFilter.addEventListener("change", renderInvoices);
  elements.invoiceList.addEventListener("change", (event) => {
    const statusSelect = event.target.closest("[data-invoice-status]");
    if (!statusSelect) return;
    const invoice = state.invoices.find((item) => item.id === statusSelect.dataset.invoiceStatus);
    if (!invoice || invoice.status === statusSelect.value) return;
    pushUndoSnapshot("שינוי סטטוס חשבונית");
    invoice.status = statusSelect.value;
    saveLocal();
    renderInvoices();
    showToast("סטטוס החשבונית עודכן");
  });
  elements.invoiceList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-invoice]");
    if (!button) return;
    pushUndoSnapshot("מחיקת חשבונית");
    state.invoices = state.invoices.filter((invoice) => invoice.id !== button.dataset.deleteInvoice);
    saveLocal();
    renderInvoices();
    showToast("החשבונית נמחקה");
  });

  elements.exportButton.addEventListener("click", () => {
    const payload = JSON.stringify(
      {
        books: state.books,
        sales: state.sales,
        orders: state.orders,
        invoices: state.invoices,
        settings: state.settings,
        backups: getLocalBackups()
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `book-stand-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });

  elements.importDataButton.addEventListener("click", () => {
    elements.importDataFile.value = "";
    elements.importDataFile.click();
  });

  elements.importDataFile.addEventListener("change", runSafely(async () => {
    const file = elements.importDataFile.files?.[0];
    await importFullDataFile(file);
    elements.importDataFile.value = "";
  }, "לא הצלחתי לייבא את הנתונים. ודא שזה קובץ ייצוא של האפליקציה."));

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".autocomplete-wrap")) hideSuggestions();
  });
}

async function init() {
  bindEvents();
  try {
    const remoteReady = await initSupabaseIfConfigured();
    if (!remoteReady) loadLocal();
    else loadLocalInvoices();
    backupData("startup");
  } catch (error) {
    handleAppError(error, "חיבור מרוחק נכשל. עברתי למצב הדגמה מקומי.");
    state.usingRemote = false;
    loadLocal();
    backupData("startup-after-fallback");
  }
  render();
  switchAdminPanel(state.adminPanel);
  resetIdleTimer();
  scheduleAdminAutoLock();
}

runSafely(init, "לא הצלחתי להפעיל את האפליקציה. נסו לרענן את הדף.")();
