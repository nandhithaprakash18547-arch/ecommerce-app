// ---------- tiny helpers ----------
function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach((c) => { if (c !== null && c !== undefined && c !== false) e.append(c.nodeType ? c : document.createTextNode(c)); });
  return e;
}
const $view = document.getElementById('view');
const money = (n) => '₹' + Number(n).toLocaleString('en-IN');
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2200);
}

// ---------- state ----------
let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || 'null');
let cart = JSON.parse(localStorage.getItem('cart') || '[]'); // [{id,name,price,qty,stock}]
const saveCart = () => { localStorage.setItem('cart', JSON.stringify(cart)); renderNav(); };

async function api(path, method = 'GET', body) {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) { logout(false); }
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}
function setSession(data) {
  token = data.token; user = data.user;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}
function logout(redirect = true) {
  token = null; user = null;
  localStorage.removeItem('token'); localStorage.removeItem('user');
  renderNav();
  if (redirect) location.hash = '#/';
}

// ---------- nav ----------
function renderNav() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const nav = document.getElementById('nav');
  nav.replaceChildren(
    el('a', { class: 'brand', href: '#/' }, '🛒 MyShop'),
    el('a', { href: '#/' }, 'Shop'),
    el('a', { href: '#/cart' }, `Cart (${count})`),
    user && el('a', { href: '#/orders' }, 'My Orders'),
    user && user.role === 'admin' && el('a', { href: '#/admin' }, 'Admin'),
    user
      ? el('span', {}, `Hi, ${user.name} `, el('button', { onclick: () => logout() }, 'Logout'))
      : el('a', { href: '#/login' }, 'Login / Register')
  );
}

// ---------- views ----------
async function shopView() {
  const search = el('input', { type: 'search', placeholder: 'Search products...' });
  const grid = el('div', { class: 'grid' });
  async function load() {
    try {
      const products = await api('/products?search=' + encodeURIComponent(search.value));
      grid.replaceChildren(...products.map(productCard));
      if (!products.length) grid.replaceChildren(el('p', { class: 'muted' }, 'No products found.'));
    } catch (e) { grid.replaceChildren(el('p', { class: 'error' }, e.message)); }
  }
  let timer;
  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 250); });
  $view.replaceChildren(el('h2', {}, 'Products'), search, grid);
  load();
}
function productCard(p) {
  const img = el('div', { class: 'img' }, p.image ? el('img', { src: p.image, alt: p.name, onerror: (e) => e.target.replaceWith(p.name[0]) }) : p.name[0]);
  return el('div', { class: 'card product' },
    img,
    el('h3', {}, p.name),
    el('span', { class: 'muted' }, p.category),
    el('p', { class: 'muted' }, p.description),
    el('div', { class: 'row' },
      el('span', { class: 'price' }, money(p.price)),
      el('span', { class: 'muted' }, p.stock > 0 ? `${p.stock} in stock` : 'Out of stock')),
    el('button', { class: 'primary', disabled: p.stock < 1, onclick: () => addToCart(p) }, 'Add to cart'));
}
function addToCart(p) {
  const found = cart.find((i) => i.id === p._id);
  if (found) { if (found.qty < p.stock) found.qty++; else return toast('No more stock available'); }
  else cart.push({ id: p._id, name: p.name, price: p.price, qty: 1, stock: p.stock });
  saveCart(); toast('Added to cart');
}

function cartView() {
  if (!cart.length) return $view.replaceChildren(el('h2', {}, 'Your cart'), el('p', { class: 'muted' }, 'Cart is empty.'), el('a', { href: '#/' }, 'Continue shopping'));
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const address = el('textarea', { rows: 3, placeholder: 'Delivery address' });
  const err = el('p', { class: 'error' });
  const rows = cart.map((i) => el('tr', {},
    el('td', {}, i.name),
    el('td', {}, money(i.price)),
    el('td', {}, el('span', { class: 'qty' },
      el('button', { onclick: () => { i.qty--; if (i.qty < 1) cart = cart.filter((c) => c !== i); saveCart(); cartView(); } }, '−'),
      i.qty,
      el('button', { onclick: () => { if (i.qty < i.stock) { i.qty++; saveCart(); cartView(); } else toast('No more stock'); } }, '+'))),
    el('td', {}, money(i.price * i.qty)),
    el('td', {}, el('button', { class: 'danger', onclick: () => { cart = cart.filter((c) => c !== i); saveCart(); cartView(); } }, 'Remove'))));

  const checkout = el('button', { class: 'primary', onclick: async () => {
    if (!user) { location.hash = '#/login'; return toast('Please login to checkout'); }
    try {
      await api('/orders', 'POST', { items: cart.map((i) => ({ productId: i.id, qty: i.qty })), address: address.value });
      cart = []; saveCart(); toast('Order placed!'); location.hash = '#/orders';
    } catch (e) { err.textContent = e.message; }
  } }, 'Place order');

  $view.replaceChildren(el('h2', {}, 'Your cart'),
    el('div', { class: 'card table-wrap' }, el('table', {},
      el('thead', {}, el('tr', {}, ['Item', 'Price', 'Qty', 'Subtotal', ''].map((h) => el('th', {}, h)))),
      el('tbody', {}, rows))),
    el('div', { class: 'card' }, el('h3', {}, 'Total: ' + money(total)), address, checkout, err));
}

function loginView() {
  let mode = 'login';
  const name = el('input', { placeholder: 'Full name', hidden: true });
  const email = el('input', { type: 'email', placeholder: 'Email' });
  const pass = el('input', { type: 'password', placeholder: 'Password (min 6 chars)' });
  const err = el('p', { class: 'error' });
  const submit = el('button', { class: 'primary', style: 'width:100%' }, 'Login');
  const toggle = el('a', { href: '#/login', onclick: (e) => {
    e.preventDefault(); mode = mode === 'login' ? 'register' : 'login';
    name.hidden = mode === 'login'; submit.textContent = mode === 'login' ? 'Login' : 'Create account';
    toggle.textContent = mode === 'login' ? 'New here? Register' : 'Have an account? Login'; err.textContent = '';
  } }, 'New here? Register');
  submit.onclick = async () => {
    try {
      const data = await api('/auth/' + mode, 'POST', { name: name.value, email: email.value, password: pass.value });
      setSession(data); renderNav(); location.hash = '#/';
    } catch (e) { err.textContent = e.message; }
  };
  $view.replaceChildren(el('div', { class: 'card narrow' }, el('h2', {}, 'Welcome'), name, email, pass, submit, err, toggle));
}

async function ordersView() {
  if (!user) return (location.hash = '#/login');
  $view.replaceChildren(el('h2', {}, 'My Orders'));
  try {
    const orders = await api('/orders/mine');
    if (!orders.length) $view.append(el('p', { class: 'muted' }, 'No orders yet.'));
    orders.forEach((o) => $view.append(orderCard(o)));
  } catch (e) { $view.append(el('p', { class: 'error' }, e.message)); }
}
function orderCard(o, adminControls) {
  return el('div', { class: 'card' },
    el('div', { class: 'row' },
      el('strong', {}, 'Order #' + o._id.slice(-6)),
      el('span', { class: 'badge' }, o.status),
      el('span', { class: 'muted' }, new Date(o.createdAt).toLocaleString()),
      el('strong', {}, money(o.total))),
    adminControls && el('p', { class: 'muted' }, `Customer: ${o.user ? o.user.name + ' (' + o.user.email + ')' : 'deleted user'}`),
    el('ul', {}, o.items.map((i) => el('li', {}, `${i.name} × ${i.qty} — ${money(i.price * i.qty)}`))),
    el('p', { class: 'muted' }, 'Ship to: ' + o.address),
    adminControls);
}

async function adminView(tab = 'products') {
  if (!user || user.role !== 'admin') return $view.replaceChildren(el('p', { class: 'error' }, 'Admin access only.'));
  const tabs = el('div', { class: 'tabs' },
    ['products', 'orders'].map((t) => el('button', { class: t === tab ? 'active' : '', onclick: () => adminView(t) }, t[0].toUpperCase() + t.slice(1))));
  $view.replaceChildren(el('h2', {}, 'Admin Panel'), tabs);
  const box = el('div'); $view.append(box);
  try { tab === 'products' ? await adminProducts(box) : await adminOrders(box); }
  catch (e) { box.append(el('p', { class: 'error' }, e.message)); }
}
async function adminProducts(box) {
  const f = {};
  ['name', 'price', 'stock', 'category', 'image'].forEach((k) => (f[k] = el('input', { placeholder: k === 'image' ? 'Image URL (optional)' : k[0].toUpperCase() + k.slice(1), type: ['price', 'stock'].includes(k) ? 'number' : 'text', min: 0 })));
  f.description = el('textarea', { rows: 2, placeholder: 'Description' });
  let editId = null;
  const err = el('p', { class: 'error' });
  const save = el('button', { class: 'primary' }, 'Add product');
  const cancel = el('button', { hidden: true }, 'Cancel');
  const reset = () => { Object.values(f).forEach((x) => (x.value = '')); editId = null; save.textContent = 'Add product'; cancel.hidden = true; err.textContent = ''; };
  cancel.onclick = reset;
  save.onclick = async () => {
    const body = Object.fromEntries(Object.entries(f).map(([k, x]) => [k, x.value]));
    try { await api(editId ? '/products/' + editId : '/products', editId ? 'PUT' : 'POST', body); reset(); toast('Saved'); adminView('products'); }
    catch (e) { err.textContent = e.message; }
  };
  box.append(el('div', { class: 'card' }, el('h3', {}, 'Add / edit product'),
    el('div', { class: 'row' }, f.name, f.price, f.stock), el('div', { class: 'row' }, f.category, f.image), f.description,
    el('div', { class: 'row' }, save, cancel), err));

  const products = await api('/products');
  box.append(el('div', { class: 'card table-wrap' }, el('table', {},
    el('thead', {}, el('tr', {}, ['Name', 'Price', 'Stock', 'Category', ''].map((h) => el('th', {}, h)))),
    el('tbody', {}, products.map((p) => el('tr', {},
      el('td', {}, p.name), el('td', {}, money(p.price)), el('td', {}, p.stock), el('td', {}, p.category),
      el('td', {}, el('div', { class: 'row' },
        el('button', { onclick: () => { editId = p._id; Object.keys(f).forEach((k) => (f[k].value = p[k] ?? '')); save.textContent = 'Save changes'; cancel.hidden = false; window.scrollTo({ top: 0, behavior: 'smooth' }); } }, 'Edit'),
        el('button', { class: 'danger', onclick: async () => { if (confirm('Delete this product?')) { await api('/products/' + p._id, 'DELETE'); adminView('products'); } } }, 'Delete')))))))));
}
async function adminOrders(box) {
  const orders = await api('/orders');
  if (!orders.length) box.append(el('p', { class: 'muted' }, 'No orders yet.'));
  orders.forEach((o) => {
    const sel = el('select', { onchange: async () => { try { await api(`/orders/${o._id}/status`, 'PUT', { status: sel.value }); toast('Status updated'); adminView('orders'); } catch (e) { toast(e.message); } } },
      ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((s) => el('option', { value: s, selected: s === o.status }, s)));
    box.append(orderCard(o, el('div', { class: 'row' }, el('span', {}, 'Update status:'), sel)));
  });
}

// ---------- router ----------
function route() {
  const h = location.hash || '#/';
  renderNav();
  if (h === '#/cart') cartView();
  else if (h === '#/login') loginView();
  else if (h === '#/orders') ordersView();
  else if (h === '#/admin') adminView();
  else shopView();
}
window.addEventListener('hashchange', route);
route();
