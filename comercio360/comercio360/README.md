# Comercio360 v2 — Sistema Punto de Venta

## 🚀 Instalación y arranque

### Requisitos
- Node.js 16 o superior (sin dependencias externas — usa solo módulos nativos)

### Pasos

```bash
# 1. Copia todos los archivos en una carpeta
#    Estructura esperada:
#    /comercio360
#    ├── server.js
#    ├── public/
#    │   ├── index.html
#    │   ├── login.html
#    │   ├── inventario.html
#    │   ├── dashboard.html
#    │   ├── common.js
#    │   ├── style.css
#    │   └── logo.png

# 2. Inicia el servidor
node server.js

# 3. Abre en el navegador
# http://localhost:3000
```

## 👤 Usuarios

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | `admin123` | Administrador |
| `cajero` | `cajero123` | Cajero |

## 🔐 Roles y permisos

### Cajero
- ✅ Registrar ventas en caja
- ✅ Ver productos y stock
- ✅ Ver reportes de ventas
- ❌ NO puede modificar inventario
- ❌ NO puede agregar/editar/eliminar productos
- ❌ NO puede ver página de inventario

### Administrador
- ✅ Todo lo del cajero
- ✅ Gestionar inventario (CRUD productos)
- ✅ Ajustar stock manualmente
- ✅ Ver alertas de stock bajo

## 📡 API REST

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/login` | — | Iniciar sesión |
| POST | `/api/logout` | Sesión | Cerrar sesión |
| GET | `/api/me` | Sesión | Usuario actual |
| GET | `/api/productos` | Todos | Listar productos |
| POST | `/api/productos` | Admin | Crear producto |
| PUT | `/api/productos/:id` | Admin | Editar producto |
| PATCH | `/api/productos/:id/stock` | Admin | Ajustar stock |
| DELETE | `/api/productos/:id` | Admin | Eliminar producto |
| GET | `/api/ventas` | Todos | Ver ventas |
| POST | `/api/ventas` | Todos | Registrar venta |
| GET | `/api/stats` | Todos | Estadísticas del día |

## 💾 Persistencia

Los datos se guardan automáticamente en `data.json` al realizar cualquier cambio. Al reiniciar el servidor, los datos se recuperan.

## ✨ Mejoras v2

- 🖥️ Servidor Node.js con API REST (sin dependencias externas)
- 🔐 Sesiones seguras con cookies HttpOnly
- 🔒 Cajero NO puede entrar a inventario ni modificar productos
- 🔄 Caja se actualiza automáticamente con cambios de inventario (cada 30s)
- 📦 CRUD completo de productos con modal
- ⚠️ Alertas de stock bajo en inventario y caja
- 📊 Dashboard con gráficas en tiempo real (auto-refresh 15s)
- 🧾 Recibo detallado al completar venta
- 💾 Persistencia en JSON (data.json)
- 🎨 UI completamente rediseñada (Syne + IBM Plex)
