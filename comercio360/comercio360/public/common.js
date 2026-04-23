// ============================================================
// COMERCIO360 — UTILIDADES COMPARTIDAS
// ============================================================

// ---- FORMATO MONEDA ----
function fmt(n) {
  return '$' + Math.round(n).toLocaleString('es-CO');
}

// ---- API HELPERS ----
async function api(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error del servidor');
  return data;
}

// ---- TOAST ----
let toastTimer;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.className = 'toast', 2400);
}

// ---- TOPBAR SETUP ----
async function setupTopbar() {
  try {
    const user = await api('GET', '/me');
    const nameEl = document.getElementById('userName');
    const badgeEl = document.getElementById('userBadge');
    const invLink = document.getElementById('inventarioLink');
    if (nameEl) nameEl.textContent = user.name;
    if (badgeEl) badgeEl.textContent = user.role === 'admin' ? 'Admin' : 'Cajero';
    // Solo admin ve enlace inventario
    if (invLink) invLink.style.display = user.role === 'admin' ? 'inline' : 'none';
    return user;
  } catch(e) {
    window.location.href = '/login.html';
  }
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login.html';
}
