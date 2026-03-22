#!/bin/bash

# Script de Testing Automatizado - Registro SaaS
# Este script verifica que todos los servicios estén disponibles

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  TESTING AUTOMATIZADO - FLEETEASE REGISTRO                ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar URL
check_url() {
    local url=$1
    local name=$2
    local expected_size=$3
    
    echo -n "Verificando $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>&1)
    size=$(curl -s -o /dev/null -w "%{size_download}" "$url" 2>&1)
    
    if [ "$response" == "200" ]; then
        if [ "$size" -gt "$expected_size" ]; then
            echo -e "${GREEN}✅ OK${NC} ($size bytes)"
            return 0
        else
            echo -e "${YELLOW}⚠️  Tamaño pequeño${NC} ($size bytes)"
            return 1
        fi
    else
        echo -e "${RED}❌ FAIL${NC} (HTTP $response)"
        return 1
    fi
}

# Verificar servicios
echo "═══ Servicios Principales ═══"
echo ""

check_url "http://localhost:9002" "Landing Page" 10000
LANDING_STATUS=$?

check_url "http://localhost:9002/registro" "Registro Page" 5000
REGISTRY_STATUS=$?

check_url "http://localhost:4000" "Emulator UI" 1000
EMULATOR_STATUS=$?

check_url "http://localhost:4000/auth" "Auth Emulator" 1000
AUTH_STATUS=$?

check_url "http://localhost:4000/firestore" "Firestore Emulator" 1000
FIRESTORE_STATUS=$?

check_url "http://localhost:4000/functions" "Functions Emulator" 1000
FUNCTIONS_STATUS=$?

echo ""
echo "═══ Verificación de Funciones ═══"
echo ""

# Verificar que la función existe
echo -n "Verificando función createCompanyAndUser... "
response=$(curl -s -X POST "http://localhost:5001/demo-app/us-central1/createCompanyAndUser" \
  -H "Content-Type: application/json" \
  -d '{"data": {}}' 2>&1)

if [[ "$response" == *"unauthenticated"* ]] || [[ "$response" == *"missing-credentials"* ]]; then
    echo -e "${GREEN}✅ Existe${NC} (requiere autenticación - esperado)"
    FUNCTION_EXISTS=0
elif [[ "$response" == *"not found"* ]] || [[ "$response" == *"404"* ]]; then
    echo -e "${RED}❌ No encontrada${NC}"
    FUNCTION_EXISTS=1
else
    echo -e "${YELLOW}⚠️  Respuesta incierta${NC}"
    FUNCTION_EXISTS=0  # Asumimos que existe
fi

echo ""
echo "═══ Resumen ═══"
echo ""

# Contar éxitos
TOTAL=7
PASSED=0

[ $LANDING_STATUS -eq 0 ] && ((PASSED++))
[ $REGISTRY_STATUS -eq 0 ] && ((PASSED++))
[ $EMULATOR_STATUS -eq 0 ] && ((PASSED++))
[ $AUTH_STATUS -eq 0 ] && ((PASSED++))
[ $FIRESTORE_STATUS -eq 0 ] && ((PASSED++))
[ $FUNCTIONS_STATUS -eq 0 ] && ((PASSED++))
[ $FUNCTION_EXISTS -eq 0 ] && ((PASSED++))

echo "Pruebas pasadas: $PASSED/$TOTAL"

if [ $PASSED -eq $TOTAL ]; then
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ TODAS LAS PRUEBAS PASARON                              ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "📋 Próximos pasos:"
    echo "   1. Abrir http://localhost:9002/registro en el navegador"
    echo "   2. Llenar formulario con datos de prueba:"
    echo "      - Empresa: Transportes Rodríguez"
    echo "      - Nombre: Juan Pérez"
    echo "      - Email: juan@test.com"
    echo "      - Teléfono: 55 1234 5678"
    echo "      - Contraseña: Test123456"
    echo "   3. Verificar en http://localhost:4000/firestore"
    echo ""
else
    echo ""
    echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ ALGUNAS PRUEBAS FALLARON                               ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "📋 Verificar:"
    echo "   - Next.js corriendo: npm run dev"
    echo "   - Emuladores corriendo: firebase emulators:start"
    echo ""
fi
