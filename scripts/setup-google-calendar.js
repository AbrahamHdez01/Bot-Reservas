#!/usr/bin/env node

import { google } from 'googleapis';
import readline from 'readline';
import fs from 'fs';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚇 Configuración de Google Calendar para Reservas Metro CDMX\n');

console.log('📋 Pasos para obtener las credenciales:');
console.log('1. Ve a https://console.cloud.google.com/');
console.log('2. Crea un nuevo proyecto o selecciona uno existente');
console.log('3. Habilita la Google Calendar API');
console.log('4. Crea credenciales OAuth 2.0');
console.log('5. Configura las URLs autorizadas');
console.log('6. Obtén el refresh token\n');

async function setupGoogleCalendar() {
  try {
    // Solicitar credenciales
    const clientId = await question('Ingresa tu Google Client ID: ');
    const clientSecret = await question('Ingresa tu Google Client Secret: ');
    const redirectUri = await question('Ingresa tu Redirect URI (o presiona Enter para usar http://localhost:3000): ') || 'http://localhost:3000';

    // Crear cliente OAuth2
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Generar URL de autorización
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar'],
      prompt: 'consent'
    });

    console.log('\n🔗 Abre esta URL en tu navegador para autorizar la aplicación:');
    console.log(authUrl);
    console.log('\n📝 Después de autorizar, copia el código de autorización de la URL');

    const authCode = await question('\nIngresa el código de autorización: ');

    // Intercambiar código por tokens
    const { tokens } = await oauth2Client.getToken(authCode);
    
    console.log('\n✅ Tokens obtenidos exitosamente!');
    console.log('Refresh Token:', tokens.refresh_token);

    // Crear archivo .env
    const envContent = `# Google Calendar API Configuration
GOOGLE_CLIENT_ID=${clientId}
GOOGLE_CLIENT_SECRET=${clientSecret}
GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}
GOOGLE_REDIRECT_URI=${redirectUri}
`;

    fs.writeFileSync('.env', envContent);
    console.log('\n📁 Archivo .env creado con las credenciales');

    // Configurar en Vercel
    console.log('\n🚀 Para configurar en Vercel, ejecuta estos comandos:');
    console.log(`vercel env add GOOGLE_CLIENT_ID ${clientId}`);
    console.log(`vercel env add GOOGLE_CLIENT_SECRET ${clientSecret}`);
    console.log(`vercel env add GOOGLE_REFRESH_TOKEN ${tokens.refresh_token}`);
    console.log(`vercel env add GOOGLE_REDIRECT_URI ${redirectUri}`);

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

setupGoogleCalendar(); 