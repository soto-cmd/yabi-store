const defaultProducts = [
  { id: 1, name: 'Set de accesorios Rose', category: 'Accesorios', price: 85000, badge: 'Nuevo', code: 'AR', image: '', active: true },
  { id: 2, name: 'Neceser blush', category: 'Belleza', price: 65000, badge: 'Favorito', code: 'NB', image: '', active: true },
  { id: 3, name: 'Vela aromática floral', category: 'Hogar', price: 72000, badge: '', code: 'VF', image: '', active: true },
  { id: 4, name: 'Caja regalo YABI', category: 'Regalos', price: 120000, badge: 'Especial', code: 'YG', image: '', active: true },
  { id: 5, name: 'Aros minimal pink', category: 'Accesorios', price: 55000, badge: '', code: 'AM', image: '', active: true },
  { id: 6, name: 'Kit beauty essentials', category: 'Belleza', price: 98000, badge: 'Top', code: 'KB', image: '', active: true },
  { id: 7, name: 'Difusor decorativo', category: 'Hogar', price: 89000, badge: '', code: 'DD', image: '', active: true },
  { id: 8, name: 'Mini box sorpresa', category: 'Regalos', price: 75000, badge: 'Nuevo', code: 'MS', image: '', active: true }
];

const defaultSettings = {
  whatsapp: '595982408477',
  whatsappDisplay: '+595 982 408477',
  location: 'Santa María de Fe, Misiones, Paraguay'
};

const $ = id => document.getElementById(id);
const formatGs = value => `Gs. ${Number(value || 0).toLocaleString('es-PY')}`;
const getStored = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

let products = getStored('yabi-products', defaultProducts);
let settings = { ...defaultSettings, ...getStored('yabi-settings', {}) };
let searchTerm = '';
let categoryFilter = 'Todos';

function saveProducts() {
  localStorage.setItem('yabi-products', JSON.stringify(products));
}

function saveSettings() {
  localStorage.setItem('yabi-settings', JSON.stringify(settings));
}

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(window.yabiToastTimer);
  window.yabiToastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function renderMetrics() {
  $('metricProducts').textContent = products.length;
  $('metricActive').textContent = products.filter(p => p.active !== false).length;
  $('metricCategories').textContent = new Set(products.map(p => p.category).filter(Boolean)).size;
  $('metricValue').textContent = formatGs(products.reduce((sum, p) => sum + Number(p.price || 0), 0));
}

function renderCategories() {
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
  const select = $('adminCategoryFilter');
  const current = select.value || categoryFilter;
  select.innerHTML = '<option value="Todos">Todas las categorías</option>' + categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
  if ([...select.options].some(o => o.value === current)) select.value = current;
}

function thumb(product) {
  if (product.image) return `<img src="${product.image}" alt="${product.name}" onerror="this.parentElement.textContent='${product.code || 'Y'}'">`;
  return product.code || 'Y';
}

function renderProducts() {
  const visible = products.filter(product => {
    const matchesSearch = `${product.name} ${product.category} ${product.badge || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Todos' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  $('productList').innerHTML = visible.length ? visible.map(product => `
    <article class="product-row ${product.active === false ? 'inactive' : ''}">
      <div class="product-thumb">${thumb(product)}</div>
      <div class="product-main">
        <strong>${product.name}</strong>
        <small>${product.category}${product.badge ? ` · ${product.badge}` : ''}${product.active === false ? ' · Oculto' : ''}</small>
        <div class="product-price">${formatGs(product.price)}</div>
      </div>
      <div class="row-actions">
        <button class="mini-btn" onclick="editProduct(${product.id})">Editar</button>
        <button class="mini-btn" onclick="toggleProduct(${product.id})">${product.active === false ? 'Mostrar' : 'Ocultar'}</button>
      </div>
    </article>
  `).join('') : '<div class="empty-state">No hay productos para mostrar.</div>';

  renderMetrics();
  renderCategories();
}

function clearForm() {
  $('productId').value = '';
  $('productName').value = '';
  $('productCategory').value = '';
  $('productPrice').value = '';
  $('productBadge').value = '';
  $('productCode').value = '';
  $('productImage').value = '';
  $('productActive').checked = true;
  $('editorTitle').textContent = 'Nuevo producto';
  $('deleteProductBtn').disabled = true;
}

window.editProduct = function(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  $('productId').value = product.id;
  $('productName').value = product.name;
  $('productCategory').value = product.category;
  $('productPrice').value = product.price;
  $('productBadge').value = product.badge || '';
  $('productCode').value = product.code || '';
  $('productImage').value = product.image || '';
  $('productActive').checked = product.active !== false;
  $('editorTitle').textContent = 'Editar producto';
  $('deleteProductBtn').disabled = false;
  if (window.innerWidth < 1050) document.querySelector('.editor-panel').scrollIntoView({ behavior: 'smooth' });
};

window.toggleProduct = function(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  product.active = product.active === false;
  saveProducts();
  renderProducts();
  toast(product.active ? 'Producto visible' : 'Producto oculto');
};

$('productForm').addEventListener('submit', event => {
  event.preventDefault();
  const id = Number($('productId').value);
  const data = {
    name: $('productName').value.trim(),
    category: $('productCategory').value.trim(),
    price: Number($('productPrice').value),
    badge: $('productBadge').value.trim(),
    code: ($('productCode').value.trim() || 'Y').toUpperCase(),
    image: $('productImage').value.trim(),
    active: $('productActive').checked
  };

  if (id) {
    products = products.map(p => p.id === id ? { ...p, ...data } : p);
    toast('Producto actualizado');
  } else {
    const nextId = products.length ? Math.max(...products.map(p => Number(p.id) || 0)) + 1 : 1;
    products.unshift({ id: nextId, ...data });
    toast('Producto agregado');
  }

  saveProducts();
  clearForm();
  renderProducts();
});

$('deleteProductBtn').addEventListener('click', () => {
  const id = Number($('productId').value);
  const product = products.find(p => p.id === id);
  if (!product) return;
  if (!confirm(`¿Eliminar definitivamente “${product.name}”?`)) return;
  products = products.filter(p => p.id !== id);
  saveProducts();
  clearForm();
  renderProducts();
  toast('Producto eliminado');
});

$('newProductBtn').addEventListener('click', () => {
  clearForm();
  $('productName').focus();
});
$('cancelEditBtn').addEventListener('click', clearForm);
$('adminSearch').addEventListener('input', e => {
  searchTerm = e.target.value;
  renderProducts();
});
$('adminCategoryFilter').addEventListener('change', e => {
  categoryFilter = e.target.value;
  renderProducts();
});

function loadSettingsForm() {
  $('settingWhatsapp').value = settings.whatsapp;
  $('settingWhatsappDisplay').value = settings.whatsappDisplay;
  $('settingLocation').value = settings.location;
}

$('settingsForm').addEventListener('submit', event => {
  event.preventDefault();
  settings = {
    whatsapp: $('settingWhatsapp').value.replace(/\D/g, ''),
    whatsappDisplay: $('settingWhatsappDisplay').value.trim(),
    location: $('settingLocation').value.trim()
  };
  saveSettings();
  toast('Configuración guardada');
});

$('exportBtn').addEventListener('click', () => {
  const payload = {
    app: 'YABI Store',
    version: 1,
    exportedAt: new Date().toISOString(),
    products,
    settings
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `yabi-store-respaldo-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast('Respaldo descargado');
});

$('importInput').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.products) || !data.settings) throw new Error('Formato inválido');
    if (!confirm('Esto reemplazará los datos locales actuales. ¿Continuar?')) return;
    products = data.products;
    settings = { ...defaultSettings, ...data.settings };
    saveProducts();
    saveSettings();
    renderProducts();
    loadSettingsForm();
    clearForm();
    toast('Respaldo importado');
  } catch {
    alert('No se pudo importar el archivo. Verificá que sea un respaldo válido de YABI Store.');
  } finally {
    event.target.value = '';
  }
});

$('resetBtn').addEventListener('click', () => {
  if (!confirm('¿Restaurar productos y configuración de ejemplo? Se reemplazarán los datos locales actuales.')) return;
  products = JSON.parse(JSON.stringify(defaultProducts));
  settings = { ...defaultSettings };
  saveProducts();
  saveSettings();
  renderProducts();
  loadSettingsForm();
  clearForm();
  toast('Datos restaurados');
});

loadSettingsForm();
renderProducts();
clearForm();
