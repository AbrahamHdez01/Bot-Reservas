#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';
import fs from 'fs';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚇 Configuración de Supabase para Reservas Metro CDMX\n');

console.log('📋 Pasos para configurar Supabase:');
console.log('1. Ve a https://supabase.com');
console.log('2. Crea un nuevo proyecto');
console.log('3. Ve a Settings > API');
console.log('4. Copia la URL y la anon key\n');

async function setupSupabase() {
  try {
    // Solicitar credenciales
    const supabaseUrl = await question('Ingresa tu Supabase URL: ');
    const supabaseKey = await question('Ingresa tu Supabase Anon Key: ');

    // Crear cliente de Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('\n🔍 Verificando conexión con Supabase...');

    // Probar conexión
    const { data, error } = await supabase.from('reservas').select('count').limit(1);
    
    if (error && error.code === 'PGRST116') {
      console.log('❌ La tabla "reservas" no existe. Creándola...');
      
      // Leer el script SQL
      const sqlScript = fs.readFileSync('./scripts/create-tables.sql', 'utf8');
      
      console.log('📝 Ejecutando script SQL...');
      console.log('⚠️  Debes ejecutar manualmente el script SQL en el SQL Editor de Supabase:');
      console.log('\n' + sqlScript);
      
      console.log('\n📋 Instrucciones:');
      console.log('1. Ve a tu proyecto en Supabase');
      console.log('2. Ve a SQL Editor');
      console.log('3. Copia y pega el script SQL de arriba');
      console.log('4. Ejecuta el script');
      
    } else if (error) {
      console.error('❌ Error de conexión:', error);
      return;
    } else {
      console.log('✅ Conexión exitosa con Supabase');
    }

    // Crear archivo .env
    const envContent = `# Google Calendar API Configuration
GOOGLE_CLIENT_ID=${process.env.GOOGLE_CLIENT_ID || 'your_google_client_id_here'}
GOOGLE_CLIENT_SECRET=${process.env.GOOGLE_CLIENT_SECRET || 'your_google_client_secret_here'}
GOOGLE_REFRESH_TOKEN=${process.env.GOOGLE_REFRESH_TOKEN || 'your_google_refresh_token_here'}
GOOGLE_REDIRECT_URI=${process.env.GOOGLE_REDIRECT_URI || 'https://your-domain.vercel.app/api/auth/callback'}

# Supabase Configuration
SUPABASE_URL=${supabaseUrl}
SUPABASE_ANON_KEY=${supabaseKey}
`;

    fs.writeFileSync('.env', envContent);
    console.log('\n📁 Archivo .env creado con las credenciales');

    // Configurar en Vercel
    console.log('\n🚀 Para configurar en Vercel, ejecuta estos comandos:');
    console.log(`vercel env add SUPABASE_URL ${supabaseUrl}`);
    console.log(`vercel env add SUPABASE_ANON_KEY ${supabaseKey}`);

    console.log('\n✅ Configuración completada!');

  } catch (error) {
    console.error('❌ Error durante la configuración:', error.message);
  } finally {
    rl.close();
  }
}

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

setupSupabase(); 