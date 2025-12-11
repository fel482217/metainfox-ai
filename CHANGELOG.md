# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [2.1.0] - 2025-12-11

### 🔐 Seguridad y Autenticación

#### Fixed
- **CRÍTICO**: Prevenir renderizado del dashboard sin autenticación
  - Implementado script inline en `<head>` que verifica `localStorage.access_token`
  - Redirect inmediato a `/login` antes de renderizar el body
  - Eliminado problema de "Opción C" (dashboard sin datos visible)
  - Dashboard ahora completamente protegido contra acceso no autenticado

#### Changed
- Movida página de login de `/static/auth.html` a ruta directa `/login`
  - Eliminadas redirecciones complejas que causaban problemas
  - HTML servido directamente desde backend
  - Compatible con Cloudflare Pages sin problemas de extensión `.html`

#### Added
- Overlay de verificación de autenticación con spinner animado
- Feedback visual "Verificando autenticación..." durante redirect
- Favicon SVG inline (🛡️) para eliminar error 404
- Limpieza automática de localStorage obsoleto en logout
- Delay de 500ms en redirect para mostrar mensaje al usuario

#### Documentation
- Creado `AUTH_FLOW_FIX.md` con documentación completa del flujo
- Actualizado README con sección de Autenticación y Seguridad
- Agregadas credenciales de demo y tabla de roles/permisos
- Documentados endpoints de autenticación y administración

### 📊 Mejoras en README
- Agregado link directo a login: https://metainfox.io/login
- Actualizado URL de último backup
- Agregada tabla de credenciales de demo
- Documentado flujo completo de autenticación
- Actualizada sección de próximos pasos con ítems completados

### 🧪 Testing
- Verificado con Playwright Console Capture
- Confirmado redirect instantáneo sin errores JavaScript
- Sin errores 404 (favicon corregido)
- Page load time: ~4-5s
- Final URL correcta: `/login`

### 🚀 Despliegue
- Desplegado a producción: https://metainfox.io
- Build size: 107.97 kB
- Verificado en Cloudflare Pages
- Sin warnings críticos

---

## [2.0.0] - 2025-12-10

### 🏢 Enterprise Multi-Tenant System

#### Added
- **Sistema Multi-Tenancy Completo**
  - Aislamiento total de datos por organización
  - Configuración independiente por tenant
  - Límites configurables (usuarios, riesgos)
  - Facturación independiente por organización
  - Trial de 30 días automático para nuevas organizaciones

- **Autenticación JWT**
  - Access tokens con expiración de 1 hora
  - Refresh tokens con expiración de 7 días
  - Hash de contraseñas con SHA-256
  - Rotación automática de tokens
  - Sesiones persistentes en base de datos

- **RBAC (Role-Based Access Control)**
  - 5 roles predefinidos:
    - `super_admin` - Administrador global del sistema
    - `org_admin` - Administrador de organización
    - `org_manager` - Gestor de riesgos
    - `org_member` - Miembro con acceso básico
    - `org_viewer` - Solo lectura
  - 26 permisos granulares agrupados en:
    - Gestión de riesgos (risks.*)
    - Gestión de alertas (alerts.*)
    - Gestión de usuarios (users.*)
    - Gestión de organizaciones (organizations.*)
    - Sistema (system.*)

- **Gestión de Usuarios**
  - Sistema de invitaciones por email
  - Onboarding automático
  - Asignación de roles
  - Suspensión/reactivación de usuarios
  - Listado con filtros y búsqueda

- **Gestión de Organizaciones**
  - Creación automática en registro
  - Configuración personalizada por organización
  - Límites de recursos (usuarios, riesgos, almacenamiento)
  - Gestión de planes (free, basic, professional, enterprise)
  - Dashboard de organización

- **Audit Logs**
  - Registro completo de acciones
  - Campos: usuario, tipo, recurso, IP, timestamp, resultado
  - Trazabilidad para compliance
  - Retención configurable
  - Búsqueda y filtrado avanzado

- **Rate Limiting**
  - Límites por tenant y endpoint
  - Protección contra brute force
  - Configuración flexible por recurso
  - Ejemplos:
    - Dashboard/Risks: 200 req/min
    - Auth Login: 5 req/5min
    - Auth Register: 3 req/10min

- **Middleware de Seguridad** (`security.ts`)
  - Verificación anti-bot (honeypot, timing analysis)
  - Protección CSRF
  - Validación de inputs
  - Bloqueo temporal de IPs sospechosas
  - Logging de intentos maliciosos

#### Changed
- Modificadas 4 tablas existentes con `organization_id`:
  - `risks` - Aislamiento de riesgos por organización
  - `alerts` - Alertas segmentadas
  - `mitigation_actions` - Acciones por tenant
  - `metrics` - Métricas independientes

- Actualizado schema de base de datos:
  - 9 tablas nuevas para enterprise features
  - Índices optimizados para multi-tenancy
  - Foreign keys para integridad referencial

#### Security
- Login protegido con verificación humana (checkbox)
- Rate limiting estricto en autenticación
- Tokens JWT seguros con expiración
- Protección contra credential stuffing
- Detección de bots en registro/login
- CSRF tokens en formularios

#### Documentation
- Creado `ENTERPRISE_FEATURES.md` (3,500+ líneas)
- Creado `QUICK_START_ENTERPRISE.md`
- Creado `SECURITY_IMPROVEMENTS.md`
- Creado `PRODUCTION_DEPLOYMENT.md`
- Actualizado README principal

---

## [1.0.0] - 2024-12-01

### 🚀 Initial Release

#### Added
- **Dashboard Interactivo**
  - Visualización de métricas clave en tiempo real
  - Score de riesgo global (0-100)
  - Contadores de riesgos activos y críticos
  - Tiempo promedio de respuesta
  - Costo evitado mensual
  - Amenazas mitigadas semanalmente

- **Integración con IA**
  - Powered by Groq (Llama 3.3 70B Versatile)
  - Análisis automático de riesgos en lenguaje natural
  - Clasificación automática (categoría + severidad)
  - Generación de recomendaciones
  - Chatbot conversacional inteligente

- **Base de Datos Cloudflare D1**
  - Schema completo con 5 tablas principales:
    - `risks` - Gestión de riesgos
    - `alerts` - Sistema de alertas
    - `mitigation_actions` - Acciones de mitigación
    - `system_config` - Configuración global
    - `metrics` - Métricas históricas
  - Migraciones versionadas
  - Seeds con datos de prueba

- **API REST Completa**
  - Endpoints para dashboard y analytics
  - CRUD de riesgos
  - Integración con IA (análisis, chat, reportes)
  - Documentación inline
  - Manejo de errores robusto

- **Frontend Vanilla JavaScript**
  - TailwindCSS para estilos
  - FontAwesome para iconos
  - Axios para HTTP requests
  - Sistema de tabs interactivo
  - Filtros en tiempo real

- **Sistema de Riesgos**
  - 6 categorías:
    - Cybersecurity, Financial, Operational
    - Reputational, Regulatory, Strategic
  - 4 niveles de severidad:
    - Critical, High, Medium, Low
  - 5 estados:
    - Open, Investigating, Mitigating, Resolved, Closed
  - Scoring automático (impact × likelihood)

- **Despliegue en Cloudflare Pages**
  - Edge computing global
  - Latencia ultra-baja (<50ms)
  - Auto-scaling
  - SSL/TLS automático
  - Custom domain: metainfox.io

#### Technical Stack
- **Backend**: Hono + TypeScript + Cloudflare Workers
- **Frontend**: Vanilla JS + TailwindCSS
- **Database**: Cloudflare D1 (SQLite)
- **AI**: Groq (Llama 3.3 70B)
- **Deployment**: Cloudflare Pages + Wrangler CLI

---

## Tipos de Cambios

- `Added` - Nuevas funcionalidades
- `Changed` - Cambios en funcionalidades existentes
- `Deprecated` - Funcionalidades que serán removidas
- `Removed` - Funcionalidades removidas
- `Fixed` - Corrección de bugs
- `Security` - Mejoras de seguridad

## Links

- [Producción](https://metainfox.io)
- [Repositorio GitHub](https://github.com/fel482217/metainfox-ai)
- [Documentación Enterprise](./ENTERPRISE_FEATURES.md)
- [Quick Start](./QUICK_START_ENTERPRISE.md)
