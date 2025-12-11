#!/bin/bash
# Script para hacer push a GitHub
# Uso: ./github-push.sh

set -e

echo "═══════════════════════════════════════════════════════"
echo "  Metainfox AI - GitHub Push Helper"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check if we're in the right directory
if [ ! -d ".git" ]; then
    echo "❌ Error: Este script debe ejecutarse desde el directorio del repositorio"
    exit 1
fi

# Show current branch
BRANCH=$(git branch --show-current)
echo "📍 Rama actual: $BRANCH"
echo ""

# Show unpushed commits
UNPUSHED=$(git log origin/$BRANCH..$BRANCH --oneline 2>/dev/null | wc -l)
if [ "$UNPUSHED" -eq 0 ]; then
    echo "✅ No hay commits pendientes de push"
    exit 0
fi

echo "📤 Commits pendientes de push: $UNPUSHED"
echo ""
echo "Commits:"
git log origin/$BRANCH..$BRANCH --oneline --color=always | head -20
echo ""

# Confirm push
read -p "¿Deseas hacer push de estos commits? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Push cancelado"
    exit 0
fi

# Try to push
echo ""
echo "🚀 Intentando push a GitHub..."
echo ""

if git push origin $BRANCH; then
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "✅ Push completado exitosamente!"
    echo "═══════════════════════════════════════════════════════"
    echo ""
    echo "📍 Repositorio: https://github.com/fel482217/metainfox-ai"
    echo "🌿 Rama: $BRANCH"
    echo "📦 Commits subidos: $UNPUSHED"
    echo ""
else
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "❌ Error al hacer push"
    echo "═══════════════════════════════════════════════════════"
    echo ""
    echo "Posibles soluciones:"
    echo ""
    echo "1. Configurar GitHub desde el Sandbox UI:"
    echo "   - Ve al tab #github"
    echo "   - Completa la autorización"
    echo "   - Vuelve a ejecutar este script"
    echo ""
    echo "2. Usar token de acceso personal (PAT):"
    echo "   git remote set-url origin https://TOKEN@github.com/fel482217/metainfox-ai.git"
    echo "   git push origin $BRANCH"
    echo ""
    echo "3. Usar SSH (si tienes configurado):"
    echo "   git remote set-url origin git@github.com:fel482217/metainfox-ai.git"
    echo "   git push origin $BRANCH"
    echo ""
    exit 1
fi
