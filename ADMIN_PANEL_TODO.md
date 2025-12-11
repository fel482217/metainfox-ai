# Panel de Administración - Tareas Pendientes

## Estado Actual

✅ **Backend completado** (src/routes/admin.ts)
- Endpoints de gestión de usuarios
- Endpoints de gestión de organizaciones  
- Audit logs
- Permisos y roles

✅ **JavaScript del Admin Panel creado** (public/static/admin.js - 24KB)
- Gestión de usuarios (CRUD)
- Gestión de organizaciones (CRUD)
- Visualización de audit logs
- Control de permisos por rol

## ⚠️ Pendiente

### 1. Ruta `/admin` en el Backend
**Archivo**: `src/index.ts`

Agregar después de la ruta `/login`:

```typescript
/**
 * GET /admin
 * Panel de Administración
 */
app.get('/admin', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel - Metainfox AI</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <!-- CRITICAL: Check auth BEFORE rendering page -->
    <script>
      if (!localStorage.getItem('access_token')) {
        window.location.href = '/login';
      }
    </script>
</head>
<body class="bg-gray-100">
    <!-- Ver contenido completo en ADMIN_PANEL_HTML.md -->
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="/static/admin.js"></script>
</body>
</html>
  `);
});
```

### 2. Endpoints de Admin Faltantes

**Archivo**: `src/routes/admin.ts`

Agregar:

```typescript
// GET /api/admin/stats - Dashboard stats
adminRoutes.get('/stats', requirePermission('users.view'), async (c) => {
  // Retornar estadísticas de usuarios, organizaciones, etc.
});

// POST /api/admin/users - Crear usuario
adminRoutes.post('/users', requirePermission('users.create'), async (c) => {
  // Crear nuevo usuario
});

// PUT /api/admin/users/:id - Actualizar usuario
adminRoutes.put('/users/:id', requirePermission('users.update'), async (c) => {
  // Actualizar usuario
});

// PUT /api/admin/users/:id/status - Cambiar estado de usuario
adminRoutes.put('/users/:id/status', requirePermission('users.update'), async (c) => {
  // Activar/suspender usuario
});

// DELETE /api/admin/users/:id - Eliminar usuario
adminRoutes.delete('/users/:id', requirePermission('users.delete'), async (c) => {
  // Eliminar usuario
});

// GET /api/admin/organizations - Listar organizaciones
adminRoutes.get('/organizations', requirePermission('organizations.view'), async (c) => {
  // Listar todas las organizaciones (solo super_admin)
});

// POST /api/admin/organizations - Crear organización
adminRoutes.post('/organizations', requirePermission('organizations.create'), async (c) => {
  // Crear nueva organización
});

// PUT /api/admin/organizations/:id - Actualizar organización
adminRoutes.put('/organizations/:id', requirePermission('organizations.update'), async (c) => {
  // Actualizar organización
});

// DELETE /api/admin/organizations/:id - Eliminar organización
adminRoutes.delete('/organizations/:id', requirePermission('organizations.delete'), async (c) => {
  // Eliminar organización
});

// GET /api/admin/audit-logs - Ver logs de auditoría
adminRoutes.get('/audit-logs', requirePermission('system.audit'), async (c) => {
  // Retornar logs de auditoría
});

// GET /api/admin/settings - Configuración
adminRoutes.get('/settings', requireOrgAdmin, async (c) => {
  // Retornar configuración de la organización
});
```

### 3. HTML Completo del Admin Panel

El HTML completo está demasiado largo para incluirlo aquí. Ver archivo separado: `ADMIN_PANEL_HTML.md`

### 4. Vistas Específicas por Rol

El admin panel ya controla permisos mediante:
- `hasPermission('users.view')` - Ver usuarios
- `hasPermission('users.create')` - Crear usuarios
- `hasPermission('users.update')` - Editar usuarios
- `hasPermission('users.delete')` - Eliminar usuarios
- `hasPermission('organizations.view')` - Ver organizaciones
- `hasPermission('organizations.update')` - Editar organizaciones
- `hasPermission('system.audit')` - Ver audit logs

**Roles y sus permisos**:
- `super_admin`: Todos los permisos
- `org_admin`: Gestión completa de su organización
- `org_manager`: Gestión de riesgos y usuarios básicos
- `org_member`: Creación y edición de riesgos
- `org_viewer`: Solo lectura

## Archivos Creados

✅ `public/static/admin.js` - JavaScript completo del admin panel (24KB)
⚠️ Falta: Ruta `/admin` en `src/index.ts`
⚠️ Falta: Endpoints adicionales en `src/routes/admin.ts`

## Próximos Pasos

1. **Completar ruta `/admin` en index.ts**
2. **Agregar endpoints faltantes en admin.ts**
3. **Probar funcionalidad completa**
4. **Desplegar a producción**

## Estimación

- Tiempo: 2-3 horas
- Complejidad: Media
- Impacto: Alto (funcionalidad enterprise completa)
