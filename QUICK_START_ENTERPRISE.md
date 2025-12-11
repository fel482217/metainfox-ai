# 🚀 Quick Start - Metainfox AI Enterprise Edition

## URLs de Acceso

### 🌐 Sandbox Development
- **Dashboard Principal**: https://3000-ixhphtag1cp5vzidyw43p-c81df28e.sandbox.novita.ai
- **Página de Login**: https://3000-ixhphtag1cp5vzidyw43p-c81df28e.sandbox.novita.ai/login
  *(Redirige automáticamente a /static/auth.html)*

### 🚀 Producción (Próximamente)
- **URL Producción**: https://metainfox.io
- **Login Producción**: https://metainfox.io/login

---

## 🔐 Credenciales de Demostración

Todas las cuentas usan la contraseña: **`Demo123!@#`**

| Rol | Email | Permisos |
|-----|-------|----------|
| **Admin** | admin@metainfox.io | Control total de la organización |
| **Manager** | manager@metainfox.io | Gestión de riesgos y usuarios (limitado) |
| **Member** | member@metainfox.io | Crear/editar riesgos |
| **Viewer** | viewer@metainfox.io | Solo lectura |

**Organización Demo**: Metainfox Demo (slug: `metainfox-demo`)

---

## 📝 Flujo de Uso Enterprise

### 1️⃣ Login

**Opción A: Usar credenciales demo**
1. Ve a: https://3000-ixhphtag1cp5vzidyw43p-c81df28e.sandbox.novita.ai/login
2. Selecciona tab "Iniciar Sesión"
3. Email: `admin@metainfox.io`
4. Password: `Demo123!@#`
5. Click "Iniciar Sesión"

**Opción B: Crear nueva cuenta**
1. Ve a: https://3000-ixhphtag1cp5vzidyw43p-c81df28e.sandbox.novita.ai/login
2. Selecciona tab "Registrarse"
3. Completa:
   - Nombre Completo
   - Email
   - Nombre de Organización (ejemplo: "Mi Empresa S.A.")
   - Contraseña (mínimo 8 caracteres)
4. Click "Crear Cuenta"
5. ✅ Recibes automáticamente 30 días de trial

### 2️⃣ Explorar Dashboard

Después del login, llegas al dashboard principal:
- ✅ Ver estadísticas de riesgos
- ✅ Filtrar riesgos por categoría/severidad
- ✅ Usar análisis con IA
- ✅ Chat con asistente IA

### 3️⃣ Gestión de Usuarios (Solo Admin)

**Invitar nuevo usuario:**
```bash
curl -X POST https://3000-ixhphtag1cp5vzidyw43p-c81df28e.sandbox.novita.ai/api/admin/users/invite \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nuevo@empresa.com",
    "role": "org_member"
  }'
```

**Ver usuarios de tu organización:**
```bash
curl https://3000-ixhphtag1cp5vzidyw43p-c81df28e.sandbox.novita.ai/api/admin/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4️⃣ Crear Riesgos

**Con autenticación:**
```bash
curl -X POST https://3000-ixhphtag1cp5vzidyw43p-c81df28e.sandbox.novita.ai/api/risks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "cybersecurity",
    "severity": "high",
    "title": "Vulnerabilidad detectada",
    "description": "Descripción del riesgo",
    "source": "manual"
  }'
```

### 5️⃣ Ver Audit Logs

```bash
curl https://3000-ixhphtag1cp5vzidyw43p-c81df28e.sandbox.novita.ai/api/admin/audit-logs \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🧪 Testing Completo

### Test 1: Login y obtener token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@metainfox.io",
    "password": "Demo123!@#"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "access_token": "eyJhbGciOiJI...",
  "refresh_token": "eyJhbGciOiJI...",
  "user": {
    "id": 1,
    "email": "admin@metainfox.io",
    "full_name": "Admin User"
  },
  "organization": {
    "id": 1,
    "name": "Metainfox Demo",
    "slug": "metainfox-demo",
    "plan_type": "professional"
  }
}
```

### Test 2: Acceder al dashboard (requiere token)
```bash
# Reemplaza YOUR_TOKEN con el access_token del login
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/dashboard/stats
```

### Test 3: Listar usuarios (solo admin)
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/admin/users
```

### Test 4: Crear nuevo usuario/organización
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@empresa.com",
    "password": "TestPass123",
    "full_name": "Test User",
    "organization_name": "Empresa Test"
  }'
```

---

## 🔑 Estructura de Access Token (JWT)

El access token contiene:
```json
{
  "sub": "1",                    // user_id
  "email": "admin@metainfox.io",
  "org_id": "1",                 // organization_id
  "role": "org_admin",
  "exp": 1234567890,             // Expira en 1 hora
  "iat": 1234567890,
  "jti": "unique-id"
}
```

---

## 🛡️ Niveles de Acceso por Rol

| Funcionalidad | Viewer | Member | Manager | Admin | Super Admin |
|---------------|--------|--------|---------|-------|-------------|
| Ver dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver riesgos | ✅ | ✅ | ✅ | ✅ | ✅ |
| Crear riesgos | ❌ | ✅ | ✅ | ✅ | ✅ |
| Editar riesgos | ❌ | ✅ | ✅ | ✅ | ✅ |
| Eliminar riesgos | ❌ | ❌ | ❌ | ✅ | ✅ |
| Análisis con IA | ❌ | ✅ | ✅ | ✅ | ✅ |
| Chat con IA | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver usuarios | ❌ | ❌ | ✅ | ✅ | ✅ |
| Invitar usuarios | ❌ | ❌ | ✅ | ✅ | ✅ |
| Gestionar roles | ❌ | ❌ | ❌ | ✅ | ✅ |
| Eliminar usuarios | ❌ | ❌ | ❌ | ✅ | ✅ |
| Configurar org | ❌ | ❌ | ❌ | ✅ | ✅ |
| Ver audit logs | ❌ | ❌ | ❌ | ✅ | ✅ |
| Gestionar orgs | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 📊 Dashboard Features

Cuando accedas al dashboard, verás:

1. **Stats Cards**:
   - Score de Riesgo Global (0-100)
   - Riesgos Activos / Totales
   - Críticos Pendientes
   - Tiempo de Respuesta Promedio

2. **Tabs**:
   - 🔹 **Riesgos**: Lista filtrable
   - 🧠 **Analizar con IA**: Input para análisis automático
   - 💬 **Chat con IA**: Asistente conversacional

3. **User Info** (esquina superior derecha):
   - Nombre del usuario
   - Organización actual
   - Botón "Salir"

---

## 🐛 Troubleshooting

### Error: "No autorizado"
- ✅ Verifica que el token no haya expirado (1 hora)
- ✅ Usa el header `Authorization: Bearer TOKEN`
- ✅ Refresca el token con `/api/auth/refresh`

### Error: "Acceso denegado"
- ✅ Verifica que tu rol tenga el permiso necesario
- ✅ Consulta los permisos con `GET /api/auth/me`

### El dashboard no carga datos
- ✅ Haz login primero en `/login`
- ✅ El sistema redirige automáticamente si no estás autenticado

---

## 📞 Soporte

Para dudas o problemas:
- **Email**: support@metainfox.io
- **GitHub Issues**: https://github.com/fel482217/metainfox-ai/issues
- **Documentación Completa**: Ver `ENTERPRISE_FEATURES.md`

---

© 2024 Metainfox AI - Enterprise Edition
