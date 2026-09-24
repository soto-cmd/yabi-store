const products = [
  { id: 1, name: 'Set de accesorios Rose', category: 'Accesorios', price: 85000, badge: 'Nuevo', code: 'AR' },
  { id: 2, name: 'Neceser blush', category: 'Belleza', price: 65000, badge: 'Favorito', code: 'NB' },
  { id: 3, name: 'Vela aromática floral', category: 'Hogar', price: 72000, badge: '', code: 'VF' },
  { id: 4, name: 'Caja regalo YABI', category: 'Regalos', price: 120000, badge: 'Especial', code: 'YG' },
  { id: 5, name: 'Aros minimal pink', category: 'Accesorios', price: 55000, badge: '', code: 'AM' },
  { id: 6, name: 'Kit beauty essentials', category: 'Belleza', price: 98000, badge: 'Top', code: 'KB' },
  { id: 7, name: 'Difusor decorativo', category: 'Hogar', price: 89000, badge: '', code: 'DD' },
  { id: 8, name: 'Mini box sorpresa', category: 'Regalos', price: 75000, badge: 'Nuevo', code: 'MS' }
];

const formatGs = value => `Gs. ${value.toLocaleString('es-PY')}`;
const productGrid = document.getElementById('productGrid');
const cartItems = document.getElementById('cartItems');
const cartEmpty = document.getElementById('cartEmpty');
const cartCount = document.getElementById('cartCount');
const cartTotal = document.getElementById('cartTotal');
const cartDrawer = document.getElementById('cartDrawer');
const drawerOverlay = document.getElementById('drawerOverlay');
const searchPanel = document.getElementById('searchPanel');
const searchInput = document.getElementById('searchInput');

let currentFilter = 'Todos';
let searchTerm = '';
let cart = JSON.parse(localStorage.getItem('yabi-cart') || '[]');

function renderProducts() {
  const visible = products.filter(product => {
    const filterMatch = currentFilter === 'Todos' || product.category === currentFilter;
    const searchMatch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return filterMatch && searchMatch;
  });

  productGrid.innerHTML = visible.length ? visible.map(product => `
    <article class="product-card">
      <div class="product-image">
        ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
        <span>${product.code}</span>
      </div>
      <div class="product-info">
        <div class="product-category">${product.category}</div>
        <h3>${product.name}</h3>
        <div class="product-meta">
          <strong class="product-price">${formatGs(product.price)}</strong>
          <button class="add-btn" aria-label="Agregar ${product.name} al carrito" onclick="addToCart(${product.id})">+</button>
        </div>
      </div>
    </article>
  `).join('') : '<div class="empty-products">No encontramos productos con ese filtro.</div>';
}

function addToCart(id) {
  const existing = cart.find(item => item.id === id);
  if (existing) existing.qty += 1;
  else cart.push({ id, qty: 1 });
  persistCart();
  renderCart();
  openCart();
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  persistCart();
  renderCart();
}

function persistCart() {
  localStorage.setItem('yabi-cart', JSON.stringify(cart));
}

function renderCart() {
  const detailed = cart.map(item => ({ ...products.find(p => p.id === item.id), qty: item.qty }));
  const totalQty = detailed.reduce((sum, item) => sum + item.qty, 0);
  const totalValue = detailed.reduce((sum, item) => sum + item.price * item.qty, 0);

  cartCount.textContent = totalQty;
  cartTotal.textContent = formatGs(totalValue);
  cartEmpty.style.display = detailed.length ? 'none' : 'block';

  cartItems.innerHTML = detailed.map(item => `
    <div class="cart-item">
      <div class="cart-thumb">${item.code}</div>
      <div>
        <h4>${item.name}</h4>
        <small>${item.qty} × ${formatGs(item.price)}</small>
      </div>
      <button onclick="removeFromCart(${item.id})" aria-label="Quitar ${item.name}">×</button>
    </div>
  `).join('');
}

function openCart() {
  cartDrawer.classList.add('open');
  drawerOverlay.classList.add('open');
  document.body.classList.add('locked');
}

function closeCart() {
  cartDrawer.classList.remove('open');
  drawerOverlay.classList.remove('open');
  document.body.classList.remove('locked');
}

function checkoutWhatsApp() {
  if (!cart.length) return;
  const detailed = cart.map(item => ({ ...products.find(p => p.id === item.id), qty: item.qty }));
  const total = detailed.reduce((sum, item) => sum + item.price * item.qty, 0);
  const lines = detailed.map(item => `• ${item.name} x${item.qty} — ${formatGs(item.price * item.qty)}`);
  const message = encodeURIComponent(`Hola YABI Store, quisiera consultar por este pedido:\n\n${lines.join('\n')}\n\nTotal estimado: ${formatGs(total)}\n\nUbicación: Santa María de Fe`);
  const whatsappNumber = '595982408477';
  window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
}

document.querySelectorAll('.filter-btn').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    currentFilter = button.dataset.filter;
    renderProducts();
  });
});

document.querySelectorAll('.category-card').forEach(card => {
  card.addEventListener('click', () => {
    currentFilter = card.dataset.category;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === currentFilter));
    renderProducts();
    document.getElementById('productos').scrollIntoView({ behavior: 'smooth' });
  });
});

document.getElementById('searchToggle').addEventListener('click', () => {
  searchPanel.classList.toggle('open');
  if (searchPanel.classList.contains('open')) searchInput.focus();
});
searchInput.addEventListener('input', event => {
  searchTerm = event.target.value;
  renderProducts();
});
document.getElementById('cartOpen').addEventListener('click', openCart);
document.getElementById('cartClose').addEventListener('click', closeCart);
drawerOverlay.addEventListener('click', closeCart);
document.getElementById('checkoutBtn').addEventListener('click', checkoutWhatsApp);
document.getElementById('year').textContent = new Date().getFullYear();

renderProducts();
renderCart();