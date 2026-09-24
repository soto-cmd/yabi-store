const SUPABASE_URL = 'https://oxirewjzmnfnbwiugoac.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gkc-Cjh2ykNYvlf5JRf3NQ_UU2s73jC';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const CACHE_TTL = 10 * 60 * 1000;

const defaults = {
  products: [],
  settings: { whatsapp: '595982408477', location: 'Santa María de Fe, Misiones, Paraguay' }
};

const $ = id => document.getElementById(id);
const formatGs = value => `Gs. ${Number(value || 0).toLocaleString('es-PY')}`;
const productGrid = $('productGrid');
const cartItems = $('cartItems');
const cartEmpty = $('cartEmpty');
const cartCount = $('cartCount');
const cartTotal = $('cartTotal');
const cartDrawer = $('cartDrawer');
const drawerOverlay = $('drawerOverlay');
const searchPanel = $('searchPanel');
const searchInput = $('searchInput');

let products = [];
let storeSettings = { ...defaults.settings };
let currentFilter = 'Todos';
let searchTerm = '';
let cart = JSON.parse(localStorage.getItem('yabi-cart') || '[]');

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem('yabi-public-cache') || 'null');
    if (cached && Date.now() - cached.savedAt < CACHE_TTL) return cached;
  } catch {}
  return null;
}

function writeCache() {
  localStorage.setItem('yabi-public-cache', JSON.stringify({ savedAt: Date.now(), products, settings: storeSettings }));
}

async function loadStoreData() {
  const cached = readCache();
  if (cached) {
    products = cached.products || [];
    storeSettings = { ...storeSettings, ...(cached.settings || {}) };
    applySettings();
    renderProducts();
    renderCart();
    return;
  }

  const [{ data: productRows, error: productError }, { data: settingRow, error: settingError }] = await Promise.all([
    db.from('yabi_products').select('id,name,category,price,badge,code,image_url,active,sort_order').eq('active', true).order('sort_order').order('id'),
    db.from('yabi_settings').select('whatsapp,location').eq('id', 1).single()
  ]);

  if (!productError && productRows) {
    products = productRows.map(p => ({ ...p, image: p.image_url || '' }));
  }
  if (!settingError && settingRow) storeSettings = { ...storeSettings, ...settingRow };

  if (!productError || !settingError) writeCache();
  applySettings();
  renderProducts();
  renderCart();
}

function phoneDisplay(number) {
  if (number === '595982408477') return '+595 982 408477';
  return `+${number}`;
}

function applySettings() {
  document.querySelectorAll('[data-store-whatsapp]').forEach(link => link.href = `https://wa.me/${storeSettings.whatsapp}`);
  document.querySelectorAll('[data-store-location]').forEach(el => el.textContent = storeSettings.location);
  document.querySelectorAll('[data-store-phone]').forEach(el => el.textContent = phoneDisplay(storeSettings.whatsapp));
}

function productVisual(product) {
  if (product.image) return `<img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'" /><span class="product-code-fallback" style="display:none">${product.code || 'Y'}</span>`;
  return `<span>${product.code || 'Y'}</span>`;
}

function renderProducts() {
  const visible = products.filter(product => {
    const filterMatch = currentFilter === 'Todos' || product.category === currentFilter;
    const searchMatch = `${product.name} ${product.category}`.toLowerCase().includes(searchTerm.toLowerCase());
    return filterMatch && searchMatch;
  });
  productGrid.innerHTML = visible.length ? visible.map(product => `
    <article class="product-card"><div class="product-image">${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}${productVisual(product)}</div><div class="product-info"><div class="product-category">${product.category}</div><h3>${product.name}</h3><div class="product-meta"><strong class="product-price">${formatGs(product.price)}</strong><button class="add-btn" aria-label="Agregar ${product.name} al carrito" onclick="addToCart(${product.id})">+</button></div></div></article>
  `).join('') : '<div class="empty-products">No encontramos productos con ese filtro.</div>';
}

window.addToCart = function(id) {
  const existing = cart.find(item => item.id === id);
  if (existing) existing.qty += 1; else cart.push({ id, qty: 1 });
  localStorage.setItem('yabi-cart', JSON.stringify(cart));
  renderCart(); openCart();
};

window.removeFromCart = function(id) {
  cart = cart.filter(item => item.id !== id);
  localStorage.setItem('yabi-cart', JSON.stringify(cart));
  renderCart();
};

function renderCart() {
  cart = cart.filter(item => products.some(p => p.id === item.id));
  const detailed = cart.map(item => ({ ...products.find(p => p.id === item.id), qty: item.qty }));
  cartCount.textContent = detailed.reduce((sum, item) => sum + item.qty, 0);
  cartTotal.textContent = formatGs(detailed.reduce((sum, item) => sum + item.price * item.qty, 0));
  cartEmpty.style.display = detailed.length ? 'none' : 'block';
  cartItems.innerHTML = detailed.map(item => `<div class="cart-item"><div class="cart-thumb">${item.code || 'Y'}</div><div><h4>${item.name}</h4><small>${item.qty} × ${formatGs(item.price)}</small></div><button onclick="removeFromCart(${item.id})" aria-label="Quitar ${item.name}">×</button></div>`).join('');
}

function openCart() { cartDrawer.classList.add('open'); drawerOverlay.classList.add('open'); document.body.classList.add('locked'); }
function closeCart() { cartDrawer.classList.remove('open'); drawerOverlay.classList.remove('open'); document.body.classList.remove('locked'); }

function checkoutWhatsApp() {
  if (!cart.length) return;
  const detailed = cart.map(item => ({ ...products.find(p => p.id === item.id), qty: item.qty }));
  const total = detailed.reduce((sum, item) => sum + item.price * item.qty, 0);
  const lines = detailed.map(item => `• ${item.name} x${item.qty} — ${formatGs(item.price * item.qty)}`);
  const message = encodeURIComponent(`Hola YABI Store, quisiera consultar por este pedido:\n\n${lines.join('\n')}\n\nTotal estimado: ${formatGs(total)}\nUbicación: ${storeSettings.location}`);
  window.open(`https://wa.me/${storeSettings.whatsapp}?text=${message}`, '_blank');
}

document.querySelectorAll('.filter-btn').forEach(button => button.addEventListener('click', () => { document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active')); button.classList.add('active'); currentFilter = button.dataset.filter; renderProducts(); }));
document.querySelectorAll('.category-card').forEach(card => card.addEventListener('click', () => { currentFilter = card.dataset.category; document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === currentFilter)); renderProducts(); $('productos').scrollIntoView({ behavior: 'smooth' }); }));
$('searchToggle').addEventListener('click', () => { searchPanel.classList.toggle('open'); if (searchPanel.classList.contains('open')) searchInput.focus(); });
searchInput.addEventListener('input', event => { searchTerm = event.target.value; renderProducts(); });
$('cartOpen').addEventListener('click', openCart); $('cartClose').addEventListener('click', closeCart); drawerOverlay.addEventListener('click', closeCart); $('checkoutBtn').addEventListener('click', checkoutWhatsApp); $('year').textContent = new Date().getFullYear();

loadStoreData();
