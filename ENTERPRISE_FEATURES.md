# Metainfox AI - Enterprise Features Documentation

## 🏢 Sistema Enterprise Multi-Tenant con Control de Acceso Robusto

### Características Implementadas

#### 1. Multi-Tenancy (Aislamiento por Organización)
- ✅ **Aislamiento completo de datos** por organización
- ✅ **Facturación independiente** por tenant
- ✅ **Configuraciones personalizadas** por organización
- ✅ **Límites configurables** (usuarios, riesgos)
- ✅ **Planes de suscripción** (Free, Starter, Professional, Enterprise)

#### 2. Sistema de Autenticación JWT
- ✅ **Access tokens** (1 hora de validez)
- ✅ **Refresh tokens** (7 días de validez)
- ✅ **Hash de contraseñas** con SHA-256 + salt
- ✅ **Auto-renovación de tokens** en el frontend
- ✅ **Sesiones persistentes** con revocación

#### 3. Control de Acceso Basado en Roles (RBAC)

##### Roles Predefinidos:

**Super Admin**
- Acceso completo a todas las organizaciones
- Puede crear/eliminar organizaciones
- Gestión completa de usuarios y permisos
- Acceso a todos los datos del sistema

**Organization Admin**
- Control total dentro de su organización
- Gestión de usuarios y roles
- Configuración de la organización
- Acceso a audit logs

**Organization Manager**
- Gestión de riesgos y alertas
- Invitación de usuarios
- Visualización de reportes
- Sin acceso a configuración de facturación

**Organization Member**
- Creación y edición de riesgos
- Uso de análisis con IA
- Visualización de dashboards
- Sin acceso a gestión de usuarios

**Organization Viewer**
- Solo lectura de riesgos y dashboards
- Sin permisos de creación/edición
- Sin acceso a datos sensibles

##### Permisos Granulares (26 permisos):

**Riesgos:**
- `risks.create` - Crear riesgos
- `risks.read` - Ver riesgos
- `risks.update` - Actualizar riesgos
- `risks.delete` - Eliminar riesgos
- `risks.manage` - Gestión completa
- `risks.analyze` - Usar IA para análisis

**Alertas:**
- `alerts.create` - Crear alertas
- `alerts.read` - Ver alertas
- `alerts.update` - Actualizar alertas
- `alerts.delete` - Eliminar alertas

**Usuarios:**
- `users.invite` - Invitar usuarios
- `users.read` - Ver usuarios
- `users.update` - Actualizar usuarios
- `users.delete` - Eliminar usuarios
- `users.manage` - Gestión completa

**Organizaciones:**
- `organizations.create` - Crear organizaciones
- `organizations.read` - Ver organización
- `organizations.update` - Actualizar configuración
- `organizations.delete` - Eliminar organización
- `organizations.manage` - Gestión completa

**Configuración:**
- `settings.read` - Ver configuración
- `settings.update` - Actualizar configuración

**Analítica:**
- `analytics.read` - Ver reportes
- `analytics.export` - Exportar datos

**Auditoría:**
- `audit.read` - Ver logs de auditoría

#### 4. Gestión de Usuarios

**Funcionalidades:**
- ✅ Sistema de invitaciones con tokens únicos
- ✅ Onboarding automático de usuarios
- ✅ Gestión de roles por usuario
- ✅ Suspensión/activación de usuarios
- ✅ Historial de actividad por usuario
- ✅ Último login y estadísticas

**Endpoints:**
- `GET /api/admin/users` - Listar usuarios de la organización
- `GET /api/admin/users/:id` - Obtener detalles de usuario
- `POST /api/admin/users/invite` - Invitar nuevo usuario
- `PUT /api/admin/users/:id/role` - Cambiar rol de usuario
- `DELETE /api/admin/users/:id` - Eliminar usuario

#### 5. Gestión de Organizaciones

**Funcionalidades:**
- ✅ Creación automática con registro
- ✅ Configuración personalizada
- ✅ Límites por plan
- ✅ Trial de 30 días
- ✅ Estadísticas de uso

**Endpoints:**
- `GET /api/admin/organization` - Obtener info de organización
- `PUT /api/admin/organization` - Actualizar configuración

#### 6. Audit Logs (Trazabilidad y Compliance)

**Funcionalidades:**
- ✅ Registro automático de todas las acciones
- ✅ Información completa (usuario, IP, timestamp, resultado)
- ✅ Almacenamiento de cambios (before/after)
- ✅ Consultas paginadas
- ✅ Filtrado por tipo de acción

**Endpoints:**
- `GET /api/admin/audit-logs` - Obtener logs de auditoría

**Información Registrada:**
- Usuario que ejecutó la acción
- Tipo de acción (login, create_risk, update_user, etc.)
- Recurso afectado (risk, user, organization)
- IP y User-Agent
- Timestamp preciso
- Resultado (success/failure)
- Valores anteriores y nuevos (para modificaciones)

#### 7. Rate Limiting

**Implementación:**
- ✅ Límites por organización (no por IP)
- ✅ Configuración por endpoint
- ✅ Respuestas HTTP 429 con Retry-After
- ✅ 200 requests/min para dashboard/risks
- ✅ 50 requests/min para análisis con IA
- ✅ 100 requests/min para chat

#### 8. Middleware de Autorización

**Funcionalidades:**
- ✅ `requireAuth` - Validación de JWT
- ✅ `requirePermission(permission)` - Verificación de permiso específico
- ✅ `requireRole(...roles)` - Verificación de roles
- ✅ `requireOrgAdmin` - Solo administradores
- ✅ `ensureTenantIsolation` - Filtrado automático por organización
- ✅ `validateResourceOwnership` - Validación de propiedad de recursos
- ✅ `auditLog` - Registro automático de acciones
- ✅ `rateLimit` - Limitación de requests

---

## 📋 API Endpoints

### Autenticación

```bash
# Login
POST /api/auth/login
{
  "email": "admin@metainfox.io",
  "password": "Demo123!@#",
  "organization_slug": "metainfox-demo" # opcional
}

# Registro
POST /api/auth/register
{
  "email": "nuevo@empresa.com",
  "password": "Password123",
  "full_name": "Nombre Completo",
  "organization_name": "Mi Empresa S.A."
}

# Refresh Token
POST /api/auth/refresh
{
  "refresh_token": "eyJhbGciOiJI..."
}

# Logout
POST /api/auth/logout
{
  "refresh_token": "eyJhbGciOiJI..."
}

# Obtener información de usuario actual
GET /api/auth/me
Authorization: Bearer <access_token>
```

### Administración

```bash
# Listar usuarios
GET /api/admin/users
Authorization: Bearer <access_token>

# Obtener detalles de usuario
GET /api/admin/users/:id
Authorization: Bearer <access_token>

# Invitar usuario
POST /api/admin/users/invite
Authorization: Bearer <access_token>
{
  "email": "nuevo@empresa.com",
  "role": "org_member"
}

# Cambiar rol de usuario
PUT /api/admin/users/:id/role
Authorization: Bearer <access_token>
{
  "role": "org_manager"
}

# Eliminar usuario
DELETE /api/admin/users/:id
Authorization: Bearer <access_token>

# Obtener organización
GET /api/admin/organization
Authorization: Bearer <access_token>

# Actualizar organización
PUT /api/admin/organization
Authorization: Bearer <access_token>
{
  "name": "Nueva Empresa",
  "industry": "Technology",
  "size": "Medium",
  "country": "Mexico"
}

# Ver roles disponibles
GET /api/admin/roles
Authorization: Bearer <access_token>

# Ver audit logs
GET /api/admin/audit-logs?limit=50&offset=0
Authorization: Bearer <access_token>
```

### Dashboard y Riesgos (Protegidos)

```bash
# Todas las rutas existentes ahora requieren autenticación
GET /api/dashboard/stats
GET /api/risks
POST /api/risks
GET /api/risks/:id
POST /api/analyze
POST /api/chat

# Header requerido:
Authorization: Bearer <access_token>
```

---

## 🔐 Credenciales de Demostración

```
Admin:    admin@metainfox.io    / Demo123!@#
Manager:  manager@metainfox.io  / Demo123!@#
Member:   member@metainfox.io   / Demo123!@#
Viewer:   viewer@metainfox.io   / Demo123!@#
```

Todas las cuentas pertenecen a la organización "Metainfox Demo".

---

## 📊 Schema de Base de Datos

### Tablas Nuevas

1. **organizations** - Datos de organizaciones/tenants
2. **users** - Usuarios del sistema
3. **organization_members** - Relación usuario-organización
4. **roles** - Roles del sistema
5. **permissions** - Permisos disponibles
6. **role_permissions** - Asignación de permisos a roles
7. **audit_logs** - Logs de auditoría
8. **sessions** - Sesiones JWT activas
9. **invitations** - Invitaciones pendientes

### Tablas Modificadas

- **risks** - Agregado `organization_id`, `created_by`
- **alerts** - Agregado `organization_id`
- **mitigation_actions** - Agregado `organization_id`
- **metrics** - Agregado `organization_id`

---

## 🚀 Deployment

### Local Development

```bash
# Build
npm run build

# Start server
pm2 start ecosystem.config.cjs

# Apply migrations
npx wrangler d1 migrations apply metainfox-db-prod --local
```

### Production

```bash
# Apply migrations to production
npx wrangler d1 migrations apply metainfox-db-prod

# Deploy
npm run deploy
```

---

## 🔒 Seguridad

### Implementaciones

1. **JWT con firma HMAC-SHA256**
2. **Tokens de corta duración** (1h access, 7d refresh)
3. **Hash de contraseñas** con salt
4. **CORS habilitado** solo para rutas API
5. **Rate limiting** por organización
6. **Audit logs** completos
7. **Validación de ownership** de recursos
8. **Aislamiento de datos** por tenant

### Recomendaciones para Producción

1. Cambiar `JWT_SECRET` en variables de entorno
2. Usar HTTPS en todos los endpoints
3. Implementar 2FA para administradores
4. Agregar límites de intentos de login
5. Configurar alertas de seguridad
6. Implementar backup automático de audit logs

---

## 📈 Métricas y Monitoreo

El sistema registra automáticamente:

- Total de usuarios por organización
- Total de riesgos creados
- Acciones realizadas (audit logs)
- Último login de usuarios
- Intentos de login fallidos
- Uso de la API por endpoint

---

## 🎯 Próximas Mejoras Sugeridas

1. **Panel de Administración UI** - Interfaz completa para gestión
2. **2FA/MFA** - Autenticación de dos factores
3. **SSO/SAML** - Integración con proveedores enterprise
4. **Email Service** - Notificaciones y invitaciones por email
5. **Webhooks** - Notificaciones a sistemas externos
6. **API Keys** - Acceso programático sin JWT
7. **Billing Integration** - Stripe/PayPal para facturación
8. **Advanced Analytics** - Dashboards por organización
9. **Data Export** - CSV/PDF de riesgos y reportes
10. **Custom Roles** - Creación de roles personalizados por organización

---

## 📞 Soporte

Para dudas o problemas:
- Email: support@metainfox.io
- GitHub: https://github.com/fel482217/metainfox-ai

---

© 2024 Metainfox AI - Enterprise Edition
