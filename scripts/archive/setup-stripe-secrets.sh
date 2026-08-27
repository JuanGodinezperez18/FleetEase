#!/bin/bash

# ============================================
# Script de configuración de Stripe para Firebase
# ============================================
# Ejecuta este script después de habilitar billing en Firebase
# ============================================

echo "🔐 Configuración de Stripe para Firebase Cloud Functions"
echo "========================================================"
echo ""

# Verificar que firebase-tools esté instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Error: firebase-tools no está instalado"
    echo "Instala con: npm install -g firebase-tools"
    exit 1
fi

# Verificar que estemos logueados
echo "🔍 Verificando autenticación con Firebase..."
firebase projects:list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Error: No estás logueado en Firebase"
    echo "Ejecuta: firebase login"
    exit 1
fi

echo "✅ Autenticación verificada"
echo ""

# Proyecto actual
PROJECT=$(cat .firebaserc | grep -o '"default": "[^"]*"' | cut -d'"' -f4)
echo "📁 Proyecto Firebase: $PROJECT"
echo ""

# Pedir las claves de Stripe
echo "📋 Ingresa las siguientes claves de Stripe:"
echo ""

# STRIPE_SECRET_KEY
read -p "STRIPE_SECRET_KEY (sk_test_...): " STRIPE_SECRET
if [ -n "$STRIPE_SECRET" ]; then
    echo "$STRIPE_SECRET" | firebase functions:secrets:set STRIPE_SECRET_KEY
    echo "✅ STRIPE_SECRET_KEY configurada"
fi

# APP_URL
read -p "APP_URL (ej: https://fleetease-manager.web.app): " APP_URL
if [ -n "$APP_URL" ]; then
    echo "$APP_URL" | firebase functions:secrets:set APP_URL
    echo "✅ APP_URL configurada"
fi

# STRIPE_WEBHOOK_SECRET (opcional)
read -p "STRIPE_WEBHOOK_SECRET (whsec_..., opcional, presiona Enter para saltar): " WEBHOOK_SECRET
if [ -n "$WEBHOOK_SECRET" ]; then
    echo "$WEBHOOK_SECRET" | firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
    echo "✅ STRIPE_WEBHOOK_SECRET configurada"
fi

# Price IDs
echo ""
echo "📦 Ingresa los Price IDs de cada plan:"
read -p "STRIPE_PRICE_ID_STARTER (price_...): " STARTER_ID
if [ -n "$STARTER_ID" ]; then
    echo "$STARTER_ID" | firebase functions:secrets:set STRIPE_PRICE_ID_STARTER
    echo "✅ STRIPE_PRICE_ID_STARTER configurada"
fi

read -p "STRIPE_PRICE_ID_PRO (price_...): " PRO_ID
if [ -n "$PRO_ID" ]; then
    echo "$PRO_ID" | firebase functions:secrets:set STRIPE_PRICE_ID_PRO
    echo "✅ STRIPE_PRICE_ID_PRO configurada"
fi

read -p "STRIPE_PRICE_ID_ENTERPRISE (price_...): " ENTERPRISE_ID
if [ -n "$ENTERPRISE_ID" ]; then
    echo "$ENTERPRISE_ID" | firebase functions:secrets:set STRIPE_PRICE_ID_ENTERPRISE
    echo "✅ STRIPE_PRICE_ID_ENTERPRISE configurada"
fi

echo ""
echo "========================================================"
echo "✅ Configuración completada"
echo "========================================================"
echo ""

# Listar secrets configurados
echo "📋 Secrets configurados:"
firebase functions:secrets:access STRIPE_SECRET_KEY --quiet > /dev/null 2>&1 && echo "  ✅ STRIPE_SECRET_KEY"
firebase functions:secrets:access APP_URL --quiet > /dev/null 2>&1 && echo "  ✅ APP_URL"
firebase functions:secrets:access STRIPE_WEBHOOK_SECRET --quiet > /dev/null 2>&1 && echo "  ✅ STRIPE_WEBHOOK_SECRET"
firebase functions:secrets:access STRIPE_PRICE_ID_STARTER --quiet > /dev/null 2>&1 && echo "  ✅ STRIPE_PRICE_ID_STARTER"
firebase functions:secrets:access STRIPE_PRICE_ID_PRO --quiet > /dev/null 2>&1 && echo "  ✅ STRIPE_PRICE_ID_PRO"
firebase functions:secrets:access STRIPE_PRICE_ID_ENTERPRISE --quiet > /dev/null 2>&1 && echo "  ✅ STRIPE_PRICE_ID_ENTERPRISE"

echo ""
echo "🚀 Ahora puedes desplegar las funciones con:"
echo "   firebase deploy --only functions"
echo ""
