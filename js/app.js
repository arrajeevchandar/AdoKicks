(() => {
  "use strict";

  const STORAGE_KEYS = {
    users: "adokicks_users",
    currentUser: "adokicks_current_user_phone",
    cart: "adokicks_cart",
    wishlist: "adokicks_wishlist",
    orders: "adokicks_orders"
  };

  const CATEGORY_LABELS = {
    training: "Training Shoes",
    running: "Running Shoes",
    multisport: "Multisport Shoes",
    casual: "Casual Shoes",
    sneakers: "Sneakers"
  };

  const state = {
    dataLoaded: false,
    products: [],
    byId: {},
    searchOpen: false,
    cartOpen: false,
    profileOpen: false,
    mobileMenuOpen: false,
    cartInteractionInProgress: false
  };

  const page = document.body.dataset.page || "home";

  function storageGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getUsers() {
    return storageGet(STORAGE_KEYS.users, []);
  }

  function getCurrentUserPhone() {
    return localStorage.getItem(STORAGE_KEYS.currentUser) || "";
  }

  function getCurrentUser() {
    const phone = getCurrentUserPhone();
    if (!phone) {
      return null;
    }
    return getUsers().find((user) => user.phone === phone) || null;
  }

  function getScopedStorageKey(baseKey, phone = getCurrentUserPhone()) {
    return phone ? `${baseKey}_${phone}` : baseKey;
  }

  function mergeCartEntries(existingEntries, guestEntries) {
    const merged = existingEntries.map((entry) => ({ ...entry }));
    guestEntries.forEach((guestEntry) => {
      const target = merged.find((entry) => entry.productId === guestEntry.productId && String(entry.size) === String(guestEntry.size));
      if (target) {
        target.qty += guestEntry.qty;
      } else {
        merged.push({ ...guestEntry });
      }
    });
    return merged;
  }

  function mergeWishlistEntries(existingEntries, guestEntries) {
    return Array.from(new Set([...existingEntries, ...guestEntries]));
  }

  function migrateLegacyAccountData(phone) {
    if (!phone) {
      return;
    }

    const scopedCartKey = getScopedStorageKey(STORAGE_KEYS.cart, phone);
    const scopedWishlistKey = getScopedStorageKey(STORAGE_KEYS.wishlist, phone);
    const guestCart = storageGet(STORAGE_KEYS.cart, []);
    const guestWishlist = storageGet(STORAGE_KEYS.wishlist, []);
    const scopedCart = storageGet(scopedCartKey, []);
    const scopedWishlist = storageGet(scopedWishlistKey, []);

    if (guestCart.length || scopedCart.length || localStorage.getItem(STORAGE_KEYS.cart) !== null) {
      storageSet(scopedCartKey, mergeCartEntries(scopedCart, guestCart));
      localStorage.removeItem(STORAGE_KEYS.cart);
    }

    if (guestWishlist.length || scopedWishlist.length || localStorage.getItem(STORAGE_KEYS.wishlist) !== null) {
      storageSet(scopedWishlistKey, mergeWishlistEntries(scopedWishlist, guestWishlist));
      localStorage.removeItem(STORAGE_KEYS.wishlist);
    }
  }

  function getCart() {
    const key = getScopedStorageKey(STORAGE_KEYS.cart);
    if (!key) {
      return [];
    }
    return storageGet(key, []);
  }

  function setCart(cart) {
    const key = getScopedStorageKey(STORAGE_KEYS.cart);
    if (!key) {
      return;
    }
    storageSet(key, cart);
    updateHeaderBadges();
  }

  function getWishlist() {
    const key = getScopedStorageKey(STORAGE_KEYS.wishlist);
    if (!key) {
      return [];
    }
    return storageGet(key, []);
  }

  function setWishlist(wishlist) {
    const key = getScopedStorageKey(STORAGE_KEYS.wishlist);
    if (!key) {
      return;
    }
    storageSet(key, wishlist);
    updateHeaderBadges();
  }

  function getOrders() {
    return storageGet(STORAGE_KEYS.orders, []);
  }

  function setOrders(orders) {
    storageSet(STORAGE_KEYS.orders, orders);
  }

  function formatCurrency(value) {
    return `Rs ${Number(value).toLocaleString("en-IN")}`;
  }

  function params() {
    return new URLSearchParams(window.location.search);
  }

  function sanitize(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function toast(message, type = "error") {
    let wrap = document.querySelector(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      wrap.setAttribute("aria-live", "assertive");
      wrap.setAttribute("aria-label", "Notifications");
      document.body.appendChild(wrap);
    }
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = message;
    wrap.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 800);
  }

  function mapProducts(source) {
    const all = [];
    ["mens", "womens"].forEach((gender) => {
      const genderBucket = source[gender] || {};
      Object.keys(genderBucket).forEach((category) => {
        (genderBucket[category] || []).forEach((item) => {
          const product = {
            ...item,
            gender,
            category
          };
          all.push(product);
        });
      });
    });
    return all;
  }

  async function loadData() {
    if (state.dataLoaded) {
      return;
    }
    const res = await fetch("shoesrc.json");
    if (!res.ok) {
      throw new Error("Unable to load product data");
    }
    const json = await res.json();
    state.products = mapProducts(json);
    state.byId = Object.fromEntries(state.products.map((p) => [p.id, p]));
    state.dataLoaded = true;
  }

  function productCard(product, showDescription = false) {
    const firstImage = (product.images && product.images[0]) || "adokicks.png";
    const wishActive = isWishlisted(product.id);
    return `
      <article class="product-card" role="listitem" aria-label="${sanitize(product.title)} product card">
        <a href="product.html?id=${encodeURIComponent(product.id)}" aria-label="View ${sanitize(product.title)} details">
          <img src="${sanitize(firstImage)}" alt="${sanitize(product.title)} shoe image" loading="lazy">
        </a>
        <div class="product-content">
          <h3><a href="product.html?id=${encodeURIComponent(product.id)}" aria-label="Open ${sanitize(product.title)} product page">${sanitize(product.title)}</a></h3>
          <p>${sanitize(product.brand)} | ${sanitize(CATEGORY_LABELS[product.category] || product.category)}</p>
          <p class="price-line"><strong>${formatCurrency(product.price)}</strong> <span class="old-price">${formatCurrency(product.originalPrice)}</span></p>
          ${showDescription ? `<p>${sanitize(product.description)}</p>` : ""}
          <div class="price-line card-actions-row">
            <button class="heart-btn ${wishActive ? "active" : ""}" type="button" data-action="wishlist-toggle" data-product-id="${sanitize(product.id)}" aria-label="Toggle wishlist for ${sanitize(product.title)}" title="Wishlist">&#10084;</button>
            <a href="product.html?id=${encodeURIComponent(product.id)}" class="btn-secondary" aria-label="Shop ${sanitize(product.title)}">Shop</a>
          </div>
        </div>
      </article>
    `;
  }

  function totalsFromCart(cartItems) {
    const subtotal = cartItems.reduce((sum, item) => {
      const product = state.byId[item.productId];
      if (!product) {
        return sum;
      }
      return sum + product.price * item.qty;
    }, 0);
    return { subtotal, total: subtotal };
  }

  function isWishlisted(productId) {
    return getWishlist().includes(productId);
  }

  function toggleWishlist(productId) {
    const current = getWishlist();
    if (current.includes(productId)) {
      setWishlist(current.filter((id) => id !== productId));
      toast("Removed from wishlist", "success");
    } else {
      setWishlist([...current, productId]);
      toast("Added to wishlist", "success");
    }
  }

  function addToCart(productId, size, qty = 1) {
    if (!size) {
      toast("Please select a size before adding to bag.");
      return;
    }
    const cart = getCart();
    const existing = cart.find((item) => item.productId === productId && String(item.size) === String(size));
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ productId, size, qty });
    }
    setCart(cart);
    const wishlist = getWishlist();
    if (wishlist.includes(productId)) {
      setWishlist(wishlist.filter((id) => id !== productId));
    }
    toast("Added to bag", "success");
  }

  function updateCartQty(productId, size, delta) {
    state.cartInteractionInProgress = true;
    const cart = getCart();
    const item = cart.find((entry) => entry.productId === productId && String(entry.size) === String(size));
    if (!item) {
      window.requestAnimationFrame(() => {
        state.cartInteractionInProgress = false;
      });
      return;
    }
    item.qty += delta;
    const updated = cart.filter((entry) => entry.qty > 0);
    setCart(updated);
    renderCartDrawer();
    window.requestAnimationFrame(() => {
      state.cartInteractionInProgress = false;
    });
  }

  function removeFromCart(productId, size) {
    state.cartInteractionInProgress = true;
    const cart = getCart().filter((entry) => !(entry.productId === productId && String(entry.size) === String(size)));
    setCart(cart);
    renderCartDrawer();
    window.requestAnimationFrame(() => {
      state.cartInteractionInProgress = false;
    });
  }

  function updateHeaderBadges() {
    const cartCount = getCart().reduce((sum, item) => sum + item.qty, 0);
    const wishCount = getWishlist().length;
    const cartBadges = [document.getElementById("cart-count"), document.getElementById("cart-count-mobile")];
    const wishBadges = [document.getElementById("wish-count"), document.getElementById("wish-count-mobile")];
    cartBadges.forEach((badge) => {
      if (badge) {
        badge.textContent = String(cartCount);
      }
    });
    wishBadges.forEach((badge) => {
      if (badge) {
        badge.textContent = String(wishCount);
      }
    });
  }

  function navLinkClass(href) {
    const map = {
      home: "index.html",
      mens: "mens.html",
      womens: "womens.html",
      featured: "featured.html",
      categories: "categories.html",
      about: "about.html"
    };
    const currentHref = map[page] || "";
    return href === currentHref ? "nav-link active" : "nav-link";
  }

  function syncHeaderOffset() {
    const header = document.querySelector(".site-header");
    const offset = header ? Math.ceil(header.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty("--header-offset", `${offset}px`);
  }

  function closeMobileMenu() {
    state.mobileMenuOpen = false;
    document.body.classList.remove("menu-open");
    const menu = document.getElementById("mobile-menu");
    const backdrop = document.getElementById("mobile-menu-backdrop");
    const button = document.getElementById("mobile-menu-btn");
    if (menu) {
      menu.classList.add("hidden");
    }
    if (backdrop) {
      backdrop.classList.add("hidden");
    }
    if (button) {
      button.setAttribute("aria-expanded", "false");
    }
  }

  function toggleMobileMenu(forceOpen) {
    const menu = document.getElementById("mobile-menu");
    const backdrop = document.getElementById("mobile-menu-backdrop");
    const button = document.getElementById("mobile-menu-btn");
    if (!menu || !backdrop || !button) {
      return;
    }

    const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : !state.mobileMenuOpen;
    state.mobileMenuOpen = shouldOpen;
    document.body.classList.toggle("menu-open", shouldOpen);
    menu.classList.toggle("hidden", !shouldOpen);
    backdrop.classList.toggle("hidden", !shouldOpen);
    button.setAttribute("aria-expanded", shouldOpen ? "true" : "false");

    if (shouldOpen) {
      state.searchOpen = false;
      state.cartOpen = false;
      state.profileOpen = false;
      const search = document.getElementById("search-pop");
      const drawer = document.getElementById("cart-drawer");
      const profileMenu = document.getElementById("profile-menu");
      if (search) {
        search.classList.add("hidden");
      }
      if (drawer) {
        drawer.classList.add("hidden");
      }
      if (profileMenu) {
        profileMenu.classList.add("hidden");
      }
    }
  }

  function renderHeader() {
    const mount = document.getElementById("app-header");
    if (!mount) {
      return;
    }
    const user = getCurrentUser();
    const navItems = [
      { href: "index.html", label: "Home", aria: "Home page" },
      { href: "mens.html", label: "Mens", aria: "Men shoes page" },
      { href: "womens.html", label: "Womens", aria: "Women shoes page" },
      { href: "featured.html", label: "Featured", aria: "Featured shoes page" },
      { href: "categories.html", label: "Categories", aria: "Categories page" },
      { href: "about.html", label: "About Us", aria: "About us page" }
    ];
    const navLinks = navItems
      .map((item) => `<a class="${navLinkClass(item.href)}" href="${item.href}" aria-label="${item.aria}">${item.label}</a>`)
      .join("");
    mount.innerHTML = `
      <div class="site-header">
        <nav class="nav-inner" role="navigation" aria-label="Main navigation">
          <div class="nav-brand">
            <a class="brand-link" href="index.html" aria-label="Go to home page">
              <span class="logo-link" aria-hidden="true">
                <img src="adokicks.png" alt="">
              </span>
              <span class="brand-copy">
                <span class="brand-name">Adokicks</span>
                <span class="brand-tagline">Premium sneaker studio</span>
              </span>
            </a>
          </div>
          <div class="nav-desktop">
            <div class="nav-links">
              ${navLinks}
            </div>
            <div class="nav-actions">
              <button id="open-search" class="icon-btn nav-icon-btn" type="button" aria-label="Open product search" title="Search">
                <img src="assests/icons/search-button-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg">
              </button>
              <a href="wishlist.html" class="icon-btn nav-icon-btn" aria-label="Open wishlist" title="Wishlist">
                <img src="assests/icons/heart-alt-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg">
                <span id="wish-count" class="icon-count">0</span>
              </a>
              <button id="open-cart" class="icon-btn nav-icon-btn" type="button" aria-label="Open cart sidebar" title="Cart">
                <img src="assests/icons/cart-shopping-fast-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg">
                <span id="cart-count" class="icon-count">0</span>
              </button>
              ${
                user
                  ? `<div class="profile-wrap"><button id="profile-btn" class="profile-avatar" type="button" aria-label="Profile menu">${sanitize(user.name[0].toUpperCase())}</button></div>`
                  : `<a href="auth.html" class="btn-primary" aria-label="Sign in">Sign In</a>`
              }
            </div>
          </div>
          <div class="nav-mobile-actions" aria-label="Mobile quick actions">
            <button id="open-search-mobile" class="icon-btn nav-icon-btn nav-mobile-icon" type="button" aria-label="Open product search" title="Search">
              <img src="assests/icons/search-button-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg">
            </button>
            <button id="open-cart-mobile" class="icon-btn nav-icon-btn nav-mobile-icon" type="button" aria-label="Open cart sidebar" title="Cart">
              <img src="assests/icons/cart-shopping-fast-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg">
              <span id="cart-count-mobile" class="icon-count">0</span>
            </button>
            ${
              user
                ? `<button id="profile-btn-mobile" class="icon-btn nav-icon-btn nav-mobile-icon nav-auth-icon" type="button" aria-label="Profile menu" title="Profile"><img src="assests/icons/person-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg"></button>`
                : `<a href="auth.html" class="icon-btn nav-icon-btn nav-mobile-icon nav-auth-icon" aria-label="Sign in" title="Sign in"><img src="assests/icons/person-svgrepo-com.svg" alt="" aria-hidden="true" class="nav-icon-svg"></a>`
            }
            <button id="mobile-menu-btn" class="icon-btn nav-icon-btn menu-toggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu">
              <span class="menu-toggle-lines" aria-hidden="true"><span></span><span></span><span></span></span>
            </button>
          </div>
        </nav>
        <div id="mobile-menu-backdrop" class="mobile-menu-backdrop hidden" aria-hidden="true"></div>
        <aside id="mobile-menu" class="mobile-menu hidden" aria-label="Mobile navigation">
          <div class="mobile-menu-head">
            <div>
              <p class="mobile-menu-kicker">Menu</p>
              <h2>Browse Adokicks</h2>
            </div>
            <button id="mobile-menu-close" class="btn-close" type="button" aria-label="Close menu">✕</button>
          </div>
          <div class="mobile-menu-links">
            ${navItems.map((item) => `<a class="mobile-menu-link" href="${item.href}" aria-label="${item.aria}">${item.label}</a>`).join("")}
            <a class="mobile-menu-link" href="wishlist.html" aria-label="Open wishlist">Wishlist</a>
          </div>
        </aside>
      </div>
    `;
    updateHeaderBadges();

    const mobileMenuBtn = document.getElementById("mobile-menu-btn");
    const mobileMenuClose = document.getElementById("mobile-menu-close");
    const mobileMenuBackdrop = document.getElementById("mobile-menu-backdrop");
    const searchBtn = document.getElementById("open-search");
    const cartBtn = document.getElementById("open-cart");
    const profileBtn = document.getElementById("profile-btn");
    const searchBtnMobile = document.getElementById("open-search-mobile");
    const cartBtnMobile = document.getElementById("open-cart-mobile");
    const profileBtnMobile = document.getElementById("profile-btn-mobile");

    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener("click", () => toggleMobileMenu());
    }
    if (mobileMenuClose) {
      mobileMenuClose.addEventListener("click", () => closeMobileMenu());
    }
    if (mobileMenuBackdrop) {
      mobileMenuBackdrop.addEventListener("click", () => closeMobileMenu());
    }
    if (searchBtn) {
      searchBtn.addEventListener("click", toggleSearchPopup);
    }
    if (searchBtnMobile) {
      searchBtnMobile.addEventListener("click", toggleSearchPopup);
    }
    if (cartBtn) {
      cartBtn.addEventListener("click", toggleCartDrawer);
    }
    if (cartBtnMobile) {
      cartBtnMobile.addEventListener("click", toggleCartDrawer);
    }
    if (profileBtn) {
      profileBtn.addEventListener("click", toggleProfileMenu);
    }
    if (profileBtnMobile) {
      profileBtnMobile.addEventListener("click", toggleProfileMenu);
    }

    syncHeaderOffset();
    window.requestAnimationFrame(syncHeaderOffset);
    window.addEventListener("resize", () => {
      syncHeaderOffset();
      if (window.innerWidth > 900) {
        closeMobileMenu();
      }
    });
  }

  function renderFooter() {
    const mount = document.getElementById("app-footer");
    if (!mount) {
      return;
    }
    mount.innerHTML = `
      <div class="site-footer">
        <div class="footer-inner">
          <section aria-label="Quick links">
            <h3>Quick Links</h3>
            <ul>
              <li><a href="index.html" aria-label="Go to home">Home</a></li>
              <li><a href="mens.html" aria-label="Go to mens">Mens</a></li>
              <li><a href="womens.html" aria-label="Go to womens">Womens</a></li>
              <li><a href="featured.html" aria-label="Go to featured">Featured</a></li>
            </ul>
          </section>
          <section aria-label="Legal links">
            <h3>Legal</h3>
            <ul>
              <li><a href="about.html" aria-label="View terms and policy details">Terms and Conditions</a></li>
              <li><a href="about.html" aria-label="View privacy policy details">Privacy Policy</a></li>
              <li><a href="about.html" aria-label="View returns policy">Returns Policy</a></li>
            </ul>
          </section>
          <section aria-label="Social links">
            <h3>Follow Us</h3>
            <ul>
              <li>
                <a class="social-link" href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Visit Adokicks Instagram">
                  <span class="social-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" role="img" focusable="false" aria-hidden="true">
                      <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"></rect>
                      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"></circle>
                      <circle cx="17.1" cy="6.9" r="1.2" fill="currentColor"></circle>
                    </svg>
                  </span>
                  <span class="social-label">Instagram</span>
                </a>
              </li>
              <li>
                <a class="social-link" href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Visit Adokicks Facebook">
                  <span class="social-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" role="img" focusable="false" aria-hidden="true">
                      <path d="M14 8.5h2.2V6H14c-2.1 0-3.8 1.7-3.8 3.8V12H8v2.5h2.2V20h2.6v-5.5H15l.4-2.5h-2.6V10c0-.8.4-1.5 1.2-1.5Z" fill="currentColor"></path>
                    </svg>
                  </span>
                  <span class="social-label">Facebook</span>
                </a>
              </li>
            </ul>
          </section>
          <section aria-label="Contact details">
            <h3>Contact Us</h3>
            <ul>
              <li><a href="mailto:care@adokicks.com" aria-label="Email support">care@adokicks.com</a></li>
              <li><a href="tel:+919999999999" aria-label="Call customer support">+91 99999 99999</a></li>
              <li>Mon-Sat | 9 AM - 8 PM</li>
            </ul>
          </section>
        </div>
      </div>
    `;
  }

  function ensureOverlayContainers() {
    if (!document.getElementById("search-backdrop")) {
      const backdrop = document.createElement("div");
      backdrop.id = "search-backdrop";
      backdrop.className = "search-backdrop hidden";
      backdrop.setAttribute("aria-hidden", "true");
      document.body.appendChild(backdrop);
    }

    if (!document.getElementById("search-pop")) {
      const search = document.createElement("section");
      search.id = "search-pop";
      search.className = "search-pop hidden";
      search.setAttribute("role", "dialog");
      search.setAttribute("aria-label", "Quick product search");
      search.innerHTML = `
        <form id="quick-search-form" aria-label="Quick search form">
          <div class="search-pop-head">
            <div>
              <p class="search-pop-kicker">Search</p>
              <h2>Find a product</h2>
            </div>
            <button id="close-search" class="btn-close search-close-btn" type="button" aria-label="Close search popup">✕</button>
          </div>
          <label class="search-input-label" for="quick-search-input">Search shoes</label>
          <div class="search-input-shell">
            <img src="assests/icons/search-button-svgrepo-com.svg" alt="" aria-hidden="true" class="search-input-icon">
            <input id="quick-search-input" type="search" aria-label="Search product by title, brand, or category" placeholder="Type product name, brand, or category">
          </div>
          <div class="search-pop-actions">
            <button class="btn-primary" type="submit" aria-label="View full search results">Search</button>
          </div>
          <div id="quick-results" class="quick-results" aria-label="Quick search results" role="list"></div>
        </form>
      `;
      document.body.appendChild(search);
    }

    if (!document.getElementById("cart-drawer")) {
      const cart = document.createElement("aside");
      cart.id = "cart-drawer";
      cart.className = "cart-drawer hidden";
      cart.setAttribute("aria-label", "Shopping cart sidebar");
      cart.innerHTML = `
        <div class="drawer-head">
          <div class="drawer-head-content">
            <h2>Your Bag</h2>
            <span id="cart-item-count" class="cart-count-badge">0</span>
          </div>
          <button id="close-cart" class="btn-close" type="button" aria-label="Close cart">✕</button>
        </div>
        <div id="cart-items" class="cart-items" aria-label="Items in cart"></div>
        <div id="cart-footer" class="drawer-foot" aria-label="Cart total and checkout"></div>
      `;
      document.body.appendChild(cart);
    }

    if (getCurrentUser() && !document.getElementById("profile-menu")) {
      const menu = document.createElement("div");
      menu.id = "profile-menu";
      menu.className = "profile-menu hidden";
      menu.innerHTML = `
        <a href="my-orders.html" aria-label="View my orders">My Orders</a>
        <button id="logout-btn" type="button" aria-label="Logout">Logout</button>
      `;
      document.body.appendChild(menu);
    }
  }

  function toggleSearchPopup() {
    const panel = document.getElementById("search-pop");
    const backdrop = document.getElementById("search-backdrop");
    if (!panel) {
      return;
    }
    closeMobileMenu();
    state.searchOpen = !state.searchOpen;
    panel.classList.toggle("hidden", !state.searchOpen);
    if (backdrop) {
      backdrop.classList.toggle("hidden", !state.searchOpen);
    }
    document.body.classList.toggle("search-open", state.searchOpen);
    if (state.searchOpen) {
      const input = document.getElementById("quick-search-input");
      if (input) {
        input.focus();
      }
      state.cartOpen = false;
      const cart = document.getElementById("cart-drawer");
      if (cart) {
        cart.classList.add("hidden");
      }
    }
  }

  function quickSearch(query) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return [];
    }
    return state.products
      .filter((item) => `${item.title} ${item.brand} ${item.category}`.toLowerCase().includes(normalized))
      .slice(0, 7);
  }

  function bindSearchPopup() {
    const form = document.getElementById("quick-search-form");
    const input = document.getElementById("quick-search-input");
    const close = document.getElementById("close-search");
    const quickResults = document.getElementById("quick-results");
    const backdrop = document.getElementById("search-backdrop");
    if (!form || !input || !close || !quickResults) {
      return;
    }

    input.addEventListener("input", () => {
      const results = quickSearch(input.value);
      if (!results.length) {
        quickResults.innerHTML = input.value.trim()
          ? "<p class='search-empty'>No matching shoes.</p>"
          : "";
        return;
      }
      quickResults.innerHTML = results
        .map(
          (item) => `
            <a class="quick-item" href="product.html?id=${encodeURIComponent(item.id)}" role="listitem" aria-label="Open ${sanitize(item.title)}">
              <img src="${sanitize(item.images[0] || "adokicks.png")}" alt="${sanitize(item.title)} image">
              <span class="quick-item-copy">
                <strong>${sanitize(item.title)}</strong>
                <small>${sanitize(item.brand)} • ${sanitize(CATEGORY_LABELS[item.category] || item.category)}</small>
              </span>
              <strong class="quick-item-price">${formatCurrency(item.price)}</strong>
            </a>
          `
        )
        .join("");
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        const q = input.value.trim();
        if (q) {
          window.location.href = `search.html?q=${encodeURIComponent(q)}`;
        }
      }
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const q = input.value.trim();
      if (!q) {
        toast("Type something to search");
        return;
      }
      window.location.href = `search.html?q=${encodeURIComponent(q)}`;
    });

    close.addEventListener("click", () => {
      state.searchOpen = false;
      document.getElementById("search-pop").classList.add("hidden");
      const backdropEl = document.getElementById("search-backdrop");
      if (backdropEl) {
        backdropEl.classList.add("hidden");
      }
      document.body.classList.remove("search-open");
    });

    if (backdrop) {
      backdrop.addEventListener("click", () => {
        state.searchOpen = false;
        document.getElementById("search-pop").classList.add("hidden");
        backdrop.classList.add("hidden");
        document.body.classList.remove("search-open");
      });
    }

    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        state.searchOpen = false;
        document.getElementById("search-pop").classList.add("hidden");
        if (backdrop) {
          backdrop.classList.add("hidden");
        }
        document.body.classList.remove("search-open");
      }
    });
  }

  function toggleCartDrawer() {
    const drawer = document.getElementById("cart-drawer");
    if (!drawer) {
      return;
    }
    closeMobileMenu();
    state.cartOpen = !state.cartOpen;
    drawer.classList.toggle("hidden", !state.cartOpen);
    if (state.cartOpen) {
      renderCartDrawer();
      state.searchOpen = false;
      const search = document.getElementById("search-pop");
      if (search) {
        search.classList.add("hidden");
      }
    }
  }

  function renderCartDrawer() {
    const itemsWrap = document.getElementById("cart-items");
    const footer = document.getElementById("cart-footer");
    const countBadge = document.getElementById("cart-item-count");
    if (!itemsWrap || !footer) {
      return;
    }
    const cart = getCart().filter((item) => state.byId[item.productId]);
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    if (countBadge) {
      countBadge.textContent = totalItems;
    }
    if (!cart.length) {
      itemsWrap.innerHTML = `<div class="empty-cart"><p>Your bag is empty</p><p class="empty-cart-subtext">Add some stylish kicks to get started!</p></div>`;
      footer.innerHTML = `<div class="cart-summary"><p>Subtotal: <strong>${formatCurrency(0)}</strong></p></div><button class="btn-primary" type="button" disabled aria-label="Checkout disabled">Checkout</button>`;
      return;
    }
    itemsWrap.innerHTML = cart
      .map((item) => {
        const product = state.byId[item.productId];
        const itemTotal = product.price * item.qty;
        return `
          <article class="cart-item" aria-label="${sanitize(product.title)} in cart">
            <div class="cart-item-image">
              <img src="${sanitize(product.images[0] || "adokicks.png")}" alt="${sanitize(product.title)} cart image">
            </div>
            <div class="cart-item-content">
              <div class="cart-item-header">
                <h3>${sanitize(product.title)}</h3>
                <button class="btn-remove" type="button" data-action="cart-remove" data-product-id="${sanitize(item.productId)}" data-size="${sanitize(item.size)}" aria-label="Remove item">✕</button>
              </div>
              <p class="cart-item-meta">Size: <strong>${sanitize(item.size)}</strong></p>
              <div class="cart-item-footer">
                <div class="qty-control" aria-label="Quantity controls for ${sanitize(product.title)}">
                  <button type="button" data-action="cart-dec" data-product-id="${sanitize(item.productId)}" data-size="${sanitize(item.size)}" aria-label="Decrease quantity">−</button>
                  <span class="qty-value">${item.qty}</span>
                  <button type="button" data-action="cart-inc" data-product-id="${sanitize(item.productId)}" data-size="${sanitize(item.size)}" aria-label="Increase quantity">+</button>
                </div>
                <div class="cart-item-price">
                  <p class="price-unit">${formatCurrency(product.price)} each</p>
                  <p class="price-total">${formatCurrency(itemTotal)}</p>
                </div>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    const totals = totalsFromCart(cart);
    footer.innerHTML = `
      <div class="cart-summary">
        <div class="summary-row"><span>Subtotal:</span><strong>${formatCurrency(totals.subtotal)}</strong></div>
        <div class="summary-row"><span>Items:</span><strong>${totalItems}</strong></div>
      </div>
      <button id="cart-checkout" class="btn-primary btn-checkout" type="button" aria-label="Proceed to checkout">Proceed to Checkout</button>
    `;
    const checkoutBtn = document.getElementById("cart-checkout");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", () => {
        if (!getCurrentUser()) {
          window.location.href = "auth.html?redirect=checkout.html&notice=please_login";
          return;
        }
        window.location.href = "checkout.html";
      });
    }
  }

  function toggleProfileMenu() {
    const menu = document.getElementById("profile-menu");
    if (!menu) {
      return;
    }
    closeMobileMenu();
    state.profileOpen = !state.profileOpen;
    menu.classList.toggle("hidden", !state.profileOpen);
  }

  function bindGlobalClicks() {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const mobileSearchBtn = document.getElementById("open-search-mobile");
      const mobileCartBtn = document.getElementById("open-cart-mobile");
      const mobileProfileBtn = document.getElementById("profile-btn-mobile");

      const mobileActionTarget = target.closest("[data-mobile-action]");
      if (mobileActionTarget instanceof HTMLElement) {
        const mobileAction = mobileActionTarget.dataset.mobileAction;
        if (mobileAction === "search") {
          closeMobileMenu();
          toggleSearchPopup();
          return;
        }
        if (mobileAction === "cart") {
          closeMobileMenu();
          toggleCartDrawer();
          return;
        }
        if (mobileAction === "profile") {
          closeMobileMenu();
          toggleProfileMenu();
          return;
        }
        if (mobileAction === "logout") {
          closeMobileMenu();
          localStorage.removeItem(STORAGE_KEYS.currentUser);
          toast("You have been logged out", "success");
          window.location.href = "index.html";
          return;
        }
      }

      if (target.id === "mobile-menu-backdrop" || target.id === "mobile-menu-close") {
        closeMobileMenu();
        return;
      }

      const action = target.dataset.action;
      if (action === "wishlist-toggle") {
        const productId = target.dataset.productId;
        if (productId) {
          toggleWishlist(productId);
          rerenderCurrentPage();
        }
        return;
      }

      if (action === "add-to-cart") {
        const productId = target.dataset.productId;
        const size = target.dataset.size || "";
        if (productId) {
          addToCart(productId, size, 1);
        }
        return;
      }

      if (action === "cart-inc") {
        updateCartQty(target.dataset.productId || "", target.dataset.size || "", 1);
        return;
      }

      if (action === "cart-dec") {
        updateCartQty(target.dataset.productId || "", target.dataset.size || "", -1);
        return;
      }

      if (action === "cart-remove") {
        removeFromCart(target.dataset.productId || "", target.dataset.size || "");
        return;
      }

      const closeCart = target.id === "close-cart";
      if (closeCart) {
        state.cartOpen = false;
        const drawer = document.getElementById("cart-drawer");
        if (drawer) {
          drawer.classList.add("hidden");
        }
      }

      if (target.id === "logout-btn") {
        localStorage.removeItem(STORAGE_KEYS.currentUser);
        toast("You have been logged out", "success");
        window.location.href = "index.html";
      }
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const search = document.getElementById("search-pop");
      const searchBtn = document.getElementById("open-search");
      const searchBtnMobile = document.getElementById("open-search-mobile");
      const searchTrigger = (searchBtn && searchBtn.contains(target)) || (searchBtnMobile && searchBtnMobile.contains(target));
      if (state.searchOpen && search && !search.contains(target) && !searchTrigger) {
        state.searchOpen = false;
        search.classList.add("hidden");
      }

      const profileMenu = document.getElementById("profile-menu");
      const profileBtn = document.getElementById("profile-btn");
      const profileBtnMobile = document.getElementById("profile-btn-mobile");
      const profileTrigger = (profileBtn && profileBtn.contains(target)) || (profileBtnMobile && profileBtnMobile.contains(target));
      if (state.profileOpen && profileMenu && !profileMenu.contains(target) && !profileTrigger) {
        state.profileOpen = false;
        profileMenu.classList.add("hidden");
      }

      const cartDrawer = document.getElementById("cart-drawer");
      const cartBtn = document.getElementById("open-cart");
      const cartBtnMobile = document.getElementById("open-cart-mobile");
      const cartTrigger = (cartBtn && cartBtn.contains(target)) || (cartBtnMobile && cartBtnMobile.contains(target));
      if (state.cartInteractionInProgress) {
        return;
      }
      if (state.cartOpen && cartDrawer && !cartDrawer.contains(target) && !cartTrigger) {
        state.cartOpen = false;
        cartDrawer.classList.add("hidden");
      }
    });
  }

  function renderHome() {
    const hero = document.getElementById("home-hero");
    const trending = document.getElementById("home-trending");
    const genderBanners = document.getElementById("home-gender-banners");
    const about = document.getElementById("home-about");
    const benefits = document.getElementById("home-benefits");
    if (!hero || !trending || !genderBanners || !about || !benefits) {
      return;
    }

    const slides = [
      { title: "Engineered for Distance", subtitle: "Run further in comfort with responsive cushioning." },
      { title: "Built for Daily Grind", subtitle: "Training pairs made for impact, support, and control." },
      { title: "Street to Studio", subtitle: "Lifestyle silhouettes with all-day movement comfort." }
    ];
    let current = 0;
    let paused = false;

    hero.innerHTML = `
      <article class="hero" aria-label="Video hero carousel">
        <video id="hero-video" src="carousal%20video.mov" autoplay muted loop playsinline preload="metadata" aria-label="Adokicks featured hero video"></video>
        <div class="hero-overlay">
          <h1 id="hero-title">${slides[0].title}</h1>
          <p id="hero-subtitle">${slides[0].subtitle}</p>
          <div class="hero-controls" role="group" aria-label="Hero carousel controls">
            <button id="hero-pause" class="icon-toggle-btn" type="button" aria-label="Pause hero video" title="Pause video">&#10074;&#10074;</button>
          </div>
        </div>
      </article>
    `;

    function syncSlide() {
      const title = document.getElementById("hero-title");
      const subtitle = document.getElementById("hero-subtitle");
      if (title) {
        title.textContent = slides[current].title;
      }
      if (subtitle) {
        subtitle.textContent = slides[current].subtitle;
      }
    }

    document.getElementById("hero-pause").addEventListener("click", () => {
      const video = document.getElementById("hero-video");
      if (!(video instanceof HTMLVideoElement)) {
        return;
      }
      const pauseBtn = document.getElementById("hero-pause");
      paused = !paused;
      if (paused) {
        video.pause();
        if (pauseBtn) {
          pauseBtn.innerHTML = "&#9658;";
          pauseBtn.setAttribute("aria-label", "Play hero video");
          pauseBtn.setAttribute("title", "Play video");
        }
      } else {
        video.play().catch(() => {});
        if (pauseBtn) {
          pauseBtn.innerHTML = "&#10074;&#10074;";
          pauseBtn.setAttribute("aria-label", "Pause hero video");
          pauseBtn.setAttribute("title", "Pause video");
        }
      }
    });

    setInterval(() => {
      if (paused) {
        return;
      }
      current = (current + 1) % slides.length;
      syncSlide();
    }, 4200);

    const trendingSource = [...state.products].sort((a, b) => (b.rating || 0) * (b.reviews || 0) - (a.rating || 0) * (a.reviews || 0));
    const width = window.innerWidth || 1200;
    const trendingColumns = width <= 480 ? 1 : width <= 680 ? 2 : width <= 1024 ? 3 : width <= 1600 ? 4 : 6;
    const trendingRows = width <= 680 ? 6 : 3;
    const trendingCount = Math.min(trendingSource.length, trendingColumns * trendingRows);
    const trendingItems = trendingSource.slice(0, trendingCount);

    trending.innerHTML = `
      <div class="section-card trending-wrap">
        <div class="trending-head">
          <h2>Trending Now</h2>
          <p>Top picks flying off the shelves right now.</p>
        </div>
        <div class="product-grid trending-grid" role="list" aria-label="Trending products">
          ${trendingItems.map((product) => productCard(product)).join("")}
        </div>
      </div>
    `;

    const menHero = state.products.find((item) => item.gender === "mens");
    const womenHero =
      state.products.find((item) => item.title === "Converse Chuck 70 Hi Women's") ||
      state.products.find((item) => item.gender === "womens");

    genderBanners.innerHTML = `
      <div class="banner-row">
        <a class="gender-banner men-banner" href="mens.html" aria-label="Shop men shoes">
          <img src="assests/banner/mens.png" alt="Men shoes collection banner">
          <div class="banner-text">
            <h2>Men's Collection</h2>
            <p>Power, pace, and purpose-built fits.</p>
          </div>
        </a>
        <a class="gender-banner women-banner" href="womens.html" aria-label="Shop women shoes">
          <img src="assests/banner/womens.png" alt="Women shoes collection banner">
          <div class="banner-text">
            <h2>Women's Collection</h2>
            <p>Elegant design with all-day performance.</p>
          </div>
        </a>
      </div>
    `;

    about.innerHTML = `
      <article class="about-strip section-card" aria-label="About Adokicks preview">
        <h2>Composed Originality</h2>
        <p>From performance training to street aesthetics, every Adokicks silhouette balances function and style with premium construction details.</p>
        <div class="about-strip-grid" aria-hidden="true">
          <div class="about-image-panel">
            <img src="assests/mens/multisport/m-ms-001/img-01.png" alt="Adokicks craft visual one">
            <span>Bold Street Rhythm</span>
          </div>
          <div class="about-image-panel">
            <img src="assests/mens/casual/m-ca-001/img-01.png" alt="Adokicks craft visual two">
            <span>Clean Motion Craft</span>
          </div>
          <div class="about-image-panel">
            <img src="assests/womens/training/w-tr-001/img-02.jpeg" alt="Adokicks craft visual three">
            <span>Sharp Urban Precision</span>
          </div>
        </div>
        
      </article>
    `;

  }

  function buildCatalogFilters(products, includeGender) {
    const categories = [...new Set(products.map((item) => item.category))].sort();
    const sizes = [...new Set(products.flatMap((item) => item.sizes || []))].sort((a, b) => Number(a) - Number(b));
    const brands = [...new Set(products.map((item) => item.brand))].sort();
    const maxPrice = Math.max(...products.map((item) => item.price));

    return {
      categories,
      sizes,
      brands,
      maxPrice,
      includeGender
    };
  }

  function getCatalogDefaults(filtersMeta, includeGender) {
    const query = params();
    const selectedCategories = new Set();
    const selectedSizes = new Set();
    const selectedBrands = new Set();

    const categoryQuery = query.get("category") || query.get("categories") || "";
    categoryQuery
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((category) => {
        if (filtersMeta.categories.includes(category)) {
          selectedCategories.add(category);
        }
      });

    const sizeQuery = query.get("size") || query.get("sizes") || "";
    sizeQuery
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((size) => {
        if (filtersMeta.sizes.includes(Number(size)) || filtersMeta.sizes.includes(size)) {
          selectedSizes.add(String(size));
        }
      });

    const brandQuery = query.get("brand") || query.get("brands") || "";
    brandQuery
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((brand) => {
        if (filtersMeta.brands.includes(brand)) {
          selectedBrands.add(brand);
        }
      });

    const requestedMinPrice = Number(query.get("minPrice"));
    const requestedMaxPrice = Number(query.get("maxPrice"));
    const selectedMinPrice = Number.isFinite(requestedMinPrice) && requestedMinPrice >= 0 ? Math.min(requestedMinPrice, filtersMeta.maxPrice) : 0;
    const selectedMaxPrice = Number.isFinite(requestedMaxPrice) && requestedMaxPrice > 0 ? Math.min(requestedMaxPrice, filtersMeta.maxPrice) : filtersMeta.maxPrice;
    const requestedGender = query.get("gender");

    return {
      minPrice: Math.min(selectedMinPrice, selectedMaxPrice),
      maxPrice: selectedMaxPrice,
      categories: selectedCategories,
      sizes: selectedSizes,
      brands: selectedBrands,
      gender: includeGender && (requestedGender === "mens" || requestedGender === "womens") ? requestedGender : "all"
    };
  }

  function renderCatalogPage(products, includeGender = false) {
    const panel = document.getElementById("filter-panel");
    const grid = document.getElementById("product-grid");
    const gridSection = document.getElementById("product-grid-section");
    if (!panel || !grid || !gridSection) {
      return;
    }

    const heading = gridSection.querySelector("h1");
    if (heading && !gridSection.querySelector(".catalog-title-row")) {
      const row = document.createElement("div");
      row.className = "catalog-title-row";

      const toggleBtn = document.createElement("button");
      toggleBtn.id = "catalog-filter-toggle";
      toggleBtn.type = "button";
      toggleBtn.className = "catalog-filter-toggle";
      toggleBtn.setAttribute("aria-label", "Toggle filters");
      toggleBtn.setAttribute("aria-controls", "filter-panel");
      toggleBtn.setAttribute("aria-expanded", "false");
      toggleBtn.innerHTML = `<img src="assests/icons/filter-svgrepo-com.svg" alt="" aria-hidden="true">`;

      heading.parentNode.insertBefore(row, heading);
      row.appendChild(heading);
      row.appendChild(toggleBtn);
    }

    const filtersMeta = buildCatalogFilters(products, includeGender);
    const selected = getCatalogDefaults(filtersMeta, includeGender);

    function renderPriceRangeControls(suffix = "") {
      const idSuffix = suffix ? `-${suffix}` : "";
      return `
        <div class="price-range-stack">
          <div class="price-range-input-row">
            <div class="price-range-control">
              <label for="min-price${idSuffix}">Minimum amount</label>
              <input id="min-price${idSuffix}" type="number" min="0" max="${filtersMeta.maxPrice}" step="100" value="${selected.minPrice}" aria-label="Minimum price amount">
            </div>
            <div class="price-range-control">
              <label for="max-price${idSuffix}">Maximum amount</label>
              <input id="max-price${idSuffix}" type="number" min="0" max="${filtersMeta.maxPrice}" step="100" value="${selected.maxPrice}" aria-label="Maximum price amount">
            </div>
          </div>
          <div class="price-range-dual" data-price-range>
            <div class="price-range-track" aria-hidden="true"></div>
            <div class="price-range-progress" aria-hidden="true"></div>
            <input id="min-price-slider${idSuffix}" class="price-range-slider price-range-slider-min" type="range" min="0" max="${filtersMeta.maxPrice}" step="100" value="${selected.minPrice}" aria-label="Minimum price slider">
            <input id="max-price-slider${idSuffix}" class="price-range-slider price-range-slider-max" type="range" min="0" max="${filtersMeta.maxPrice}" step="100" value="${selected.maxPrice}" aria-label="Maximum price slider">
          </div>
          <div class="range-scale"><span>${formatCurrency(0)}</span><span>${formatCurrency(filtersMeta.maxPrice)}</span></div>
        </div>
      `;
    }

    function renderMobileDropdownGroup(groupName, label, options, allLabel) {
      const allOption = { value: "all", label: allLabel };
      const allOptions = [allOption, ...options];
      const optionButtons = allOptions
        .map(
          (option, index) =>
            `<button type="button" class="mobile-filter-option${index === 0 ? " is-active" : ""}" data-mobile-filter-option="${groupName}" data-value="${sanitize(option.value)}" data-label="${sanitize(option.label)}" aria-pressed="${index === 0 ? "true" : "false"}">${sanitize(option.label)}</button>`
        )
        .join("");

      return `
        <section class="mobile-filter-group" aria-label="${sanitize(label)} filter options" data-mobile-filter-group="${groupName}">
          <label class="mobile-filter-label" for="mobile-dropdown-${groupName}">${sanitize(label)}</label>
          <button id="mobile-dropdown-${groupName}" type="button" class="mobile-filter-dropdown-trigger" data-mobile-filter-trigger="${groupName}" aria-haspopup="listbox" aria-expanded="false" aria-controls="mobile-option-list-${groupName}">
            <span class="mobile-filter-dropdown-value" data-mobile-filter-value="${groupName}">${sanitize(allLabel)}</span>
          </button>
          <div id="mobile-option-list-${groupName}" class="mobile-filter-dropdown-list hidden" role="listbox" aria-label="${sanitize(label)} options">
            ${optionButtons}
          </div>
        </section>
      `;
    }

    const mobileGenderGroup = includeGender
      ? renderMobileDropdownGroup(
          "gender",
          "Gender",
          [
            { value: "mens", label: "Mens" },
            { value: "womens", label: "Womens" }
          ],
          "All"
        )
      : "";
    const mobileCategoryGroup = renderMobileDropdownGroup(
      "category",
      "Categories",
      filtersMeta.categories.map((category) => ({ value: category, label: CATEGORY_LABELS[category] || category })),
      "All Categories"
    );
    const mobileSizeGroup = renderMobileDropdownGroup(
      "size",
      "Sizes",
      filtersMeta.sizes.map((size) => ({ value: String(size), label: String(size) })),
      "All Sizes"
    );
    const mobileBrandGroup = renderMobileDropdownGroup(
      "brand",
      "Brands",
      filtersMeta.brands.map((brand) => ({ value: brand, label: brand })),
      "All Brands"
    );

    panel.innerHTML = `
      <form id="catalog-filter-form" class="filter-desktop-form" aria-label="Product filters">
        <div class="filter-panel-head">
          <h2>Filter & Sort</h2>
          <div class="filter-panel-head-actions">
            <button id="reset-filters" class="btn-outline filter-reset-btn" type="button" data-filter-reset aria-label="Reset filters">Reset</button>
            <button id="close-filters-desktop" class="btn-outline filter-close-btn" type="button" aria-label="Close filters">Close</button>
          </div>
        </div>

        <div class="filter-group filter-group-range">
          <h3>Price Range</h3>
          ${renderPriceRangeControls()}
        </div>

        ${
          includeGender
            ? `<div class="filter-group"><h3>Gender</h3><div class="checkbox-list filter-options-inline"><label class="filter-chip"><input type="radio" name="gender" value="all" checked><span>All</span></label><label class="filter-chip"><input type="radio" name="gender" value="mens"><span>Mens</span></label><label class="filter-chip"><input type="radio" name="gender" value="womens"><span>Womens</span></label></div></div>`
            : ""
        }

        <div class="filter-group">
          <h3>Categories</h3>
          <div class="checkbox-list filter-options-grid">
            ${filtersMeta.categories
              .map(
                (category) =>
                  `<label class="filter-chip"><input type="checkbox" name="category" value="${sanitize(category)}"><span>${sanitize(CATEGORY_LABELS[category] || category)}</span></label>`
              )
              .join("")}
          </div>
        </div>

        <div class="filter-group">
          <h3>Sizes</h3>
          <div class="checkbox-list filter-options-grid">
            ${filtersMeta.sizes
              .map((size) => `<label class="filter-chip"><input type="checkbox" name="size" value="${sanitize(size)}"><span>${sanitize(size)}</span></label>`)
              .join("")}
          </div>
        </div>

        <div class="filter-group">
          <h3>Brands</h3>
          <div class="checkbox-list filter-options-grid">
            ${filtersMeta.brands
              .map((brand) => `<label class="filter-chip"><input type="checkbox" name="brand" value="${sanitize(brand)}"><span>${sanitize(brand)}</span></label>`)
              .join("")}
          </div>
        </div>
      </form>

      <form id="catalog-filter-mobile" class="filter-mobile-form" aria-label="Product filters for smaller screens">
        <div class="filter-mobile-bar">
          <div>
            <p class="filter-mobile-kicker">Refine results</p>
            <h2>Filters</h2>
          </div>
          <div class="filter-mobile-actions">
            <button id="reset-filters-mobile" class="btn-outline filter-reset-btn" type="button" data-filter-reset aria-label="Reset filters">Reset</button>
            <button id="close-filters-mobile" class="btn-outline filter-close-btn" type="button" aria-label="Close filters">Close</button>
          </div>
        </div>

        <div class="filter-group filter-group-range">
          <div class="filter-select-head">
            <h3>Price Range</h3>
          </div>
          ${renderPriceRangeControls("mobile")}
        </div>

        ${mobileGenderGroup}
        ${mobileCategoryGroup}
        ${mobileSizeGroup}
        ${mobileBrandGroup}
      </form>
    `;

    const filterToggleBtn = document.getElementById("catalog-filter-toggle");
    let filterBackdrop = document.getElementById("catalog-filter-backdrop");
    if (!filterBackdrop) {
      filterBackdrop = document.createElement("div");
      filterBackdrop.id = "catalog-filter-backdrop";
      filterBackdrop.className = "filter-panel-backdrop hidden";
      document.body.appendChild(filterBackdrop);
    }

    function setFilterPanelVisibility(forceOpen) {
      const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : panel.classList.contains("filter-panel-collapsed");
      const isDesktop = window.innerWidth > 1024;
      panel.classList.toggle("filter-panel-collapsed", !shouldOpen);
      if (filterToggleBtn) {
        filterToggleBtn.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
      }
      if (filterBackdrop) {
        const showBackdrop = shouldOpen && isDesktop;
        filterBackdrop.classList.toggle("hidden", !showBackdrop);
      }
      if (!shouldOpen) {
        closeAllMobileDropdowns();
      }
    }

    setFilterPanelVisibility(false);

    if (filterToggleBtn) {
      filterToggleBtn.onclick = () => {
        setFilterPanelVisibility();
      };
    }

    const closeFiltersMobileBtn = document.getElementById("close-filters-mobile");
    if (closeFiltersMobileBtn instanceof HTMLButtonElement) {
      closeFiltersMobileBtn.addEventListener("click", () => {
        setFilterPanelVisibility(false);
      });
    }

    const closeFiltersDesktopBtn = document.getElementById("close-filters-desktop");
    if (closeFiltersDesktopBtn instanceof HTMLButtonElement) {
      closeFiltersDesktopBtn.addEventListener("click", () => {
        setFilterPanelVisibility(false);
      });
    }

    if (filterBackdrop) {
      filterBackdrop.addEventListener("click", () => {
        setFilterPanelVisibility(false);
      });
    }

    window.addEventListener(
      "resize",
      () => {
        setFilterPanelVisibility(false);
      },
      { passive: true }
    );

    function syncFilterControls() {
      const priceFieldIds = ["min-price", "max-price", "min-price-mobile", "max-price-mobile"];
      priceFieldIds.forEach((id) => {
        const input = document.getElementById(id);
        if (input instanceof HTMLInputElement) {
          if (id.includes("min-price")) {
            input.value = String(selected.minPrice);
            input.max = String(selected.maxPrice);
          } else {
            input.value = String(selected.maxPrice);
            input.min = String(selected.minPrice);
          }
        }
      });

      const priceSliderIds = ["min-price-slider", "max-price-slider", "min-price-slider-mobile", "max-price-slider-mobile"];
      priceSliderIds.forEach((id) => {
        const input = document.getElementById(id);
        if (input instanceof HTMLInputElement) {
          if (id.includes("min-price-slider")) {
            input.value = String(selected.minPrice);
            input.max = String(selected.maxPrice);
          } else {
            input.value = String(selected.maxPrice);
            input.min = String(selected.minPrice);
          }
        }
      });

      const rangeVisuals = panel.querySelectorAll("[data-price-range]");
      const maxRangeValue = Math.max(filtersMeta.maxPrice, 1);
      const start = (selected.minPrice / maxRangeValue) * 100;
      const end = (selected.maxPrice / maxRangeValue) * 100;
      rangeVisuals.forEach((rangeVisual) => {
        if (rangeVisual instanceof HTMLElement) {
          rangeVisual.style.setProperty("--range-start", `${start}%`);
          rangeVisual.style.setProperty("--range-end", `${end}%`);
        }
      });

      const desktopCategoryInputs = panel.querySelectorAll('input[name="category"]');
      desktopCategoryInputs.forEach((input) => {
        if (input instanceof HTMLInputElement) {
          input.checked = selected.categories.has(input.value);
        }
      });
      const desktopSizeInputs = panel.querySelectorAll('input[name="size"]');
      desktopSizeInputs.forEach((input) => {
        if (input instanceof HTMLInputElement) {
          input.checked = selected.sizes.has(input.value);
        }
      });
      const desktopBrandInputs = panel.querySelectorAll('input[name="brand"]');
      desktopBrandInputs.forEach((input) => {
        if (input instanceof HTMLInputElement) {
          input.checked = selected.brands.has(input.value);
        }
      });
      const desktopGenderInputs = panel.querySelectorAll('input[name="gender"]');
      desktopGenderInputs.forEach((input) => {
        if (input instanceof HTMLInputElement) {
          input.checked = input.value === selected.gender;
        }
      });

      const mobileOptionButtons = panel.querySelectorAll("[data-mobile-filter-option]");
      mobileOptionButtons.forEach((optionButton) => {
        if (!(optionButton instanceof HTMLButtonElement)) {
          return;
        }
        const groupName = optionButton.dataset.mobileFilterOption;
        const optionValue = optionButton.dataset.value || "all";
        let isActive = false;

        if (groupName === "gender") {
          isActive = selected.gender === optionValue;
        }
        if (groupName === "category") {
          isActive = optionValue === "all" ? !selected.categories.size : selected.categories.has(optionValue);
        }
        if (groupName === "size") {
          isActive = optionValue === "all" ? !selected.sizes.size : selected.sizes.has(optionValue);
        }
        if (groupName === "brand") {
          isActive = optionValue === "all" ? !selected.brands.size : selected.brands.has(optionValue);
        }

        optionButton.classList.toggle("is-active", isActive);
        optionButton.setAttribute("aria-pressed", isActive ? "true" : "false");
      });

      const mobileFilterValueLabels = panel.querySelectorAll("[data-mobile-filter-value]");
      mobileFilterValueLabels.forEach((valueLabel) => {
        if (!(valueLabel instanceof HTMLElement)) {
          return;
        }

        const groupName = valueLabel.dataset.mobileFilterValue;
        if (!groupName) {
          return;
        }

        const activeOption = panel.querySelector(`[data-mobile-filter-option="${groupName}"].is-active`);
        if (activeOption instanceof HTMLButtonElement) {
          valueLabel.textContent = activeOption.dataset.label || activeOption.textContent || "All";
        }
      });
    }

    function renderFiltered() {
      syncFilterControls();
      let filtered = products.filter((item) => item.price >= selected.minPrice && item.price <= selected.maxPrice);

      if (selected.categories.size) {
        filtered = filtered.filter((item) => selected.categories.has(item.category));
      }
      if (selected.sizes.size) {
        filtered = filtered.filter((item) => (item.sizes || []).some((size) => selected.sizes.has(String(size))));
      }
      if (selected.brands.size) {
        filtered = filtered.filter((item) => selected.brands.has(item.brand));
      }
      if (includeGender && selected.gender !== "all") {
        filtered = filtered.filter((item) => item.gender === selected.gender);
      }

      grid.innerHTML = filtered.length
        ? filtered.map((product) => productCard(product)).join("")
        : "<p>No products match your filters.</p>";
    }

    const resetButtons = panel.querySelectorAll("[data-filter-reset]");
    const filterForms = [document.getElementById("catalog-filter-form"), document.getElementById("catalog-filter-mobile")];

    resetButtons.forEach((resetBtn) => {
      resetBtn.addEventListener("click", () => {
        selected.minPrice = 0;
        selected.maxPrice = filtersMeta.maxPrice;
        selected.categories.clear();
        selected.sizes.clear();
        selected.brands.clear();
        selected.gender = "all";

        filterForms.forEach((form) => {
          if (form instanceof HTMLFormElement) {
            form.reset();
          }
        });
        renderFiltered();
      });
    });

    panel.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      if (target.id === "min-price" || target.id === "min-price-mobile" || target.id === "min-price-slider" || target.id === "min-price-slider-mobile") {
        const nextMin = Math.max(0, Math.min(Number(target.value), selected.maxPrice));
        selected.minPrice = nextMin;
        renderFiltered();
        return;
      }
      if (target.id === "max-price" || target.id === "max-price-mobile" || target.id === "max-price-slider" || target.id === "max-price-slider-mobile") {
        const nextMax = Math.min(filtersMeta.maxPrice, Math.max(Number(target.value), selected.minPrice));
        selected.maxPrice = nextMax;
        renderFiltered();
      }
    });

    panel.addEventListener("change", (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement) {
        if (target.name === "category") {
          if (target.checked) {
            selected.categories.add(target.value);
          } else {
            selected.categories.delete(target.value);
          }
        }
        if (target.name === "size") {
          if (target.checked) {
            selected.sizes.add(target.value);
          } else {
            selected.sizes.delete(target.value);
          }
        }
        if (target.name === "brand") {
          if (target.checked) {
            selected.brands.add(target.value);
          } else {
            selected.brands.delete(target.value);
          }
        }
        if (target.name === "gender") {
          selected.gender = target.value;
        }
        renderFiltered();
        return;
      }

      if (target instanceof HTMLSelectElement) {
        return;
      }
    });

    function closeAllMobileDropdowns() {
      const mobileDropdownLists = panel.querySelectorAll(".mobile-filter-dropdown-list");
      mobileDropdownLists.forEach((list) => {
        list.classList.add("hidden");
      });

      const mobileDropdownTriggers = panel.querySelectorAll("[data-mobile-filter-trigger]");
      mobileDropdownTriggers.forEach((trigger) => {
        if (trigger instanceof HTMLButtonElement) {
          trigger.setAttribute("aria-expanded", "false");
        }
      });
    }

    panel.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const dropdownTrigger = target.closest("[data-mobile-filter-trigger]");
      if (dropdownTrigger instanceof HTMLButtonElement) {
        const groupName = dropdownTrigger.dataset.mobileFilterTrigger;
        if (!groupName) {
          return;
        }
        const list = panel.querySelector(`#mobile-option-list-${groupName}`);
        if (!(list instanceof HTMLElement)) {
          return;
        }
        const shouldOpen = list.classList.contains("hidden");
        closeAllMobileDropdowns();
        list.classList.toggle("hidden", !shouldOpen);
        dropdownTrigger.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
        return;
      }

      const optionButton = target.closest("[data-mobile-filter-option]");
      if (!(optionButton instanceof HTMLButtonElement)) {
        if (!target.closest(".mobile-filter-group")) {
          closeAllMobileDropdowns();
        }
        return;
      }

      const groupName = optionButton.dataset.mobileFilterOption;
      const optionValue = optionButton.dataset.value || "all";

      if (groupName === "gender") {
        selected.gender = optionValue;
      }
      if (groupName === "category") {
        selected.categories.clear();
        if (optionValue !== "all") {
          selected.categories.add(optionValue);
        }
      }
      if (groupName === "size") {
        selected.sizes.clear();
        if (optionValue !== "all") {
          selected.sizes.add(optionValue);
        }
      }
      if (groupName === "brand") {
        selected.brands.clear();
        if (optionValue !== "all") {
          selected.brands.add(optionValue);
        }
      }

      closeAllMobileDropdowns();
      renderFiltered();
    });

    renderFiltered();
  }

  function buildCategoryLandingCards() {
    const categoryOrder = ["training", "running", "multisport", "casual", "sneakers"];
    const genders = [
      { value: "mens", label: "Men" },
      { value: "womens", label: "Women" }
    ];

    return genders.flatMap((gender) =>
      categoryOrder
        .map((category) => {
          const matches = state.products
            .filter((item) => item.gender === gender.value && item.category === category)
            .sort((a, b) => (b.rating || 0) * (b.reviews || 0) - (a.rating || 0) * (a.reviews || 0));

          if (!matches.length) {
            return null;
          }

          const heroProduct = matches[0];
          const image = heroProduct.images && heroProduct.images.length ? heroProduct.images[0] : "adokicks.png";
          const destination = `${gender.value}.html?gender=${encodeURIComponent(gender.value)}&category=${encodeURIComponent(category)}`;
          const categoryLabel = CATEGORY_LABELS[category] || category;
          const title = `${gender.label}'s ${categoryLabel}`;

          return {
            gender,
            category,
            title,
            image,
            destination,
            brand: heroProduct.brand,
            price: heroProduct.price,
            count: matches.length
          };
        })
        .filter(Boolean)
    );
  }

  function renderCategoriesPage() {
    const hero = document.getElementById("categories-hero");
    const grid = document.getElementById("category-grid");
    if (!hero || !grid) {
      return;
    }

    const categoryCards = buildCategoryLandingCards();
    const cards = categoryCards;
    const categoryCount = new Set(cards.map((card) => card.category)).size;
    const genderCount = new Set(cards.map((card) => card.gender.value)).size;

    hero.innerHTML = `
      <div class="categories-hero-copy">
        <p class="eyebrow">Category atlas</p>
        <h1>Choose the edit that matches your pace.</h1>
        <p class="page-subtitle">Browse the core category collections directly, with each tile tuned to feel broad, balanced, and easy to scan.</p>
      </div>
      <div class="categories-hero-stats" aria-label="Category overview">
        <article class="categories-hero-stat">
          <span class="stat-label">Collections</span>
          <strong>${cards.length}</strong>
        </article>
        <article class="categories-hero-stat">
          <span class="stat-label">Styles</span>
          <strong>${categoryCount}</strong>
        </article>
        <article class="categories-hero-stat">
          <span class="stat-label">Genders</span>
          <strong>${genderCount}</strong>
        </article>
      </div>
    `;

    grid.innerHTML = cards
      .map(
        (card) => `
          <a class="category-card ${card.gender.value === "mens" ? "category-card-men" : "category-card-women"}${card.isCollection ? " category-card-collection" : ""}" href="${sanitize(card.destination)}" role="listitem" aria-label="Open ${sanitize(card.title)}">
            <img src="${sanitize(card.image)}" alt="${sanitize(card.title)} category background" class="category-card-image">
            <div class="category-card-overlay"></div>
            <div class="category-card-content">
              <p class="category-card-kicker">${sanitize(card.isCollection ? "Full assortment" : `${card.gender.label} collection`)}</p>
              <h2>${sanitize(card.title)}</h2>
              <p class="category-card-copy">${sanitize(card.isCollection ? `${card.count} shoes ready to browse from ${card.brand}.` : `${card.count} style${card.count === 1 ? "" : "s"} ready to browse from ${card.brand}.`)}</p>
              <div class="category-card-meta">
                <span class="category-card-pill">${sanitize(card.isCollection ? "All shoes" : CATEGORY_LABELS[card.category] || card.category)}</span>
                <span class="category-card-pill">From ${formatCurrency(card.price)}</span>
              </div>
            </div>
          </a>
        `
      )
      .join("");
  }

  function renderFeatured() {
    const grid = document.getElementById("featured-grid");
    if (!grid) {
      return;
    }
    // Get top products sorted by price
    const topByPrice = [...state.products].sort((a, b) => b.price - a.price).slice(0, 10);
    
    // Get specific featured products by ID
    const featuredIds = ["m-tr-001", "m-ca-001"];
    const specificFeatured = state.products.filter(p => featuredIds.includes(p.id));
    
    // Combine and remove duplicates while keeping top products first
    const combined = [...topByPrice, ...specificFeatured];
    const unique = combined.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
    
    grid.innerHTML = unique.slice(0, 12).map((item) => productCard(item, true)).join("");
  }

  function renderAbout() {
    const timeline = document.getElementById("growth-timeline");
    const highlights = document.getElementById("about-highlights");
    const values = document.getElementById("about-values");
    if (!timeline || !highlights || !values) {
      return;
    }

    const picks = [...state.products]
      .sort((a, b) => (b.rating || 0) * (b.reviews || 0) - (a.rating || 0) * (a.reviews || 0))
      .slice(0, 5);

    const brandCount = new Set(state.products.map((item) => item.brand)).size;
    const categoryCount = new Set(state.products.map((item) => item.category)).size;
    const avgRating =
      state.products.reduce((sum, item) => sum + Number(item.rating || 0), 0) /
      Math.max(state.products.length, 1);

    highlights.innerHTML = `
      <section class="about-metric-grid" aria-label="Adokicks brand metrics">
        <article class="metric-card">
          <p class="metric-label">Curated products</p>
          <h2>${state.products.length}+</h2>
        </article>
        <article class="metric-card">
          <p class="metric-label">Partner brands</p>
          <h2>${brandCount}</h2>
        </article>
        <article class="metric-card">
          <p class="metric-label">Style categories</p>
          <h2>${categoryCount}</h2>
        </article>
        <article class="metric-card">
          <p class="metric-label">Average rating</p>
          <h2>${avgRating.toFixed(1)}</h2>
        </article>
      </section>
    `;

    values.innerHTML = `
      <section class="about-values-wrap section-card" aria-label="Adokicks values">
        <p class="about-kicker">What we stand for</p>
        <h2>Three principles behind every release</h2>
        <div class="about-values-grid">
          <article class="value-card">
            <h3>Fit Obsessed</h3>
            <p>From wide toe boxes to lockdown heels, every silhouette is selected for comfort that lasts beyond first wear.</p>
          </article>
          <article class="value-card">
            <h3>Performance Honest</h3>
            <p>We prioritize cushioning, traction, and stability details that athletes and everyday movers can actually feel.</p>
          </article>
          <article class="value-card">
            <h3>Culture Driven</h3>
            <p>Street style matters. We blend technical function with silhouettes that stay relevant on and off the track.</p>
          </article>
        </div>
      </section>
    `;

    timeline.innerHTML = `
      <section class="growth-track section-card" aria-label="Five growth milestones">
        <div class="growth-head">
          <p class="about-kicker">Journey</p>
          <h2>Growth Milestones</h2>
        </div>
        <div class="growth-list">
          ${picks
            .map(
              (item, index) => `
                <article class="growth-step" aria-label="Milestone ${index + 1}">
                  <div class="growth-year">20${19 + index}</div>
                  <div class="growth-content">
                    <div class="growth-media">
                      <img src="${sanitize(item.images[0] || "adokicks.png")}" alt="Milestone visual ${index + 1} ${sanitize(item.title)}">
                    </div>
                    <div class="growth-copy">
                      <h3>${sanitize(item.brand)} ${sanitize(CATEGORY_LABELS[item.category] || item.category)} Focus</h3>
                      <p>We expanded our ${sanitize(item.category)} line and refined material testing to improve durability, fit consistency, and daily comfort.</p>
                    </div>
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  function renderProductPage() {
    const wrap = document.getElementById("product-detail");
    if (!wrap) {
      return;
    }
    const id = params().get("id") || "";
    const product = state.byId[id];
    if (!product) {
      wrap.innerHTML = "<p>Product not found.</p>";
      return;
    }
    let imageIndex = 0;
    let selectedSize = "";

    const images = (product.images || []).length ? product.images : ["adokicks.png"];

    function renderDetail() {
      wrap.innerHTML = `
        <section class="gallery" aria-label="Product image gallery">
          <div class="gallery-main">
            <img src="${sanitize(images[imageIndex])}" alt="${sanitize(product.title)} image ${imageIndex + 1}">
            <div class="gallery-nav" role="group" aria-label="Gallery controls">
              <button id="img-prev" class="btn-secondary" type="button" aria-label="View previous image">Prev</button>
              <button id="img-next" class="btn-secondary" type="button" aria-label="View next image">Next</button>
            </div>
          </div>
          <div class="thumb-row" role="list" aria-label="Image thumbnails">
            ${images
              .map(
                (img, idx) =>
                  `<button type="button" data-img-index="${idx}" aria-label="Select image ${idx + 1}"><img src="${sanitize(img)}" alt="${sanitize(product.title)} thumbnail ${idx + 1}"></button>`
              )
              .join("")}
          </div>
        </section>

        <section class="section-card product-info-card" aria-label="Product purchase details">
          <h1 class="product-title">${sanitize(product.brand)} - ${sanitize(product.title)}</h1>
          <p class="price-line product-price-line"><strong>${formatCurrency(product.price)}</strong> <span class="old-price">${formatCurrency(product.originalPrice)}</span></p>
          <p class="product-meta">Category: ${sanitize(CATEGORY_LABELS[product.category] || product.category)} | Rating: ${sanitize(product.rating)} (${sanitize(product.reviews)} reviews)</p>

          <h2 class="product-section-title">Select Size</h2>
          <div class="product-size-grid" role="group" aria-label="Available sizes">
            ${(product.sizes || [])
              .map(
                (size) =>
                  `<button type="button" data-size-option="${sanitize(size)}" class="product-size-pill ${String(selectedSize) === String(size) ? "is-active" : ""}" aria-label="Select size ${sanitize(size)}">${sanitize(size)}</button>`
              )
              .join("")}
          </div>

          <div class="product-buy-row" aria-label="Purchase actions">
            <button id="product-add-cart" class="btn-primary product-buy-btn" type="button" aria-label="Add item to bag">Add to Bag</button>
            <button id="product-wishlist" class="heart-btn ${isWishlisted(product.id) ? "active" : ""}" type="button" aria-label="Toggle wishlist" title="Wishlist">&#10084;</button>
          </div>

          <h2 class="product-section-title">Description</h2>
          <p class="product-description-text">${sanitize(product.description)}</p>
        </section>
      `;

      const prev = document.getElementById("img-prev");
      const next = document.getElementById("img-next");
      const addCart = document.getElementById("product-add-cart");
      const addWishlist = document.getElementById("product-wishlist");

      prev.addEventListener("click", () => {
        imageIndex = (imageIndex - 1 + images.length) % images.length;
        renderDetail();
      });

      next.addEventListener("click", () => {
        imageIndex = (imageIndex + 1) % images.length;
        renderDetail();
      });

      wrap.querySelectorAll("button[data-img-index]").forEach((button) => {
        button.addEventListener("click", () => {
          imageIndex = Number(button.getAttribute("data-img-index"));
          renderDetail();
        });
      });

      wrap.querySelectorAll("button[data-size-option]").forEach((button) => {
        button.addEventListener("click", () => {
          selectedSize = button.getAttribute("data-size-option") || "";

          wrap.querySelectorAll("button[data-size-option]").forEach((optionButton) => {
            optionButton.classList.toggle("is-active", optionButton === button);
          });
        });
      });

      addCart.addEventListener("click", () => {
        if (!selectedSize) {
          toast("Select a size first.");
          return;
        }
        addToCart(product.id, selectedSize, 1);
      });

      addWishlist.addEventListener("click", () => {
        toggleWishlist(product.id);
        renderDetail();
      });
    }

    renderDetail();
  }

  function renderSearchPage() {
    const q = (params().get("q") || "").trim();
    const summary = document.getElementById("search-summary");
    const grid = document.getElementById("search-grid");
    if (!summary || !grid) {
      return;
    }
    if (!q) {
      summary.textContent = "Type a search query using the navbar search.";
      grid.innerHTML = "";
      return;
    }
    const results = state.products.filter((item) => `${item.title} ${item.brand} ${item.category}`.toLowerCase().includes(q.toLowerCase()));
    summary.textContent = `${results.length} result(s) for "${q}"`;
    grid.innerHTML = results.length ? results.map((item) => productCard(item)).join("") : "<p>No products found for this query.</p>";
  }

  function renderWishlistPage() {
    const wrap = document.getElementById("wishlist-grid");
    if (!wrap) {
      return;
    }
    const ids = getWishlist();
    const products = ids.map((id) => state.byId[id]).filter(Boolean);
    wrap.innerHTML = products.length ? products.map((product) => productCard(product)).join("") : "<p>Your wishlist is empty.</p>";
  }

  function validatePhone(phone) {
    return /^\d{10}$/.test(phone);
  }

  function validateName(name) {
    return /^[A-Za-z][A-Za-z ]{1,49}$/.test(name.trim());
  }

  function validatePassword(password) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function validateZip(zip) {
    return /^\d{5,6}$/.test(zip);
  }

  async function sha256(input) {
    if (!window.crypto || !window.crypto.subtle) {
      return `fallback_${btoa(unescape(encodeURIComponent(input))).replaceAll("=", "")}`;
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const byteArray = Array.from(new Uint8Array(hashBuffer));
    return byteArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function renderAuthPage() {
    const loginTab = document.getElementById("login-tab");
    const signupTab = document.getElementById("signup-tab");
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");
    const authMessage = document.getElementById("auth-message");

    if (!loginTab || !signupTab || !loginForm || !signupForm || !authMessage) {
      return;
    }

    function setAuthMessage(message) {
      authMessage.textContent = message;
      authMessage.classList.toggle("hidden", !message);
    }

    const notice = params().get("notice");
    if (notice === "please_login") {
      setAuthMessage("Please login to continue.");
    }

    function showLogin() {
      loginTab.classList.add("active");
      signupTab.classList.remove("active");
      loginTab.setAttribute("aria-selected", "true");
      signupTab.setAttribute("aria-selected", "false");
      loginForm.classList.remove("hidden");
      signupForm.classList.add("hidden");
      setAuthMessage("");
    }

    function showSignup() {
      signupTab.classList.add("active");
      loginTab.classList.remove("active");
      signupTab.setAttribute("aria-selected", "true");
      loginTab.setAttribute("aria-selected", "false");
      signupForm.classList.remove("hidden");
      loginForm.classList.add("hidden");
      setAuthMessage("");
    }

    loginTab.addEventListener("click", showLogin);
    signupTab.addEventListener("click", showSignup);

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(loginForm);
      const phone = String(form.get("phone") || "").trim();
      const password = String(form.get("password") || "");

      if (!validatePhone(phone)) {
        setAuthMessage("Enter a valid 10 digit phone number.");
        return;
      }
      if (!password) {
        setAuthMessage("Password is required.");
        return;
      }

      const users = getUsers();
      const user = users.find((entry) => entry.phone === phone);
      if (!user) {
        setAuthMessage("No account found for this phone number.");
        return;
      }

      const hashed = await sha256(password);
      if (hashed !== user.passwordHash) {
        setAuthMessage("Incorrect password.");
        return;
      }

      localStorage.setItem(STORAGE_KEYS.currentUser, user.phone);
      migrateLegacyAccountData(user.phone);
      setAuthMessage("");
      toast("Login successful", "success");
      const redirect = params().get("redirect") || "index.html";
      window.location.href = redirect;
    });

    signupForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(signupForm);
      const name = String(form.get("name") || "").trim();
      const phone = String(form.get("phone") || "").trim();
      const password = String(form.get("password") || "");
      const confirm = String(form.get("confirmPassword") || "");

      if (!validateName(name)) {
        setAuthMessage("Enter a valid name (letters and spaces, 2-50 chars).");
        return;
      }
      if (!validatePhone(phone)) {
        setAuthMessage("Enter a valid 10 digit phone number.");
        return;
      }
      if (!validatePassword(password)) {
        setAuthMessage("Password must be at least 8 characters with uppercase, lowercase, and number.");
        return;
      }
      if (password !== confirm) {
        setAuthMessage("Password and confirm password must match.");
        return;
      }

      const users = getUsers();
      if (users.some((entry) => entry.phone === phone)) {
        setAuthMessage("This phone number is already registered.");
        return;
      }

      const passwordHash = await sha256(password);
      users.push({ name, phone, passwordHash });
      storageSet(STORAGE_KEYS.users, users);
      localStorage.setItem(STORAGE_KEYS.currentUser, phone);
      migrateLegacyAccountData(phone);
      setAuthMessage("");
      toast("Account created successfully", "success");

      const redirect = params().get("redirect") || "index.html";
      window.location.href = redirect;
    });
  }

  function renderCheckoutPage() {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "auth.html?redirect=checkout.html&notice=please_login";
      return;
    }

    const form = document.getElementById("checkout-form");
    const summary = document.getElementById("order-summary");
    if (!form || !summary) {
      return;
    }

    const cart = getCart().filter((item) => state.byId[item.productId]);
    if (!cart.length) {
      summary.innerHTML = `
        <div class="checkout-empty">
          <p class="eyebrow">Nothing in your bag</p>
          <h2>Your cart is empty</h2>
          <p>Add a pair of shoes before checking out.</p>
          <a class="btn-primary" href="featured.html">Browse featured picks</a>
        </div>
      `;
      const submitButton = form.querySelector("button[type='submit']");
      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = true;
      }
      return;
    }

    const submitButton = form.querySelector("button[type='submit']");
    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = false;
    }

    const nameField = document.getElementById("checkout-name");
    const phoneField = document.getElementById("checkout-phone");
    if (nameField) {
      nameField.value = user.name;
    }
    if (phoneField) {
      phoneField.value = user.phone;
    }

    function renderSummary() {
      const totals = totalsFromCart(cart);
      summary.innerHTML = `
        <div class="checkout-summary-card">
          <div class="checkout-summary-head">
            <p class="eyebrow">Order review</p>
           
            <p class=" eyebrow">${cart.length} item${cart.length === 1 ? "" : "s"} ready to ship.</p>
          </div>
          <div class="checkout-items-list">
            ${cart
              .map((item) => {
                const product = state.byId[item.productId];
                const itemTotal = product.price * item.qty;
                return `
                  <article class="checkout-item-card">
                    <img src="${sanitize(product.images[0] || "adokicks.png")}" alt="${sanitize(product.title)} thumbnail">
                    <div class="checkout-item-body">
                      <div class="checkout-item-head">
                        <h3>${sanitize(product.title)}</h3>
                        <strong>${formatCurrency(itemTotal)}</strong>
                      </div>
                      <p>Size ${sanitize(item.size)} · Qty ${item.qty}</p>
                      <p class="checkout-item-price">${formatCurrency(product.price)} each</p>
                    </div>
                  </article>
                `;
              })
              .join("")}
          </div>
          <div class="checkout-pricing">
            <div class="summary-row"><span>Subtotal</span><strong>${formatCurrency(totals.subtotal)}</strong></div>
            <div class="summary-row"><span>Delivery</span><strong>Free</strong></div>
            <div class="summary-row total-row"><span>Total</span><strong>${formatCurrency(totals.total)}</strong></div>
          </div>
          <p class="checkout-note">Secure payment processing. Your order confirmation will appear after submission.</p>
        </div>
      `;
    }

    renderSummary();

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(form).entries());
      const name = String(payload.name || "").trim();
      const email = String(payload.email || "").trim();
      const phone = String(payload.phone || "").trim();
      const address1 = String(payload.address1 || "").trim();
      const address2 = String(payload.address2 || "").trim();
      const city = String(payload.city || "").trim();
      const stateName = String(payload.state || "").trim();
      const zipcode = String(payload.zipcode || "").trim();

      if (!validateName(name)) {
        toast("Enter a valid name.");
        return;
      }
      if (!validateEmail(email)) {
        toast("Enter a valid email address.");
        return;
      }
      if (!validatePhone(phone)) {
        toast("Enter a valid phone number.");
        return;
      }
      if (!address1) {
        toast("Address line 1 is required.");
        return;
      }
      if (!city || !stateName) {
        toast("City and state are required.");
        return;
      }
      if (!validateZip(zipcode)) {
        toast("Enter a valid zipcode.");
        return;
      }

      const totals = totalsFromCart(cart);
      const orders = getOrders();
      const orderId = `AK${Date.now().toString(36).toUpperCase()}`;

      orders.unshift({
        id: orderId,
        createdAt: new Date().toISOString(),
        userPhone: user.phone,
        items: cart.map((item) => ({ ...item })),
        subtotal: totals.subtotal,
        total: totals.total,
        address: {
          name,
          email,
          phone,
          address1,
          address2,
          city,
          state: stateName,
          zipcode
        }
      });
      setOrders(orders);
      setCart([]);
      window.location.href = `order-confirmation.html?orderId=${encodeURIComponent(orderId)}`;
    });
  }

  function renderConfirmationPage() {
    const orderId = params().get("orderId") || "";
    const text = document.getElementById("confirmation-order-id");
    const sec = document.getElementById("redirect-seconds");
    if (text) {
      text.textContent = orderId ? `Order ID: ${orderId}` : "Order submitted.";
    }
    if (!sec) {
      return;
    }
    let countdown = 10;
    sec.textContent = String(countdown);
    const timer = setInterval(() => {
      countdown -= 1;
      sec.textContent = String(countdown);
      if (countdown <= 0) {
        clearInterval(timer);
        window.location.href = "my-orders.html";
      }
    }, 1000);
  }

  function renderOrdersPage() {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "auth.html?redirect=my-orders.html&notice=please_login";
      return;
    }

    const list = document.getElementById("orders-list");
    const detail = document.getElementById("order-summary-view");
    if (!list || !detail) {
      return;
    }

    const orders = getOrders().filter((order) => order.userPhone === user.phone);
    if (!orders.length) {
      list.innerHTML = `
        <div class="orders-empty">
          <p class="eyebrow">No orders yet</p>
          <h2>Your order history is empty</h2>
          <p>Place your first order to start tracking it here.</p>
          <a class="btn-primary" href="featured.html">Shop featured</a>
        </div>
      `;
      detail.innerHTML = `
        <div class="orders-empty-detail">
          <p class="eyebrow">Order detail</p>
          <h2>Nothing to show yet</h2>
          <p>Place an order to view detailed summaries here.</p>
        </div>
      `;
      detail.classList.remove("hidden");
      return;
    }

    list.innerHTML = orders
      .map(
        (order) => `
          <article class="order-card" data-order-id="${sanitize(order.id)}" aria-label="Order ${sanitize(order.id)} summary card">
            <div class="order-card-head">
              <div>
                <p class="order-card-label">Order ID</p>
                <h3>${sanitize(order.id)}</h3>
              </div>
              <span class="order-status-pill">Placed</span>
            </div>
            <div class="order-card-meta">
              <span>${new Date(order.createdAt).toLocaleString()}</span>
              <span>${order.items.length} item${order.items.length === 1 ? "" : "s"}</span>
            </div>
            <div class="order-card-foot">
              <p class="order-card-total">${formatCurrency(order.total)}</p>
              <button class="btn-secondary order-view-btn" type="button" data-action="order-view" data-order-id="${sanitize(order.id)}" aria-label="View details for order ${sanitize(order.id)}">View Details</button>
            </div>
          </article>
        `
      )
      .join("");

    function renderOrderDetail(order) {
      list.querySelectorAll("[data-order-id]").forEach((card) => {
        card.classList.toggle("is-active", card.getAttribute("data-order-id") === order.id);
      });

      const orderDate = new Date(order.createdAt).toLocaleString();
      detail.innerHTML = `
        <div class="order-detail-card">
          <div class="order-detail-head">
            <div>
              <p class="eyebrow">Selected order</p>
              <h2>Order ${sanitize(order.id)}</h2>
              <p class="page-subtitle">Placed on ${orderDate}</p>
            </div>
            <span class="order-status-pill">Placed</span>
          </div>
          <div class="order-detail-grid">
            <section class="order-block" aria-label="Order items">
              <h3>Items</h3>
              <div class="order-items-list">
                ${order.items
                  .map((item) => {
                    const product = state.byId[item.productId];
                    if (!product) {
                      return "";
                    }
                    return `
                      <article class="order-item-card" aria-label="${sanitize(product.title)} ordered item">
                        <img src="${sanitize(product.images[0] || "adokicks.png")}" alt="${sanitize(product.title)} order image">
                        <div class="order-item-body">
                          <div class="order-item-head">
                            <h4>${sanitize(product.title)}</h4>
                            <strong>${formatCurrency(product.price * item.qty)}</strong>
                          </div>
                          <p>Size ${sanitize(item.size)} · Qty ${item.qty}</p>
                          <p class="order-item-price">${formatCurrency(product.price)} each</p>
                        </div>
                      </article>
                    `;
                  })
                  .join("")}
              </div>
            </section>
            <aside class="order-block order-address-card" aria-label="Delivery address">
              <h3>Delivery address</h3>
              <p><strong>${sanitize(order.address.name)}</strong></p>
              <p>${sanitize(order.address.phone)}</p>
              <p>${sanitize(order.address.address1)}${order.address.address2 ? `, ${sanitize(order.address.address2)}` : ""}</p>
              <p>${sanitize(order.address.city)}, ${sanitize(order.address.state)} - ${sanitize(order.address.zipcode)}</p>
            </aside>
          </div>
          <div class="order-total-bar">
            <div class="summary-row"><span>Subtotal</span><strong>${formatCurrency(order.subtotal)}</strong></div>
            <div class="summary-row"><span>Total</span><strong>${formatCurrency(order.total)}</strong></div>
          </div>
        </div>
      `;

      detail.classList.remove("hidden");
      detail.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    detail.innerHTML = `
      <div class="orders-empty-detail">
        <p class="eyebrow">Order detail</p>
        <h2>Select any order</h2>
        <p>Click <strong>View Details</strong> on any order card to open the complete summary.</p>
      </div>
    `;
    detail.classList.remove("hidden");

    list.querySelectorAll("[data-action='order-view']").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.getAttribute("data-order-id");
        const order = orders.find((entry) => entry.id === id);
        if (order) {
          renderOrderDetail(order);
        }
      });
    });
  }

  function rerenderCurrentPage() {
    switch (page) {
      case "home":
        renderHome();
        break;
      case "mens":
        renderCatalogPage(state.products.filter((item) => item.gender === "mens"));
        break;
      case "womens":
        renderCatalogPage(state.products.filter((item) => item.gender === "womens"));
        break;
      case "categories":
        renderCategoriesPage();
        break;
      case "featured":
        renderFeatured();
        break;
      case "about":
        renderAbout();
        break;
      case "product":
        renderProductPage();
        break;
      case "search":
        renderSearchPage();
        break;
      case "wishlist":
        renderWishlistPage();
        break;
      case "auth":
        renderAuthPage();
        break;
      case "checkout":
        renderCheckoutPage();
        break;
      case "confirmation":
        renderConfirmationPage();
        break;
      case "orders":
        renderOrdersPage();
        break;
      default:
        break;
    }
  }

  async function init() {
    try {
      await loadData();
      renderHeader();
      renderFooter();
      ensureOverlayContainers();
      bindSearchPopup();
      bindGlobalClicks();
      rerenderCurrentPage();
    } catch (error) {
      toast("Unable to initialize Adokicks data.");
    }
  }

  init();
})();
