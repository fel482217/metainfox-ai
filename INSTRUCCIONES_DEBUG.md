# 🔍 Herramienta de Debug - Admin Access

## 🚨 Problema Reportado

**Error**: "No tienes permisos para acceder al panel de administración"  
**Persiste**: En múltiples navegadores  
**Estado**: Investigando causa raíz

---

## 🛠️ Herramienta de Diagnóstico

He creado una herramienta de debug que te ayudará a identificar **exactamente** qué está causando el problema.

### 📍 URL de la Herramienta

**https://metainfox.io/test-admin-debug.html**

---

## 📋 Pasos para Diagnosticar

### Paso 1: Hacer Login
1. Ve a: **https://metainfox.io/login**
2. Usa cualquiera de estas credenciales:
   - `admin@metainfox.io` / `Demo123!@#`
   - `manager@metainfox.io` / `Demo123!@#`
3. Espera a que cargue el dashboard

### Paso 2: Ir a la Herramienta de Debug
1. Ve a: **https://metainfox.io/test-admin-debug.html**
2. Click en el botón **"🔍 Verificar Acceso Admin"**

### Paso 3: Leer los Resultados
La herramienta te mostrará:
- ✅ **Si tienes token** de acceso
- ✅ **Si el objeto user existe** en localStorage
- ✅ **Si el objeto user tiene el campo `role`**
- ✅ **Cuál es tu rol** exactamente
- ✅ **Si tu rol tiene permisos** de admin

---

## 🎯 Escenarios Posibles

### Escenario A: "Campo role Ausente"
**Problema**: El objeto `user` no tiene el campo `role`  
**Causa**: Bug en el backend o en el proceso de login  
**Solución**: Necesito ver el diagnóstico para identificar el problema

### Escenario B: "Usuario NO es Administrador"
**Problema**: Tu rol es `org_member` o `org_viewer` en lugar de `org_admin`  
**Causa**: Algo falló al actualizar el rol en la base de datos  
**Solución**: Necesito verificar la base de datos nuevamente

### Escenario C: "Todo Correcto pero Aún Falla"
**Problema**: El diagnóstico dice que todo está bien pero `/admin` sigue rechazándote  
**Causa**: Problema de caché o bug en el código de verificación  
**Solución**: Investigar más a fondo con los datos del diagnóstico

---

## 📸 Qué Necesito de Ti

**Por favor, haz lo siguiente**:

1. ✅ **Sigue los 3 pasos** de arriba
2. ✅ **Toma screenshot** de los resultados completos de la herramienta
3. ✅ **Comparte** el screenshot conmigo
4. ✅ **Indica** con qué email hiciste login (admin@ o manager@)

Con esa información podré identificar **exactamente** qué está fallando.

---

## 🔧 Funciones de la Herramienta

### Verificación 1: Token
```javascript
✅ Token Encontrado
   access_token está presente en localStorage
   token_preview: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Verificación 2: Usuario
```javascript
✅ Usuario Parseado
   Objeto user parseado correctamente
   {
     "id": 2,
     "email": "manager@metainfox.io",
     "full_name": "Manager User",
     "role": "org_admin"  // ← Este campo es CRÍTICO
   }
```

### Verificación 3: Rol
```javascript
✅ Campo role Presente
   El campo role existe: "org_admin"
```

### Verificación 4: Permisos
```javascript
✅ Usuario ES Administrador
   Tu rol "org_admin" tiene permisos de administrador
```

---

## 🚀 Opciones Adicionales

### Botón "Limpiar localStorage"
Si ves datos corruptos o inconsistentes, usa el botón rojo:
```
🗑️ Limpiar localStorage y Recargar
```

Esto:
1. Elimina TODO de localStorage y sessionStorage
2. Recarga la página automáticamente
3. Te permite empezar desde cero

---

## 📝 Notas Técnicas

### Backend Verificado ✅
El backend está devolviendo correctamente:
```json
{
  "user": {
    "id": 2,
    "email": "manager@metainfox.io",
    "full_name": "Manager User",
    "role": "org_admin"  // ✅ Correcto
  }
}
```

### Base de Datos Verificada ✅
```sql
SELECT role FROM organization_members 
WHERE user_id = 2 AND organization_id = 1;
-- Resultado: org_admin ✅
```

### Código de Verificación ✅
```javascript
const isAdmin = user.role === 'super_admin' || user.role === 'org_admin';
// Si user.role es "org_admin", isAdmin debería ser true
```

---

## 🎯 Próximos Pasos

1. **Usa la herramienta** de debug
2. **Comparte** los resultados
3. **Identificaremos** la causa exacta
4. **Aplicaremos** la solución correcta

---

## 📦 Recursos

- 🔍 **Debug Tool**: https://metainfox.io/test-admin-debug.html
- 🔐 **Login**: https://metainfox.io/login
- 👨‍💼 **Admin Panel**: https://metainfox.io/admin
- 💻 **GitHub**: https://github.com/fel482217/metainfox-ai
- 📄 **Credenciales**: [CREDENCIALES_ADMIN.md](./CREDENCIALES_ADMIN.md)

---

**Fecha**: 2025-12-11  
**Versión**: v2.3.0  
**Estado**: 🔍 Diagnosticando  
**Commit**: d733ee9
