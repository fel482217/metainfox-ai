# 🚀 Guía para Subir Metainfox AI a GitHub

## ✅ Repositorio Configurado
- **URL**: https://github.com/fel482217/metainfox-ai
- **Branch**: main
- **Commits**: 3 commits listos para push

---

## 📦 OPCIÓN 1: Descarga y Push Manual (Recomendado)

### Paso 1: Descargar el Proyecto
```bash
# Descargar backup completo
curl -L -o metainfox-ai.tar.gz https://www.genspark.ai/api/files/s/6x5JM5ab

# Extraer
tar -xzf metainfox-ai.tar.gz

# Navegar al proyecto
cd home/user/webapp
```

### Paso 2: Verificar Git
```bash
# Ver commits
git log --oneline

# Debería mostrar:
# bff44b5 Deploy v1.0.0 a producción en Cloudflare Pages
# b2af736 Metainfox AI v1.0.0 - Sistema completamente funcional
# 8b63091 Initial commit: Metainfox AI - Sistema de Gestión de Riesgos con IA

# Ver estado
git status

# Ver remote
git remote -v
# Debería mostrar:
# origin https://github.com/fel482217/metainfox-ai.git (fetch)
# origin https://github.com/fel482217/metainfox-ai.git (push)
```

### Paso 3: Push a GitHub
```bash
# Si es la primera vez, GitHub te pedirá autenticación
git push -u origin main

# Si tienes 2FA habilitado, usa un Personal Access Token como password
# Crear token: https://github.com/settings/tokens/new
```

### Paso 4: Verificar en GitHub
Abre: https://github.com/fel482217/metainfox-ai

Deberías ver:
- ✅ 3 commits
- ✅ README.md con documentación completa
- ✅ Todo el código fuente
- ✅ Configuración de Cloudflare

---

## 🔑 OPCIÓN 2: Push con Token (Desde Sandbox)

Si prefieres que yo suba el código desde el sandbox:

### Paso 1: Crear Personal Access Token
1. Ve a: https://github.com/settings/tokens/new
2. Nombre: `metainfox-deployment`
3. Permisos: ✅ `repo` (Full control)
4. Click "Generate token"
5. Copia el token (empieza con `ghp_...`)

### Paso 2: Darme el Token
Responde con el token y yo ejecutaré:

```bash
git remote set-url origin https://TOKEN@github.com/fel482217/metainfox-ai.git
git push -u origin main
```

---

## 📋 Contenido que se Subirá

### Archivos Principales:
```
✅ README.md (9.8 KB) - Documentación completa
✅ package.json - Dependencias y scripts
✅ wrangler.jsonc - Configuración Cloudflare
✅ ecosystem.config.cjs - PM2 config
✅ .gitignore - Ignora node_modules, .env, etc.
```

### Código Fuente:
```
✅ src/index.ts - Aplicación Hono principal
✅ src/services/ai.ts - Servicio de IA (Groq)
✅ src/types/index.ts - Definiciones TypeScript
✅ public/static/app.js - Frontend JavaScript
```

### Base de Datos:
```
✅ migrations/0001_create_tables.sql - Schema D1
✅ seed_simple.sql - Datos de prueba
```

### Configuración:
```
✅ vite.config.ts - Build configuration
✅ tsconfig.json - TypeScript config
```

### NO se subirá (está en .gitignore):
```
❌ node_modules/ - Dependencias (50+ MB)
❌ .dev.vars - Secrets locales
❌ .wrangler/ - Cache de wrangler
❌ .env - Variables de entorno
❌ dist/ - Build artifacts
```

---

## 🎯 Después del Push

Una vez subido, tu repositorio tendrá:

1. **README completo** con:
   - URLs de producción
   - Documentación de API
   - Guía de instalación
   - Stack tecnológico

2. **Historial Git** con 3 commits:
   - Initial commit (estructura base)
   - Sistema funcional (todas las features)
   - Deploy a producción (configuración final)

3. **Código listo** para:
   - Clonar en cualquier máquina
   - Deploy automático con CI/CD
   - Colaboración con equipo
   - Portfolio profesional

---

## ✨ Enlaces Importantes

Después del push, tu proyecto estará en:

- **Código**: https://github.com/fel482217/metainfox-ai
- **Producción**: https://2c2f0c9a.metainfox-ai.pages.dev
- **Backup**: https://www.genspark.ai/api/files/s/6x5JM5ab

---

## 🆘 Solución de Problemas

### Error: "failed to push some refs"
```bash
# El repo tiene contenido, usa force push
git push -f origin main
```

### Error: "Authentication failed"
```bash
# Usa Personal Access Token en vez de password
# Crear: https://github.com/settings/tokens/new
```

### Error: "Permission denied"
```bash
# Verifica que tienes permisos en el repo
# Debe ser tu usuario: fel482217
```

---

## 📞 Ayuda

Si tienes problemas:
1. Verifica que el repo esté vacío o permite force push
2. Usa un Personal Access Token si tienes 2FA
3. Asegúrate de tener permisos de escritura

¡Éxito con el push! 🚀
