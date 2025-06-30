#!/usr/bin/env node

import { execSync } from 'child_process';

console.log('🔍 Verificando variables de entorno en Vercel...\n');

try {
  // Verificar si vercel está instalado
  execSync('vercel --version', { stdio: 'pipe' });
  console.log('✅ Vercel CLI está instalado');

  // Listar variables de entorno
  console.log('\n📋 Variables de entorno configuradas:');
  try {
    const envOutput = execSync('vercel env ls', { encoding: 'utf8' });
    console.log(envOutput);
  } catch (error) {
    console.log('❌ Error obteniendo variables de entorno:', error.message);
  }

  // Verificar variables específicas de Google Calendar
  console.log('\n🔐 Verificando variables de Google Calendar:');
  
  const requiredVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET', 
    'GOOGLE_REFRESH_TOKEN'
  ];

  for (const varName of requiredVars) {
    try {
      const value = execSync(`vercel env pull ${varName}`, { encoding: 'utf8' });
      if (value.trim()) {
        console.log(`✅ ${varName}: Configurada`);
      } else {
        console.log(`❌ ${varName}: Vacía`);
      }
    } catch (error) {
      console.log(`❌ ${varName}: No configurada`);
    }
  }

  console.log('\n🚀 Para probar la conexión con Google Calendar:');
  console.log('1. Ve a tu sitio desplegado en Vercel');
  console.log('2. Navega a: /api/test-calendar');
  console.log('3. Deberías ver un JSON con el estado de la conexión');

  console.log('\n📝 Si hay errores, ejecuta estos comandos para configurar:');
  console.log('vercel env add GOOGLE_CLIENT_ID');
  console.log('vercel env add GOOGLE_CLIENT_SECRET');
  console.log('vercel env add GOOGLE_REFRESH_TOKEN');

} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n💡 Instala Vercel CLI con: npm i -g vercel');
} 