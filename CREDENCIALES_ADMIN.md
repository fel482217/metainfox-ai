# 🔐 Credenciales de Administrador - Metainfox AI

## 👨‍💼 Usuarios Administradores Disponibles

### Usuario Admin Principal
```
URL: https://metainfox.io/login
Email: admin@metainfox.io
Password: Demo123!@#
Rol: org_admin
Organización: Metainfox Demo
```

### Usuario Admin Alternativo (NUEVO)
```
URL: https://metainfox.io/login
Email: manager@metainfox.io
Password: Demo123!@#
Rol: org_admin (actualizado desde org_manager)
Organización: Metainfox Demo
```

---

## 📝 Instrucciones de Uso

### Paso 1: Acceder al Login
1. Ve a: **https://metainfox.io/login**
2. Limpia el `localStorage` (importante si hubo errores previos):
   - Abre DevTools (F12)
   - Ve a Console
   - Ejecuta: `localStorage.clear(); location.reload();`

### Paso 2: Hacer Login
1. Ingresa uno de los emails de administrador:
   - `admin@metainfox.io` 
   - `manager@metainfox.io` ✨ **NUEVO**
2. Password: `Demo123!@#`
3. Click en "Iniciar Sesión"

### Paso 3: Acceder al Panel Admin
1. Después de login exitoso, verás el dashboard
2. Ve a: **https://metainfox.io/admin**
3. O click en el botón "Admin" en el header

---

## ✅ Verificación

### Console Logs Esperados (Correcto)
```
✅ 🔍 ADMIN CHECK - User Role: org_admin | Is Admin: true
✅ ✅ Admin access granted. Rendering panel...
✅ 🔧 Admin Panel initialized
✅ 🚀 Initializing Admin Panel...
```

### ❌ NO Deberías Ver Estos Errores
```
❌ Error initializing admin panel: Usuario o organización no encontrados
❌ Invalid or unexpected token
❌ No tienes permisos para acceder al panel de administración
```

---

## 🔧 Troubleshooting

### Si ves "No tienes permisos"
1. **Cierra sesión completamente**:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   location.href = '/login';
   ```
2. **Re-login** con una de las cuentas admin
3. **Verifica** que el rol sea `org_admin`:
   ```javascript
   console.log(JSON.parse(localStorage.getItem('user')));
   ```

### Si los errores persisten
1. **Modo Incógnito**: Abre ventana privada y prueba ahí
2. **Limpiar Cache**: Ctrl + Shift + R (Windows) o Cmd + Shift + R (Mac)
3. **Verificar Console**: Abre DevTools y revisa mensajes de error

---

## 📊 Comparación de Usuarios

| Email | Rol | Permisos Panel Admin | Estado |
|-------|-----|---------------------|--------|
| admin@metainfox.io | org_admin | ✅ Full Access | Activo |
| manager@metainfox.io | org_admin | ✅ Full Access | ✨ **ACTUALIZADO** |
| member@metainfox.io | org_member | ❌ No Access | Activo |
| viewer@metainfox.io | org_viewer | ❌ No Access | Activo |

---

## 🗄️ Base de Datos

### Cambio Realizado
```sql
UPDATE organization_members 
SET role = 'org_admin' 
WHERE user_id = 2 AND organization_id = 1;
```

**Resultado**:
- ✅ 1 row updated
- ✅ User ID 2 (`manager@metainfox.io`) ahora tiene rol `org_admin`
- ✅ Cambio aplicado en producción (`metainfox-db-prod`)

---

## 🔗 URLs Importantes

- 🌐 **Home**: https://metainfox.io
- 🔐 **Login**: https://metainfox.io/login
- 👨‍💼 **Admin Panel**: https://metainfox.io/admin
- 💻 **GitHub**: https://github.com/fel482217/metainfox-ai

---

**Fecha de Creación**: 2025-12-11  
**Versión**: v2.3.0  
**Estado**: ✅ Activo  
**Base de Datos**: metainfox-db-prod (b7f07d5f-e56a-45d5-bcb9-83d6e2eb4c6a)
