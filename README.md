# Adokicks Codebase Guide

## Overview
Adokicks is a multi-page storefront built with static HTML pages, one shared JavaScript controller, one shared stylesheet, and one JSON product source.

Main architecture:
- HTML pages provide page shells
- js/app.js handles all behavior, rendering, and page routing logic
- css/styles.css handles all visual styling and responsive behavior
- shoesrc.json provides product data

## Project Structure
- index.html: Home shell
- mens.html: Men catalog shell
- womens.html: Women catalog shell
- categories.html: All categories catalog shell
- featured.html: Featured products shell
- product.html: Product detail shell
- search.html: Search results shell
- wishlist.html: Wishlist shell
- auth.html: Login/signup shell
- checkout.html: Checkout shell
- my-orders.html: Orders list + details shell
- order-confirmation.html: Confirmation shell
- about.html: About page shell
- js/app.js: Shared application logic
- css/styles.css: Shared visual system and responsive rules
- shoesrc.json: Product data source

## Runtime Flow
1. The app reads body data-page to identify the current page.
2. init() loads product data.
3. Header and footer are rendered.
4. Shared overlays (search, cart, profile) are created.
5. Global event bindings are attached.
6. rerenderCurrentPage() chooses and runs the page renderer.

Entry points in js/app.js:
- init()
- rerenderCurrentPage()

## JavaScript Responsibilities (js/app.js)

### 1) State and Storage Layer
- STORAGE_KEYS stores localStorage key names.
- state stores runtime state: products, byId map, and UI open/close flags.
- storageGet/storageSet are safe JSON localStorage wrappers.

Helpers:
- getUsers, getCurrentUser, getCart, getWishlist, getOrders
- setCart, setWishlist, setOrders
- formatCurrency, params, sanitize, toast

### 2) Data Loading
- loadData() fetches shoesrc.json.
- mapProducts() flattens nested mens/womens category data into one product array.
- byId map is built for fast lookup by productId.

### 3) Reusable Product/Card Logic
- productCard() builds card markup used on home, catalogs, featured, search, wishlist.
- totalsFromCart() computes subtotal and total.
- wishlist operations: isWishlisted(), toggleWishlist().
- cart operations: addToCart(), updateCartQty(), removeFromCart().
- updateHeaderBadges() syncs wishlist and cart counters in header.

### 4) Global Layout Rendering
- renderHeader() builds desktop + mobile navigation and binds nav interactions.
- renderFooter() builds footer content.
- syncHeaderOffset() updates --header-offset so fixed header spacing stays accurate.

### 5) Shared Overlays
- ensureOverlayContainers() creates:
  - search popup
  - search backdrop
  - cart drawer
  - profile menu (if user logged in)
- Search:
  - toggleSearchPopup(), quickSearch(), bindSearchPopup()
- Cart:
  - toggleCartDrawer(), renderCartDrawer()
- Profile:
  - toggleProfileMenu()

### 6) Global Event Delegation
- bindGlobalClicks() listens at document level for action handlers.
- Handles data-action clicks for wishlist, cart qty, remove, logout.
- Handles click-outside behavior for search, cart, and profile overlays.

### 7) Page Renderers
- renderHome(): hero video, trending grid, men/women banners, about strip, benefits.
- renderCatalogPage(products, includeGender): desktop + mobile filters, product grid, filtering logic, small-screen filter toggle.
- renderFeatured(): featured product selection and rendering.
- renderAbout(): brand metrics, values, timeline.
- renderProductPage(): gallery, size selection, add to cart, wishlist.
- renderSearchPage(): query-driven results.
- renderWishlistPage(): wishlist products.
- renderAuthPage(): login/signup workflows.
- renderCheckoutPage(): checkout validation + order creation.
- renderConfirmationPage(): countdown redirect to orders.
- renderOrdersPage(): order cards + view-details summary panel.

### 8) Validation and Security Helpers
- validatePhone(), validateName(), validatePassword(), validateEmail(), validateZip().
- sha256() hashes password before storage (with fallback if crypto unavailable).

### 9) Router-like Switch
- rerenderCurrentPage() switches by page key and calls the correct renderer.

## CSS Responsibilities (css/styles.css)

### 1) Design Tokens and Base Styles
- :root defines color palette, spacing constants, radius, shadows, header offset.
- Base reset for html/body, typography, images, buttons, and main container.

### 2) Shared UI Utilities
- page hero blocks, eyebrow labels, section cards.
- button variants: primary, secondary, outline.

### 3) Header and Navigation
- site-header fixed behavior.
- desktop nav layout and hover/active states.
- mobile quick actions and hamburger menu.
- mobile menu drawer and backdrop visuals.

### 4) Search Popup UI
- search-backdrop and search-pop positioning.
- search form head, input shell, quick-result list card styles.

### 5) Product Grid/Card UI
- product-grid, featured-grid responsive columns.
- product-card box, hover elevation, image scaling.
- heart button and price line styles.

### 6) Catalog and Filters
- catalog-layout (sidebar + content on desktop).
- catalog-title-row with right-aligned catalog-filter-toggle.
- filter-panel sticky desktop behavior and scrollbar.
- filter chips, range slider, mobile filter selects.
- filter-panel-collapsed behavior on smaller screens.

### 7) Home Visual Sections
- hero video block and gradient overlay text.
- trending section visual theme.
- men/women banner composition and image positioning.
- about strip image tiles and benefit cards.

### 8) Cart Drawer
- slide-in panel animation.
- cart item card layout and quantity controls.
- footer summary and checkout CTA styles.

### 9) Product Detail Page
- gallery layout, thumbnails, nav controls.
- size selector and detail card layout.

### 10) Auth / About / Checkout / Orders
- auth gradients and split layout.
- about hero, metrics, values, timeline cards.
- checkout and orders card systems.
- order list cards + order detail panel styling.

### 11) Responsive Breakpoints
- max-width 1024px: switch to mobile nav, catalog single-column, show filter toggle, adjust grids.
- max-width 680px: tighter spacing, reduced image heights, stacked layouts.
- max-width 480px: single-column product grids and phone-specific scaling.
- min-width 1440px and 1920px: expanded container widths and larger desktop scaling.

## User Journey Flows

### Browse and Add to Cart
1. User opens catalog page.
2. renderCatalogPage() creates filters and products.
3. User filters via desktop chips or mobile dropdowns.
4. User opens product page, picks size, adds item.
5. Cart drawer updates with totals and checkout CTA.

### Auth and Checkout
1. Checkout requires logged-in user.
2. If not logged in, redirect to auth with redirect query.
3. Successful login/signup stores current user phone.
4. Checkout validates fields and creates order.
5. Cart clears and user is sent to order-confirmation page.

### Orders
1. My Orders shows current user orders only.
2. Clicking View Details renders full summary panel with address and line items.

## Data Model Summary

### Product
Fields used by UI:
- id, title, brand, category, gender
- price, originalPrice, rating, reviews
- sizes, images, description

### Cart Entry
- productId, size, qty

### User
- name, phone, passwordHash

### Order
- id, createdAt, userPhone
- items (cart entries)
- subtotal, total
- address object (name, email, phone, lines, city, state, zipcode)

## Local Storage Keys
- adokicks_users
- adokicks_current_user_phone
- adokicks_cart
- adokicks_wishlist
- adokicks_orders

## Notes
- This is a fully client-side app with localStorage persistence.
- Auth is front-end only and suitable for learning/demo usage.
- Most UI sections are rendered through template strings in js/app.js.
- css/styles.css is the single global stylesheet; later rules and media queries override earlier styles.

## Quick Learning Path
1. Read init(), rerenderCurrentPage(), and renderHeader() first.
2. Then read renderCatalogPage() because it has the richest interaction logic.
3. Then read renderProductPage(), renderCheckoutPage(), and renderOrdersPage().
4. In CSS, scan root/base, header/nav, product-card, filter-panel, and media query sections.

## Deep Code Explanation

This section explains the code in execution order, with practical reasoning for what each part does.

### A) Execution Timeline from Page Load to Interactive UI

1. Browser loads an HTML page.
2. The page includes js/app.js.
3. js/app.js immediately executes inside an IIFE.
4. It reads body data-page and stores it in page.
5. init() starts and calls loadData().
6. After data is loaded, init() renders header and footer.
7. It creates shared overlays like search popup and cart drawer.
8. It binds global click handlers and search handlers.
9. rerenderCurrentPage() selects the correct renderer for the current page.
10. That renderer fills page-specific containers with HTML.
11. Any user click or input now goes through event listeners and updates state/storage.

Why this structure is used:
- One JS file keeps behavior consistent across all pages.
- Shared overlays are created once and reused.
- Page-specific rendering is isolated in small renderer functions.

### B) State and Storage in Detail

There are two major data sources:

1) In-memory runtime state
- state.dataLoaded prevents duplicate fetches.
- state.products is the flattened full catalog.
- state.byId is a map for fast product lookup.
- state.searchOpen, cartOpen, profileOpen, mobileMenuOpen control overlay visibility.

2) Persistent localStorage state
- Users, current user, cart, wishlist, and orders persist across refreshes.
- Helper getters and setters hide JSON parse/stringify complexity.
- setCart and setWishlist also trigger updateHeaderBadges, which keeps UI counts synchronized.

Important behavior:
- Cart, wishlist, and orders are fully client-side.
- If localStorage parsing fails, storageGet gracefully returns fallback values.

### C) Utility Functions Explained by Purpose

- formatCurrency(value): Converts number to Indian currency text style.
- params(): Reads URL query values for product id, search query, redirects, and order id.
- sanitize(text): Escapes unsafe characters before HTML injection to reduce XSS risk.
- toast(message, type): Shows temporary feedback messages in top-right notification stack.

Why sanitize matters:
- Most UI is built with template strings and inserted as HTML.
- Escaping user/data text avoids accidental HTML/script injection in rendered content.

### D) Data Loading and Normalization

loadData() does three things:

1. Fetches shoesrc.json.
2. Converts nested gender/category buckets into a simple products array via mapProducts().
3. Builds byId map for instant lookup by productId.

Mapping logic:
- Iterates both mens and womens buckets.
- Iterates each category under each gender.
- Copies product and adds gender and category fields.

This design simplifies filtering, searching, rendering, and order/cart joining.

### E) Product Card Pipeline

productCard(product, showDescription) returns a complete visual card string with:
- Product image link
- Name and brand/category text
- Current and old prices
- Wishlist toggle button
- Shop button

Card behavior dependencies:
- Uses isWishlisted(product.id) to set heart active state.
- Uses sanitize on all text values.
- Uses first image fallback if missing.

Where it is reused:
- Home trending
- Catalog pages
- Featured page
- Search results
- Wishlist page

### F) Cart and Wishlist Mutation Logic

Wishlist:
- toggleWishlist(productId)
  - If present, remove id and show Removed toast.
  - If absent, add id and show Added toast.
  - Header count auto-updates because setWishlist triggers updateHeaderBadges.

Cart:
- addToCart(productId, size, qty)
  - Requires size.
  - Merges with existing line if productId and size match.
  - Otherwise appends new cart line.
- updateCartQty(productId, size, delta)
  - Changes qty.
  - Deletes rows that reach qty <= 0.
  - Re-renders drawer.
- removeFromCart(productId, size)
  - Removes exact line and re-renders drawer.

Totals:
- totalsFromCart joins cart lines with state.byId to compute subtotal and total.

### G) Header and Mobile Menu System

renderHeader() builds:
- Desktop nav links + actions
- Mobile quick action icons
- Mobile menu panel and backdrop

Important details:
- navLinkClass marks current page with active class.
- syncHeaderOffset writes header height into CSS variable for body padding and overlay offsets.
- Resize listener recalculates offset and closes mobile menu on larger widths.

Mobile menu toggling:
- toggleMobileMenu(forceOpen) opens/closes menu, backdrop, and body lock.
- closeMobileMenu() closes and resets aria-expanded.

Conflict management:
- Opening mobile menu forces search/cart/profile closed to avoid stacked overlays.

### H) Overlay Construction and Binding

ensureOverlayContainers() conditionally injects missing UI containers:
- Search backdrop
- Search popup
- Cart drawer
- Profile menu if logged in

Search popup logic:
- toggleSearchPopup toggles popup/backdrop, body class, and focus.
- bindSearchPopup handles:
  - Live search previews
  - Enter key submit
  - Form submit redirect to search page
  - Escape and backdrop close

Cart drawer logic:
- toggleCartDrawer opens/closes cart drawer and triggers renderCartDrawer when opened.
- renderCartDrawer handles both empty and non-empty states.
- Checkout button routes to auth with redirect when not logged in.

Profile logic:
- toggleProfileMenu just toggles visibility.
- Logout action is handled in delegated click handler.

### I) Global Click Delegation Strategy

bindGlobalClicks() adds document-level listeners to handle:

Action clicks via data-action:
- wishlist-toggle
- add-to-cart
- cart-inc
- cart-dec
- cart-remove
- order-view (inside orders page logic)

Global close behavior:
- Click outside search closes search popup.
- Click outside profile closes profile menu.
- Click outside cart closes cart drawer.

Why delegation is used:
- Most HTML is dynamically re-rendered.
- Delegation avoids attaching and reattaching many per-element listeners.

### J) Page Renderers Detailed

#### renderHome
- Creates hero video block and manual pause/play button.
- Rotates text slides with interval while not paused.
- Builds trending list from ranking formula rating * reviews.
- Calculates count based on viewport columns/rows.
- Renders men/women collection banners.
- Renders about preview strip with image cards.
- Renders benefits cards with icons.

#### renderCatalogPage(products, includeGender)
- Builds filter sidebar + mobile filter form.
- Adds heading row with real filter toggle button.
- Uses selected state object:
  - maxPrice
  - categories set
  - sizes set
  - brands set
  - gender
- setFilterPanelVisibility handles collapsed/expanded filter panel on small screens.
- syncFilterControls keeps desktop and mobile controls in sync.
- renderFiltered applies all active constraints and redraws product grid.
- Reset buttons clear all selected filters and rerender.

Filter evaluation order:
1. price threshold
2. category set
3. size set
4. brand set
5. gender (if includeGender)

#### renderFeatured
- Sorts all products by price descending.
- Ensures specific product IDs are included.
- Removes duplicates and renders final list.

#### renderAbout
- Computes summary metrics from product data.
- Renders values cards.
- Renders timeline cards from top-ranked products.

#### renderProductPage
- Reads product id from query.
- Handles not found state.
- Controls image carousel index and selected size.
- Renders gallery, thumbnails, size buttons, add-to-cart and wishlist controls.
- Re-renders after selection so selected classes stay accurate.

#### renderSearchPage
- Reads q query parameter.
- Shows guidance if query is empty.
- Filters products by title/brand/category text and renders cards.

#### renderWishlistPage
- Reads wishlist ids, maps to products using byId, filters missing entries, renders cards.

#### renderAuthPage
- Controls tab switch between login and signup forms.
- Login flow:
  - Validates phone and password presence.
  - Finds user by phone.
  - Hashes entered password and compares to stored hash.
  - Stores current user key and redirects.
- Signup flow:
  - Validates name, phone, password strength, confirm match.
  - Prevents duplicate phone registration.
  - Hashes password, stores user, sets current user, redirects.

#### renderCheckoutPage
- Redirects to auth if no current user.
- Loads cart and blocks submit if empty.
- Pre-fills user name/phone.
- Renders summary cards with totals.
- On submit, validates all fields, creates order object, prepends order list, clears cart, redirects to confirmation page.

#### renderConfirmationPage
- Shows order id and 10 second countdown.
- Auto-redirects to my-orders page.

#### renderOrdersPage
- Redirects to auth if user missing.
- Loads only orders for current user phone.
- Renders list cards with View Details buttons.
- renderOrderDetail(order) paints detailed item/address/total summary and highlights selected card.

### K) Validation Rules Exact Intent

- validatePhone: strict 10 digits.
- validateName: letters/spaces only, starts with letter, length 2 to 50.
- validatePassword: minimum 8 chars with uppercase, lowercase, digit.
- validateEmail: standard basic email pattern.
- validateZip: 5 or 6 digits.

These checks are all front-end validation for UX and input hygiene.

### L) Router Function Design

rerenderCurrentPage() is the page switchboard.
- It checks page value once.
- Calls one renderer only.
- Also reused after wishlist toggle to refresh current screen state.

This keeps one script usable for all pages without separate bundles.

## CSS Deep Mapping by Component

This section explains which selectors style which visual part and why.

### 1) Foundation Layer

- root variables define shared visual tokens (colors, radius, shadow, header offset).
- Universal box-sizing and typography defaults normalize layout behavior.
- body top padding uses header offset so fixed header does not overlap content.

### 2) Header and Nav Layer

- site-header makes header fixed with blur and border.
- nav-inner sets max width and horizontal alignment.
- nav-desktop visible on desktop; hidden under tablet breakpoint.
- nav-mobile-actions hidden by default and shown on smaller screens.
- menu-toggle and mobile-menu classes build hamburger and full mobile menu panel.
- icon-count style creates small numeric badges on icon buttons.

### 3) Search Overlay Layer

- search-backdrop is full-screen dim overlay.
- search-pop is centered floating panel below header.
- search-input-shell styles icon + input capsule.
- quick-results and quick-item define preview list cards.

### 4) Shared Button and Card Layer

- btn-primary gradient action style.
- btn-secondary outline red style.
- btn-outline neutral utility button.
- section-card shared border, radius, and shadow shell used in many sections.

### 5) Product Grid and Product Card Layer

- product-grid and featured-grid define responsive card columns.
- product-card provides card structure, hover lift, and border transitions.
- product-card img uses object-fit contain to avoid shoe cropping.
- heart-btn styles wishlist button states.

### 6) Catalog and Filter Layer

- catalog-layout defines desktop two-column layout.
- catalog-title-row aligns page title and filter toggle button.
- catalog-filter-toggle styles the new real filter control button.
- filter-panel provides sticky desktop filter container with scroll.
- filter-chip + checked styles create selectable chips.
- filter-select-field and filter-select style dropdown-based mobile filters.
- filter-panel-collapsed hides panel when toggled on smaller viewports.

### 7) Home Composition Layer

- hero and hero-overlay style the video hero and dark gradient text overlay.
- trending-wrap creates dark-red trending theme block.
- gender-banner and banner-text place collection images and text overlays.
- about-strip-grid and about-image-panel style the about image tiles.
- benefits and benefit styles design the icon benefit cards.

### 8) Cart Drawer Layer

- cart-drawer defines fixed right-side panel and animations.
- drawer-head and drawer-foot style top and bottom sections.
- cart-items and cart-item define scrollable list and item cards.
- qty-control styles plus/minus quantity controls.
- cart-summary and summary-row style totals section.

### 9) Product Detail Layer

- product-detail creates two-column detail layout.
- gallery-main and thumb-row styles image browsing UI.
- size-grid styles size selection buttons and selected state.

### 10) Auth, About, Checkout, Orders Layer

- Auth classes provide split intro/form layout and tab controls.
- About classes build hero, metric cards, values cards, and timeline steps.
- Checkout/Orders classes share consistent card-based information blocks.
- order-card and order-detail classes control list/details experience.

### 11) Responsive Override Strategy

At max-width 1024px:
- Desktop nav hidden, mobile controls shown.
- Catalog becomes one column.
- Filter toggle appears.
- Filter panel can collapse.

At max-width 680px:
- Spacing and component sizes are reduced.
- Grids become 2 columns or stacked depending on section.
- Cart and forms become denser.

At max-width 480px:
- Product and featured grids go single-column.
- More compact image and banner scaling rules apply.

At min-width 1440px and 1920px:
- Layout containers widen.
- Product grids and hero visuals scale for larger displays.

## Event and Data Flow Matrix

Use this matrix to understand what changes when an action happens.

- Click wishlist heart:
  - Function: toggleWishlist
  - Data changed: adokicks_wishlist
  - UI refresh: header badges + current page rerender

- Click add to bag:
  - Function: addToCart
  - Data changed: adokicks_cart
  - UI refresh: header badges + toast

- Cart qty plus/minus:
  - Function: updateCartQty
  - Data changed: adokicks_cart
  - UI refresh: cart drawer rerender + header badges

- Reset filters:
  - Function block inside renderCatalogPage
  - Data changed: in-memory selected object only
  - UI refresh: product grid rerender

- Submit signup:
  - Functions: validation helpers + sha256 + storageSet
  - Data changed: adokicks_users + adokicks_current_user_phone
  - UI refresh: redirect

- Submit checkout:
  - Functions: renderCheckoutPage submit handler
  - Data changed: adokicks_orders prepend + adokicks_cart clear
  - UI refresh: redirect confirmation page

## Suggested Reading with Code Focus

If your goal is deep understanding, follow this sequence while keeping browser open:

1. Read js/app.js from top to bottom once.
2. Re-read renderHeader, ensureOverlayContainers, bindGlobalClicks.
3. Re-read renderCatalogPage and trace selected object updates.
4. Re-read renderProductPage and understand rerender-on-state-change pattern.
5. Re-read renderCheckoutPage and renderOrdersPage for persistence flow.
6. Then scan css/styles.css by sections in this order:
   - root/base
   - header/nav
   - product card
   - filter panel
   - cart drawer
   - checkout/orders
   - media queries

This path gives the fastest full mental model of how the app works end to end.

## Code Reference (File + Line)

Use this section as a quick jump index while reading code.

### JavaScript: Core Flow
- App bootstrap start: [js/app.js](js/app.js#L1)
- State and constants: [js/app.js](js/app.js#L4)
- Current page detection: [js/app.js](js/app.js#L30)
- Router switch: [js/app.js](js/app.js#L2144)
- App initializer: [js/app.js](js/app.js#L2190)

### JavaScript: Storage and Helpers
- storageGet: [js/app.js](js/app.js#L32)
- storageSet: [js/app.js](js/app.js#L41)
- getUsers: [js/app.js](js/app.js#L45)
- getCurrentUserPhone: [js/app.js](js/app.js#L49)
- getCurrentUser: [js/app.js](js/app.js#L53)
- getCart: [js/app.js](js/app.js#L61)
- setCart: [js/app.js](js/app.js#L65)
- getWishlist: [js/app.js](js/app.js#L70)
- setWishlist: [js/app.js](js/app.js#L74)
- getOrders: [js/app.js](js/app.js#L79)
- setOrders: [js/app.js](js/app.js#L83)
- formatCurrency: [js/app.js](js/app.js#L87)
- params: [js/app.js](js/app.js#L91)
- sanitize: [js/app.js](js/app.js#L95)
- toast: [js/app.js](js/app.js#L104)

### JavaScript: Data and Product Utilities
- mapProducts: [js/app.js](js/app.js#L122)
- loadData: [js/app.js](js/app.js#L140)
- productCard: [js/app.js](js/app.js#L154)
- totalsFromCart: [js/app.js](js/app.js#L176)
- isWishlisted: [js/app.js](js/app.js#L187)
- toggleWishlist: [js/app.js](js/app.js#L191)
- addToCart: [js/app.js](js/app.js#L202)
- updateCartQty: [js/app.js](js/app.js#L218)
- removeFromCart: [js/app.js](js/app.js#L230)
- updateHeaderBadges: [js/app.js](js/app.js#L236)

### JavaScript: Header, Menu, and Overlays
- navLinkClass: [js/app.js](js/app.js#L253)
- syncHeaderOffset: [js/app.js](js/app.js#L266)
- closeMobileMenu: [js/app.js](js/app.js#L272)
- toggleMobileMenu: [js/app.js](js/app.js#L289)
- renderHeader: [js/app.js](js/app.js#L323)
- renderFooter: [js/app.js](js/app.js#L455)
- ensureOverlayContainers: [js/app.js](js/app.js#L500)
- toggleSearchPopup: [js/app.js](js/app.js#L569)
- quickSearch: [js/app.js](js/app.js#L595)
- bindSearchPopup: [js/app.js](js/app.js#L605)
- toggleCartDrawer: [js/app.js](js/app.js#L690)
- renderCartDrawer: [js/app.js](js/app.js#L708)
- toggleProfileMenu: [js/app.js](js/app.js#L777)
- bindGlobalClicks: [js/app.js](js/app.js#L787)

### JavaScript: Page Renderers
- renderHome: [js/app.js](js/app.js#L914)
- buildCatalogFilters: [js/app.js](js/app.js#L1065)
- renderCatalogPage: [js/app.js](js/app.js#L1080)
- setFilterPanelVisibility block: [js/app.js](js/app.js#L1237)
- syncFilterControls block: [js/app.js](js/app.js#L1273)
- renderFiltered block: [js/app.js](js/app.js#L1332)
- renderFeatured: [js/app.js](js/app.js#L1445)
- renderAbout: [js/app.js](js/app.js#L1464)
- renderProductPage: [js/app.js](js/app.js#L1554)
- renderSearchPage: [js/app.js](js/app.js#L1661)
- renderWishlistPage: [js/app.js](js/app.js#L1678)
- renderAuthPage: [js/app.js](js/app.js#L1719)
- renderCheckoutPage: [js/app.js](js/app.js#L1831)
- renderConfirmationPage: [js/app.js](js/app.js#L1982)
- renderOrdersPage: [js/app.js](js/app.js#L2004)

### JavaScript: Validation and Security
- validatePhone: [js/app.js](js/app.js#L1688)
- validateName: [js/app.js](js/app.js#L1692)
- validatePassword: [js/app.js](js/app.js#L1696)
- validateEmail: [js/app.js](js/app.js#L1700)
- validateZip: [js/app.js](js/app.js#L1704)
- sha256: [js/app.js](js/app.js#L1708)

### CSS: Foundation and Shared UI
- Design tokens (:root): [css/styles.css](css/styles.css#L1)
- Base element reset: [css/styles.css](css/styles.css#L18)
- Shared page hero block: [css/styles.css](css/styles.css#L79)
- Search popup shell: [css/styles.css](css/styles.css#L135)
- Header shell (.site-header): [css/styles.css](css/styles.css#L329)
- Nav layout (.nav-inner): [css/styles.css](css/styles.css#L347)
- Mobile menu panel: [css/styles.css](css/styles.css#L493)
- Shared button styles: [css/styles.css](css/styles.css#L441)

### CSS: Home and Product UI
- Hero container: [css/styles.css](css/styles.css#L637)
- Section card utility: [css/styles.css](css/styles.css#L691)
- Trending wrapper: [css/styles.css](css/styles.css#L716)
- Grid defaults: [css/styles.css](css/styles.css#L752)
- Product card: [css/styles.css](css/styles.css#L816)
- Product image block: [css/styles.css](css/styles.css#L839)
- Wishlist heart button: [css/styles.css](css/styles.css#L886)

### CSS: Catalog and Filters
- Catalog layout: [css/styles.css](css/styles.css#L922)
- Catalog title row: [css/styles.css](css/styles.css#L928)
- Catalog filter toggle button: [css/styles.css](css/styles.css#L940)
- Filter panel shell: [css/styles.css](css/styles.css#L968)
- Filter panel header: [css/styles.css](css/styles.css#L998)
- Filter group block: [css/styles.css](css/styles.css#L1020)
- Filter chip styles: [css/styles.css](css/styles.css#L1075)
- Mobile filter select field: [css/styles.css](css/styles.css#L2336)
- Mobile filter select element: [css/styles.css](css/styles.css#L2362)

### CSS: Banners, About Strip, and Footer
- Gender banner: [css/styles.css](css/styles.css#L1130)
- Gender banner image: [css/styles.css](css/styles.css#L1147)
- About strip grid: [css/styles.css](css/styles.css#L1197)
- About image panel: [css/styles.css](css/styles.css#L1206)
- Benefits grid: [css/styles.css](css/styles.css#L1247)
- Footer shell: [css/styles.css](css/styles.css#L1281)

### CSS: Cart, Product Detail, Auth, Checkout, Orders
- Cart drawer: [css/styles.css](css/styles.css#L1329)
- Cart item list: [css/styles.css](css/styles.css#L1431)
- Product detail layout: [css/styles.css](css/styles.css#L1647)
- Auth page background: [css/styles.css](css/styles.css#L1742)
- Auth shell: [css/styles.css](css/styles.css#L1750)
- About page shell: [css/styles.css](css/styles.css#L1862)
- Checkout/orders grid: [css/styles.css](css/styles.css#L2072)
- Orders list: [css/styles.css](css/styles.css#L2243)
- Order detail grid: [css/styles.css](css/styles.css#L2295)

### CSS: Responsive Breakpoints
- Tablet and down (max-width 1024): [css/styles.css](css/styles.css#L2468)
- Small tablets/large phones (max-width 680): [css/styles.css](css/styles.css#L2673)
- Phones (max-width 480): [css/styles.css](css/styles.css#L2914)
- Large desktop (min-width 1440): [css/styles.css](css/styles.css#L2963)
- Ultra-wide desktop (min-width 1920): [css/styles.css](css/styles.css#L3001)
