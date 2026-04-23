// ============================================================
// COMERCIO360 — SERVIDOR NODE.JS (módulos nativos)
// ============================================================
const http = require('http');
const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3000;
const PUBLIC = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data.json');

// ============================================================
// BASE DE DATOS EN MEMORIA (persistida en data.json)
// ============================================================
let db = {
  productos: [
    { id: 1, nombre: 'Agua Cristal 600ml',      precio: 1500,  stock: 48, codigo: '7702113016507', emoji: '💧', proveedor: 'Dist. El Sol',      stockMin: 5 },
    { id: 2, nombre: 'Gaseosa Coca-Cola 400ml', precio: 2500,  stock: 36, codigo: '7702149161604', emoji: '🥤', proveedor: 'Dist. El Sol',      stockMin: 5 },
    { id: 3, nombre: 'Pan tajado x500g',        precio: 4200,  stock: 12, codigo: '7701234567890', emoji: '🍞', proveedor: 'Surtidora Valle',   stockMin: 5 },
    { id: 4, nombre: 'Leche entera 1L',         precio: 3800,  stock: 4,  codigo: '7709876543210', emoji: '🥛', proveedor: 'Prov. Nacional',    stockMin: 5 },
    { id: 5, nombre: 'Arroz premium 1kg',       precio: 5500,  stock: 30, codigo: '7706543219870', emoji: '🌾', proveedor: 'Surtidora Valle',   stockMin: 5 },
    { id: 6, nombre: 'Aceite girasol 1L',       precio: 8900,  stock: 7,  codigo: '7701122334455', emoji: '🫙', proveedor: 'Prov. Nacional',    stockMin: 5 },
    { id: 7, nombre: 'Huevos x12',              precio: 12000, stock: 18, codigo: '7700011223344', emoji: '🥚', proveedor: 'Dist. El Sol',      stockMin: 5 },
    { id: 8, nombre: 'Azúcar x1kg',             precio: 3200,  stock: 3,  codigo: '7705544332211', emoji: '🧂', proveedor: 'Surtidora Valle',   stockMin: 3 },
  ],
  ventas: [],
  usuarios: [
    { id: 1, username: 'admin',  password: hashPwd('admin123'),   role: 'admin',   name: 'Administrador' },
    { id: 2, username: 'cajero', password: hashPwd('cajero123'),  role: 'cashier', name: 'Cajero Principal' },
  ],
  nextProductId: 9,
  nextVentaId: 1
};

// Cargar datos persistidos si existen
if (fs.existsSync(DATA_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    db = { ...db, ...saved };
    console.log('✅ Datos cargados desde data.json');
  } catch(e) {
    console.log('⚠️ Error leyendo data.json, usando datos por defecto');
  }
}

function saveDb() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

function hashPwd(plain) {
  return crypto.createHash('sha256').update(plain + 'c360salt').digest('hex');
}

// ============================================================
// SESIONES SIMPLES EN MEMORIA
// ============================================================
const sessions = {};

function createSession(user) {
  const sid = crypto.randomBytes(32).toString('hex');
  sessions[sid] = { userId: user.id, role: user.role, name: user.name, createdAt: Date.now() };
  return sid;
}

function getSession(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const sid = cookies['c360_sid'];
  if (!sid || !sessions[sid]) return null;
  // 8 horas de expiración
  if (Date.now() - sessions[sid].createdAt > 8 * 60 * 60 * 1000) {
    delete sessions[sid];
    return null;
  }
  return sessions[sid];
}

function parseCookies(str) {
  return str.split(';').reduce((acc, part) => {
    const [k, ...v] = part.trim().split('=');
    if (k) acc[k] = decodeURIComponent(v.join('='));
    return acc;
  }, {});
}

// ============================================================
// HELPERS HTTP
// ============================================================
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
};

function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

function json(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch(e) { resolve({}); }
    });
    req.on('error', reject);
  });
}

function requireAuth(session, res) {
  if (!session) { json(res, 401, { error: 'No autenticado' }); return false; }
  return true;
}

function requireAdmin(session, res) {
  if (!session) { json(res, 401, { error: 'No autenticado' }); return false; }
  if (session.role !== 'admin') { json(res, 403, { error: 'Solo administradores' }); return false; }
  return true;
}

// ============================================================
// ROUTER
// ============================================================
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const method   = req.method;
  const session  = getSession(req);

  // CORS para desarrollo
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ── STATIC FILES ──────────────────────────────────────────
  if (method === 'GET' && !pathname.startsWith('/api/')) {
    let filePath = PUBLIC + (pathname === '/' ? '/login.html' : pathname);
    if (!path.extname(filePath)) filePath += '.html';
    if (fs.existsSync(filePath)) { serveStatic(res, filePath); return; }
    serveStatic(res, PUBLIC + '/404.html');
    return;
  }

  // ── API ────────────────────────────────────────────────────

  // POST /api/login
  if (method === 'POST' && pathname === '/api/login') {
    const body = await readBody(req);
    const user = db.usuarios.find(u => u.username === body.username && u.password === hashPwd(body.password));
    if (!user) { json(res, 401, { error: 'Usuario o contraseña incorrectos' }); return; }
    const sid = createSession(user);
    res.writeHead(200, {
      'Set-Cookie': `c360_sid=${sid}; HttpOnly; Path=/; Max-Age=28800`,
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({ ok: true, user: { id: user.id, name: user.name, role: user.role, username: user.username } }));
    return;
  }

  // POST /api/logout
  if (method === 'POST' && pathname === '/api/logout') {
    const cookies = parseCookies(req.headers.cookie || '');
    if (cookies['c360_sid']) delete sessions[cookies['c360_sid']];
    res.writeHead(200, { 'Set-Cookie': 'c360_sid=; Max-Age=0; Path=/', 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // GET /api/me
  if (method === 'GET' && pathname === '/api/me') {
    if (!session) { json(res, 401, { error: 'No autenticado' }); return; }
    json(res, 200, { id: session.userId, name: session.name, role: session.role });
    return;
  }

  // GET /api/productos
  if (method === 'GET' && pathname === '/api/productos') {
    if (!requireAuth(session, res)) return;
    json(res, 200, db.productos);
    return;
  }

  // POST /api/productos — solo admin
  if (method === 'POST' && pathname === '/api/productos') {
    if (!requireAdmin(session, res)) return;
    const body = await readBody(req);
    const producto = {
      id: db.nextProductId++,
      nombre:    body.nombre   || 'Nuevo producto',
      precio:    Number(body.precio)   || 0,
      stock:     Number(body.stock)    || 0,
      stockMin:  Number(body.stockMin) || 5,
      codigo:    body.codigo   || '',
      emoji:     body.emoji    || '📦',
      proveedor: body.proveedor || 'Sin proveedor',
    };
    db.productos.push(producto);
    saveDb();
    json(res, 201, producto);
    return;
  }

  // PUT /api/productos/:id — solo admin
  const putProductMatch = pathname.match(/^\/api\/productos\/(\d+)$/);
  if (method === 'PUT' && putProductMatch) {
    if (!requireAdmin(session, res)) return;
    const id = parseInt(putProductMatch[1]);
    const idx = db.productos.findIndex(p => p.id === id);
    if (idx === -1) { json(res, 404, { error: 'Producto no encontrado' }); return; }
    const body = await readBody(req);
    db.productos[idx] = { ...db.productos[idx], ...body, id };
    saveDb();
    json(res, 200, db.productos[idx]);
    return;
  }

  // PATCH /api/productos/:id/stock — solo admin (ajuste de stock)
  const patchStockMatch = pathname.match(/^\/api\/productos\/(\d+)\/stock$/);
  if (method === 'PATCH' && patchStockMatch) {
    if (!requireAdmin(session, res)) return;
    const id = parseInt(patchStockMatch[1]);
    const p = db.productos.find(x => x.id === id);
    if (!p) { json(res, 404, { error: 'No encontrado' }); return; }
    const body = await readBody(req);
    p.stock = Math.max(0, p.stock + (body.delta || 0));
    saveDb();
    json(res, 200, p);
    return;
  }

  // DELETE /api/productos/:id — solo admin
  const delProductMatch = pathname.match(/^\/api\/productos\/(\d+)$/);
  if (method === 'DELETE' && delProductMatch) {
    if (!requireAdmin(session, res)) return;
    const id = parseInt(delProductMatch[1]);
    const idx = db.productos.findIndex(p => p.id === id);
    if (idx === -1) { json(res, 404, { error: 'No encontrado' }); return; }
    db.productos.splice(idx, 1);
    saveDb();
    json(res, 200, { ok: true });
    return;
  }

  // GET /api/ventas
  if (method === 'GET' && pathname === '/api/ventas') {
    if (!requireAuth(session, res)) return;
    json(res, 200, db.ventas.slice(-50).reverse());
    return;
  }

  // POST /api/ventas — cajero o admin
  if (method === 'POST' && pathname === '/api/ventas') {
    if (!requireAuth(session, res)) return;
    const body = await readBody(req);
    const { items, pago } = body;

    // Validar stock
    for (const item of items) {
      const p = db.productos.find(x => x.id === item.id);
      if (!p) { json(res, 400, { error: `Producto ${item.id} no encontrado` }); return; }
      if (p.stock < item.qty) { json(res, 400, { error: `Stock insuficiente para ${p.nombre}` }); return; }
    }

    const total = items.reduce((s, i) => {
      const p = db.productos.find(x => x.id === i.id);
      return s + (p.precio * i.qty);
    }, 0);

    if (pago < total) { json(res, 400, { error: 'Pago insuficiente' }); return; }

    // Descontar stock
    items.forEach(item => {
      const p = db.productos.find(x => x.id === item.id);
      p.stock -= item.qty;
    });

    const venta = {
      id: db.nextVentaId++,
      fecha: new Date().toISOString(),
      items: items.map(i => {
        const p = db.productos.find(x => x.id === i.id);
        return { id: i.id, nombre: p.nombre, emoji: p.emoji, qty: i.qty, precio: p.precio };
      }),
      total,
      pago,
      cambio: pago - total,
      cajero: session.name,
      cajeroId: session.userId,
    };
    db.ventas.push(venta);
    saveDb();
    json(res, 201, venta);
    return;
  }

  // GET /api/stats
  if (method === 'GET' && pathname === '/api/stats') {
    if (!requireAuth(session, res)) return;
    const today = new Date().toDateString();
    const ventasHoy = db.ventas.filter(v => new Date(v.fecha).toDateString() === today);
    const amount = ventasHoy.reduce((s, v) => s + v.total, 0);
    const transactions = ventasHoy.length;
    const avgTicket = transactions ? Math.round(amount / transactions) : 0;
    const lowStock = db.productos.filter(p => p.stock <= p.stockMin).length;

    // Top productos vendidos hoy
    const topMap = {};
    ventasHoy.forEach(v => v.items.forEach(i => {
      if (!topMap[i.id]) topMap[i.id] = { id: i.id, nombre: i.nombre, emoji: i.emoji, total: 0, qty: 0 };
      topMap[i.id].total += i.precio * i.qty;
      topMap[i.id].qty   += i.qty;
    }));
    const topProductos = Object.values(topMap).sort((a, b) => b.total - a.total).slice(0, 5);

    json(res, 200, { amount, transactions, avgTicket, lowStock, topProductos });
    return;
  }

  json(res, 404, { error: 'Ruta no encontrada' });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Comercio360 corriendo en http://localhost:${PORT}`);
  console.log(`   Admin:  admin / admin123`);
  console.log(`   Cajero: cajero / cajero123\n`);
});
