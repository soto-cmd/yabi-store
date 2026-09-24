const SUPABASE_URL = 'https://oxirewjzmnfnbwiugoac.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gkc-Cjh2ykNYvlf5JRf3NQ_UU2s73jC';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = id => document.getElementById(id);
const formatGs = value => `Gs. ${Number(value || 0).toLocaleString('es-PY')}`;
let products = [];
let settings = { whatsapp: '595982408477', location: 'Santa María de Fe, Misiones, Paraguay' };
let searchTerm = '';
let categoryFilter = 'Todos';

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(window.yabiToastTimer);
  window.yabiToastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function invalidatePublicCache() {
  localStorage.removeItem('yabi-public-cache');
}

async function verifyAdmin() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return false;
  const { data, error } = await db.from('yabi_admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
  return !error && !!data;
}

async function showCorrectView() {
  const isAdmin = await verifyAdmin();
  $('loginPanel').hidden = isAdmin;
  $('adminContent').hidden = !isAdmin;
  $('logoutBtn').hidden = !isAdmin;
  if (isAdmin) await loadAdminData();
}

$('loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  $('loginError').textContent = '';
  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    $('loginError').textContent = 'No se pudo iniciar sesión. Verificá el correo y la contraseña.';
    return;
  }
  if (!(await verifyAdmin())) {
    await db.auth.signOut();
    $('loginError').textContent = 'Esta cuenta no está autorizada como administradora de YABI Store.';
    return;
  }
  $('loginForm').reset();
  await showCorrectView();
});

$('logoutBtn').addEventListener('click', async () => {
  await db.auth.signOut();
  await showCorrectView();
});

async function loadAdminData() {
  const [{ data: productRows, error: productError }, { data: settingRow, error: settingError }] = await Promise.all([
    db.from('yabi_products').select('id,name,category,price,badge,code,image_url,active,sort_order').order('sort_order').order('id'),
    db.from('yabi_settings').select('whatsapp,location').eq('id', 1).single()
  ]);

  if (productError) return alert('No se pudo cargar el catálogo.');
  products = (productRows || []).map(p => ({ ...p, image: p.image_url || '' }));
  if (!settingError && settingRow) settings = settingRow;
  loadSettingsForm();
  renderProducts();
  clearForm();
}

function renderMetrics() {
  $('metricProducts').textContent = products.length;
  $('metricActive').textContent = products.filter(p => p.active).length;
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
    <article class="product-row ${!product.active ? 'inactive' : ''}">
      <div class="product-thumb">${thumb(product)}</div>
      <div class="product-main"><strong>${product.name}</strong><small>${product.category}${product.badge ? ` · ${product.badge}` : ''}${!product.active ? ' · Oculto' : ''}</small><div class="product-price">${formatGs(product.price)}</div></div>
      <div class="row-actions"><button class="mini-btn" onclick="editProduct(${product.id})">Editar</button><button class="mini-btn" onclick="toggleProduct(${product.id})">${!product.active ? 'Mostrar' : 'Ocultar'}</button></div>
    </article>`).join('') : '<div class="empty-state">No hay productos para mostrar.</div>';

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
  $('productActive').checked = product.active;
  $('editorTitle').textContent = 'Editar producto';
  $('deleteProductBtn').disabled = false;
  if (window.innerWidth < 1050) document.querySelector('.editor-panel').scrollIntoView({ behavior: 'smooth' });
};

window.toggleProduct = async function(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  const { error } = await db.from('yabi_products').update({ active: !product.active, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) return alert('No se pudo cambiar la visibilidad del producto.');
  product.active = !product.active;
  invalidatePublicCache();
  renderProducts();
  toast(product.active ? 'Producto visible' : 'Producto oculto');
};

$('productForm').addEventListener('submit', async event => {
  event.preventDefault();
  const id = Number($('productId').value);
  const payload = {
    name: $('productName').value.trim(),
    category: $('productCategory').value.trim(),
    price: Number($('productPrice').value),
    badge: $('productBadge').value.trim(),
    code: ($('productCode').value.trim() || 'Y').toUpperCase(),
    image_url: $('productImage').value.trim() || null,
    active: $('productActive').checked,
    updated_at: new Date().toISOString()
  };

  let error;
  if (id) {
    ({ error } = await db.from('yabi_products').update(payload).eq('id', id));
  } else {
    const nextOrder = products.length ? Math.max(...products.map(p => Number(p.sort_order) || 0)) + 1 : 1;
    ({ error } = await db.from('yabi_products').insert({ ...payload, sort_order: nextOrder }));
  }
  if (error) return alert('No se pudo guardar el producto.');
  invalidatePublicCache();
  toast(id ? 'Producto actualizado' : 'Producto agregado');
  await loadAdminData();
});

$('deleteProductBtn').addEventListener('click', async () => {
  const id = Number($('productId').value);
  const product = products.find(p => p.id === id);
  if (!product || !confirm(`¿Eliminar definitivamente “${product.name}”?`)) return;
  const { error } = await db.from('yabi_products').delete().eq('id', id);
  if (error) return alert('No se pudo eliminar el producto.');
  invalidatePublicCache();
  toast('Producto eliminado');
  await loadAdminData();
});

$('newProductBtn').addEventListener('click', () => { clearForm(); $('productName').focus(); });
$('cancelEditBtn').addEventListener('click', clearForm);
$('adminSearch').addEventListener('input', e => { searchTerm = e.target.value; renderProducts(); });
$('adminCategoryFilter').addEventListener('change', e => { categoryFilter = e.target.value; renderProducts(); });

function loadSettingsForm() {
  $('settingWhatsapp').value = settings.whatsapp;
  $('settingLocation').value = settings.location;
}

$('settingsForm').addEventListener('submit', async event => {
  event.preventDefault();
  const payload = {
    whatsapp: $('settingWhatsapp').value.replace(/\D/g, ''),
    location: $('settingLocation').value.trim(),
    updated_at: new Date().toISOString()
  };
  const { error } = await db.from('yabi_settings').update(payload).eq('id', 1);
  if (error) return alert('No se pudo guardar la configuración.');
  settings = payload;
  invalidatePublicCache();
  toast('Configuración guardada');
});

$('exportBtn').addEventListener('click', () => {
  const payload = { app: 'YABI Store', version: 2, exportedAt: new Date().toISOString(), products, settings };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `yabi-store-respaldo-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  toast('Respaldo descargado');
});

db.auth.onAuthStateChange(() => setTimeout(showCorrectView, 0));
showCorrectView();
