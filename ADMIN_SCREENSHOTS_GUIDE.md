# 📸 Admin Panel Screenshots Guide

Este documento describe cómo capturar screenshots del panel admin para la documentación.

## URLs del Panel Admin

### Development (Sandbox)
- **Base URL:** https://3000-ixhphtag1cp5vzidyw43p-c81df28e.sandbox.novita.ai
- **Login:** /login
- **Dashboard:** /
- **Admin Panel:** /admin

### Production
- **Base URL:** https://metainfox.io
- **Login:** /login
- **Dashboard:** /
- **Admin Panel:** /admin

## Credenciales de Testing

### Admin User
```
Email: admin@metainfox.io
Password: Demo123!@#
Role: org_admin
```

### Non-Admin User (Para testear acceso denegado)
```
Email: member@metainfox.io
Password: Demo123!@#
Role: member
```

## Screenshots Necesarios

### 1. Página de Login
**Archivo:** `01-login-page.png`
- **URL:** /login
- **Descripción:** Formulario de login con tabs de Iniciar Sesión y Registrarse

### 2. Dashboard Principal
**Archivo:** `02-dashboard.png`
- **URL:** / (autenticado)
- **Descripción:** Dashboard con estadísticas de riesgos y botón de Admin visible

### 3. Admin Panel - Dashboard View
**Archivo:** `03-admin-dashboard.png`
- **URL:** /admin (autenticado como admin)
- **Descripción:** Vista principal del panel admin con stats y acciones rápidas

### 4. Admin Panel - Usuarios View
**Archivo:** `04-admin-users.png`
- **URL:** /admin?view=users
- **Descripción:** Sección de gestión de usuarios (en desarrollo)

### 5. Admin Panel - Organización View
**Archivo:** `05-admin-organization.png`
- **URL:** /admin?view=organization
- **Descripción:** Formulario de configuración de organización

### 6. Admin Panel - Audit Log View
**Archivo:** `06-admin-audit.png`
- **URL:** /admin?view=audit
- **Descripción:** Vista de audit log (en desarrollo)

### 7. Acceso Denegado (Non-Admin)
**Archivo:** `07-admin-access-denied.png`
- **URL:** /admin (autenticado como member)
- **Descripción:** Página de "Acceso Denegado" para usuarios sin permisos

## Método Manual de Captura

### Paso 1: Abrir Browser
```bash
# Abrir el navegador en modo incógnito
chrome --incognito https://3000-ixhphtag1cp5vzidyw43p-c81df28e.sandbox.novita.ai/login
```

### Paso 2: Login
1. Ingresar email: `admin@metainfox.io`
2. Ingresar password: `Demo123!@#`
3. Marcar checkbox "No soy un robot"
4. Click en "Iniciar Sesión"

### Paso 3: Navegar y Capturar
1. Dashboard: Capturar pantalla completa
2. Click en botón "Admin" en header
3. Admin Dashboard: Capturar
4. Click en tab "Usuarios": Capturar
5. Click en tab "Organización": Capturar
6. Click en tab "Audit Log": Capturar

### Paso 4: Capturar Acceso Denegado
1. Logout
2. Login con member@metainfox.io
3. Navegar a /admin
4. Capturar página de "Acceso Denegado"

## Especificaciones Técnicas

### Resolución
- **Desktop:** 1920x1080 (Full HD)
- **Viewport:** 1920x1080
- **Full Page:** Sí (scroll completo)

### Formato
- **Formato:** PNG
- **Calidad:** Alta
- **Compresión:** Lossless

### Ubicación
```
/home/user/webapp/screenshots/
├── 01-login-page.png
├── 02-dashboard.png
├── 03-admin-dashboard.png
├── 04-admin-users.png
├── 05-admin-organization.png
├── 06-admin-audit.png
└── 07-admin-access-denied.png
```

## Alternativa Automática con Playwright (futuro)

Una vez solucionados los problemas de dependencias:

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  // Login
  await page.goto('http://localhost:3000/login');
  await page.fill('#loginEmail', 'admin@metainfox.io');
  await page.fill('#loginPassword', 'Demo123!@#');
  await page.check('#loginHumanCheck');
  await page.click('#loginButton');
  
  // Wait and screenshot dashboard
  await page.waitForURL('http://localhost:3000/');
  await page.screenshot({ path: 'screenshots/02-dashboard.png', fullPage: true });
  
  // Navigate to admin
  await page.goto('http://localhost:3000/admin');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'screenshots/03-admin-dashboard.png', fullPage: true });
  
  await browser.close();
})();
```

## Notas

- Todas las capturas deben mostrar datos reales del sistema de demo
- Asegurarse de que no haya información sensible visible
- Verificar que los elementos UI estén completamente cargados
- Usar modo claro (light mode) para consistencia
- Incluir el header con usuario/organización visible

---

**Generado:** 2025-12-11  
**Proyecto:** Metainfox AI v2.3.0
