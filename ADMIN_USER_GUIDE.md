# 👨‍💼 Guía de Usuario - Panel de Administración

## Metainfox AI - Sistema Enterprise v2.3.0

---

## 📋 Índice

1. [Introducción](#introducción)
2. [Requisitos de Acceso](#requisitos-de-acceso)
3. [Inicio de Sesión](#inicio-de-sesión)
4. [Dashboard Administrativo](#dashboard-administrativo)
5. [Gestión de Usuarios](#gestión-de-usuarios)
6. [Configuración de Organización](#configuración-de-organización)
7. [Audit Log](#audit-log)
8. [Roles y Permisos](#roles-y-permisos)
9. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## 🎯 Introducción

El **Panel de Administración** de Metainfox AI es una herramienta enterprise diseñada para administradores que necesitan gestionar usuarios, configurar su organización y monitorear la actividad del sistema.

### Características Principales:
- ✅ **Gestión Centralizada**: Control total de usuarios y organización
- ✅ **Multi-Tenancy**: Aislamiento completo de datos por organización
- ✅ **RBAC**: Control de acceso basado en roles
- ✅ **Audit Log**: Registro completo de acciones administrativas
- ✅ **Panel Intuitivo**: Interfaz moderna y fácil de usar

---

## 🔐 Requisitos de Acceso

### Roles con Acceso al Panel Admin:
| Rol | Acceso | Permisos |
|-----|--------|----------|
| **Super Admin** | ✅ Completo | Gestión global de múltiples organizaciones |
| **Org Admin** | ✅ Completo | Gestión completa de su organización |
| **Manager** | ❌ No | Solo acceso al dashboard principal |
| **Member** | ❌ No | Solo acceso al dashboard principal |
| **Viewer** | ❌ No | Solo lectura en dashboard |

### Credenciales de Demo:
Para probar el sistema, puede usar las siguientes credenciales:

**Admin:**
```
Email: admin@metainfox.io
Password: Demo123!@#
```

**Usuario Regular (sin acceso admin):**
```
Email: member@metainfox.io
Password: Demo123!@#
```

---

## 🚪 Inicio de Sesión

### Paso 1: Acceder a la Página de Login
Navegue a:
- **Producción:** https://metainfox.io/login
- **Sandbox:** https://3000-ixhphtag1cp5vzidyw43p-c81df28e.sandbox.novita.ai/login

### Paso 2: Ingresar Credenciales
1. Ingrese su **email corporativo**
2. Ingrese su **contraseña**
3. Marque el checkbox **"No soy un robot"**
4. Click en **"Iniciar Sesión"**

### Paso 3: Verificación
- Si las credenciales son correctas, será redirigido al **Dashboard Principal**
- Si tiene rol de **Admin**, verá un botón "Admin" en el header

### Paso 4: Acceder al Panel Admin
- Click en el botón **"Admin"** en la esquina superior derecha
- Será redirigido a `/admin`

---

## 📊 Dashboard Administrativo

### Vista Principal
Al acceder a `/admin`, verá:

#### Estadísticas Principales (Top Cards):
1. **Total Usuarios**: Cantidad de usuarios en la organización
2. **Riesgos Activos**: Número de riesgos sin resolver
3. **Plan Actual**: Tipo de plan (Free, Professional, Enterprise)
4. **Estado**: Estado del plan (Active, Trial, Suspended)

#### Navegación por Tabs:
- 📊 **Dashboard**: Vista general e información de la organización
- 👥 **Usuarios**: Gestión de usuarios (CRUD, roles, permisos)
- 🏢 **Organización**: Configuración de la organización
- 📋 **Audit Log**: Historial de acciones administrativas

#### Sección de Información:
- **Información de la Organización:**
  - Nombre
  - Industria
  - Tamaño de la empresa
  - Plan actual
  - Límites (máximo usuarios, máximo riesgos)

#### Acciones Rápidas:
- 🔘 **Gestionar Usuarios** → Ir a sección de usuarios
- 🔘 **Configuración de Organización** → Ir a configuración
- 🔘 **Ver Audit Log** → Ir a historial de actividad

---

## 👥 Gestión de Usuarios

> **Nota:** Esta funcionalidad está en desarrollo activo.

### Funcionalidades Planificadas:

#### Listar Usuarios:
- Ver todos los usuarios de la organización
- Filtrar por rol, estado, fecha de creación
- Buscar por nombre o email

#### Crear Usuario:
1. Click en botón **"Nuevo Usuario"**
2. Llenar formulario:
   - Nombre completo
   - Email corporativo
   - Rol (Admin, Manager, Member, Viewer)
3. Enviar invitación por email
4. Usuario recibe link de activación

#### Editar Usuario:
- Cambiar rol
- Actualizar información personal
- Modificar permisos específicos

#### Suspender/Reactivar:
- Suspender temporalmente acceso sin eliminar cuenta
- Reactivar usuario suspendido
- Historial de suspensiones en audit log

#### Eliminar Usuario:
- Eliminación permanente (con confirmación)
- Transferencia de datos a otro usuario
- Registro en audit log

---

## 🏢 Configuración de Organización

### Información General

Puede editar la siguiente información de su organización:

#### Campos Editables:
| Campo | Descripción | Ejemplo |
|-------|-------------|---------|
| **Nombre** | Nombre de la organización | "Metainfox Demo" |
| **Industria** | Sector industrial | "Technology", "Finance", "Healthcare" |
| **Tamaño** | Tamaño de la empresa | Small (1-50), Medium (51-250), Large (251-1000), Enterprise (1000+) |
| **País** | País de operación | "Mexico", "USA", "España" |
| **Sitio Web** | URL del sitio corporativo | https://metainfox.io |
| **Descripción** | Descripción breve | "Enterprise Risk Management" |

### Cómo Actualizar:

#### Paso 1: Acceder a Configuración
- En el panel admin, click en tab **"Organización"**

#### Paso 2: Editar Campos
- Modifique los campos que desea actualizar
- Los cambios se validan en tiempo real

#### Paso 3: Guardar Cambios
- Click en botón **"Guardar Cambios"**
- Confirmación: "Organización actualizada exitosamente"

#### Paso 4: Verificar
- Los cambios se reflejan inmediatamente
- Se registra la acción en el audit log

### Configuración Avanzada (Próximamente):

- **Límites y Cuotas:**
  - Máximo de usuarios
  - Máximo de riesgos
  - Rate limits de API

- **Integraciones:**
  - SSO (Single Sign-On)
  - SAML 2.0
  - OAuth 2.0

- **Seguridad:**
  - Política de contraseñas
  - 2FA obligatorio
  - Sesiones simultáneas

- **Personalización:**
  - Logo de la empresa
  - Colores corporativos
  - Email templates

---

## 📋 Audit Log

> **Nota:** Esta funcionalidad está en desarrollo activo.

### Descripción
El **Audit Log** registra todas las acciones administrativas realizadas en el sistema, proporcionando un historial completo para auditorías de seguridad y cumplimiento.

### Eventos Registrados:

#### Acciones de Usuario:
- ✅ Login / Logout
- ✅ Creación de usuario
- ✅ Modificación de rol
- ✅ Suspensión / Reactivación
- ✅ Eliminación de usuario

#### Acciones de Organización:
- ✅ Actualización de información
- ✅ Cambio de plan
- ✅ Modificación de límites

#### Acciones de Seguridad:
- ✅ Cambios de contraseña
- ✅ Activación de 2FA
- ✅ Intentos de login fallidos
- ✅ Accesos denegados

### Información del Log:
Cada entrada incluye:
- **Timestamp**: Fecha y hora exacta
- **Usuario**: Quién realizó la acción
- **Acción**: Qué se hizo
- **Recurso**: Sobre qué/quién
- **IP Address**: Dirección IP de origen
- **User Agent**: Navegador/dispositivo
- **Resultado**: Éxito o fallo

### Filtros y Búsqueda (Próximamente):
- Filtrar por usuario
- Filtrar por tipo de acción
- Filtrar por rango de fechas
- Buscar por recurso específico
- Exportar a CSV/PDF

---

## 🔒 Roles y Permisos

### Sistema RBAC (Role-Based Access Control)

Metainfox AI implementa un sistema completo de roles y permisos para controlar el acceso a funcionalidades.

### Roles Disponibles:

#### 1. Super Admin 👑
**Descripción:** Control total del sistema, múltiples organizaciones

**Permisos:**
- ✅ Gestionar todas las organizaciones
- ✅ Crear/editar/eliminar organizaciones
- ✅ Gestionar todos los usuarios
- ✅ Ver todos los audit logs
- ✅ Configurar sistema global

**Casos de Uso:**
- Administrador de la plataforma
- Soporte técnico nivel 3

---

#### 2. Org Admin 🛡️
**Descripción:** Administrador de una organización específica

**Permisos:**
- ✅ Gestionar usuarios de su organización
- ✅ Configurar su organización
- ✅ Ver audit log de su organización
- ✅ Gestionar todos los riesgos
- ✅ Acceder al panel de administración
- ❌ No puede acceder a otras organizaciones

**Casos de Uso:**
- Director de TI
- Responsable de seguridad
- Gerente de riesgos

---

#### 3. Manager 📋
**Descripción:** Gestor de equipo con permisos sobre riesgos

**Permisos:**
- ✅ Gestionar riesgos de su equipo
- ✅ Ver usuarios de su equipo
- ✅ Crear y asignar riesgos
- ✅ Ver estadísticas de equipo
- ❌ No puede gestionar usuarios
- ❌ No accede al panel admin

**Casos de Uso:**
- Jefe de departamento
- Líder de proyecto
- Coordinador de seguridad

---

#### 4. Member 👤
**Descripción:** Miembro regular con acceso básico

**Permisos:**
- ✅ Ver riesgos asignados
- ✅ Crear nuevos riesgos
- ✅ Actualizar estado de sus riesgos
- ✅ Usar chat de IA y análisis
- ❌ No puede gestionar usuarios
- ❌ No puede ver riesgos de otros
- ❌ No accede al panel admin

**Casos de Uso:**
- Empleado regular
- Analista de riesgos
- Colaborador del equipo

---

#### 5. Viewer 👁️
**Descripción:** Solo lectura, sin permisos de modificación

**Permisos:**
- ✅ Ver dashboard (solo lectura)
- ✅ Ver riesgos públicos
- ✅ Ver estadísticas generales
- ❌ No puede crear/editar riesgos
- ❌ No puede gestionar usuarios
- ❌ No accede al panel admin

**Casos de Uso:**
- Auditor externo
- Consultor de lectura
- Stakeholder externo

---

### Permisos Granulares:

El sistema soporta **26 permisos granulares** que pueden asignarse individualmente:

#### Permisos de Usuarios:
- `users.view` - Ver usuarios
- `users.create` - Crear usuarios
- `users.update` - Actualizar usuarios
- `users.delete` - Eliminar usuarios
- `users.manage_roles` - Gestionar roles

#### Permisos de Organización:
- `organization.view` - Ver información
- `organization.update` - Actualizar información
- `organization.manage_settings` - Gestionar configuración
- `organization.manage_billing` - Gestionar facturación

#### Permisos de Riesgos:
- `risks.view` - Ver riesgos
- `risks.create` - Crear riesgos
- `risks.update` - Actualizar riesgos
- `risks.delete` - Eliminar riesgos
- `risks.assign` - Asignar riesgos

#### Permisos de AI:
- `ai.analyze` - Usar análisis de IA
- `ai.chat` - Usar chat de IA
- `ai.report` - Generar reportes con IA

#### Permisos Administrativos:
- `admin.access` - Acceder al panel admin
- `admin.audit_log` - Ver audit log
- `admin.system_settings` - Configurar sistema

---

## ❓ Preguntas Frecuentes

### ¿Cómo accedo al panel de administración?
**R:** Necesita tener rol de **Super Admin** u **Org Admin**. Si tiene este rol, verá un botón "Admin" en el header después de hacer login.

### ¿Puedo cambiar mi propio rol?
**R:** No, por seguridad. Solo otro administrador puede cambiar su rol.

### ¿Qué pasa si suspendo a un usuario?
**R:** El usuario no podrá iniciar sesión, pero sus datos permanecen intactos. Puede reactivarlo en cualquier momento.

### ¿Los cambios se registran?
**R:** Sí, todas las acciones administrativas se registran automáticamente en el Audit Log.

### ¿Puedo exportar datos de usuarios?
**R:** Esta funcionalidad estará disponible próximamente en formato CSV/Excel.

### ¿Qué es el aislamiento multi-tenant?
**R:** Significa que cada organización tiene sus datos completamente separados. Un admin de la organización A no puede ver datos de la organización B.

### ¿Cómo cambio el plan de mi organización?
**R:** Por ahora, contacte al soporte. El módulo de facturación self-service estará disponible próximamente.

### ¿Puedo personalizar el logo de mi organización?
**R:** Esta funcionalidad estará disponible en la próxima versión (v2.4.0).

### ¿El sistema soporta SSO?
**R:** Está en desarrollo. Soportaremos SAML 2.0 y OAuth 2.0 próximamente.

### ¿Cómo obtengo ayuda?
**R:** Contacte a soporte en: support@metainfox.io

---

## 🆘 Soporte

### Contacto:
- **Email:** support@metainfox.io
- **Documentación:** https://docs.metainfox.io
- **Status:** https://status.metainfox.io

### Reportar Problemas:
Si encuentra un problema:
1. Tome un screenshot
2. Describa los pasos para reproducirlo
3. Envíe a support@metainfox.io

---

## 📝 Notas de Versión

### v2.3.0 (Actual)
- ✅ Panel de administración completo
- ✅ Gestión de organización funcional
- ✅ Control de acceso por roles
- ⏳ Gestión de usuarios (en desarrollo)
- ⏳ Audit log (en desarrollo)

### Próximas Funcionalidades (v2.4.0):
- [ ] CRUD completo de usuarios
- [ ] Visualización de audit log
- [ ] Exportación de datos
- [ ] Personalización de marca
- [ ] SSO integration

---

**Documento generado:** 2025-12-11  
**Versión:** v2.3.0  
**Proyecto:** Metainfox AI Enterprise
