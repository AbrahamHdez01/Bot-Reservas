#!/usr/bin/env node

import { google } from 'googleapis';
import fs from 'fs';

async function refreshGoogleToken() {
  console.log('🔄 Iniciando renovación automática de token de Google Calendar...');
  
  try {
    // Verificar que las variables de entorno estén configuradas
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REFRESH_TOKEN) {
      console.error('❌ Variables de entorno no configuradas');
      console.log('Asegúrate de tener configuradas:');
      console.log('- GOOGLE_CLIENT_ID');
      console.log('- GOOGLE_CLIENT_SECRET');
      console.log('- GOOGLE_REFRESH_TOKEN');
      return false;
    }

    // Configurar OAuth2
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000'
    );

    // Configurar refresh token
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    console.log('🔑 Obteniendo nuevo access token...');
    
    // Forzar la renovación del token
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    console.log('✅ Nuevo token obtenido exitosamente');
    console.log('🕐 Expira en:', new Date(credentials.expiry_date));
    
    // Si se obtuvo un nuevo refresh token, actualizarlo
    if (credentials.refresh_token && credentials.refresh_token !== process.env.GOOGLE_REFRESH_TOKEN) {
      console.log('🔄 Nuevo refresh token obtenido, actualizando...');
      
      // Leer archivo .env actual
      let envContent = '';
      if (fs.existsSync('.env')) {
        envContent = fs.readFileSync('.env', 'utf8');
      }
      
      // Actualizar o agregar el nuevo refresh token
      if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
        envContent = envContent.replace(
          /GOOGLE_REFRESH_TOKEN=.*/,
          `GOOGLE_REFRESH_TOKEN=${credentials.refresh_token}`
        );
      } else {
        envContent += `\nGOOGLE_REFRESH_TOKEN=${credentials.refresh_token}`;
      }
      
      fs.writeFileSync('.env', envContent);
      console.log('📁 Archivo .env actualizado con nuevo refresh token');
      
      console.log('\n🚀 Actualiza también en Vercel:');
      console.log(`vercel env rm GOOGLE_REFRESH_TOKEN`);
      console.log(`vercel env add GOOGLE_REFRESH_TOKEN ${credentials.refresh_token}`);
    }
    
    // Probar que funcione creando un calendario
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    await calendar.calendarList.list({ maxResults: 1 });
    
    console.log('✅ Token validado exitosamente');
    return true;
    
  } catch (error) {
    console.error('❌ Error renovando token:', error.message);
    
    if (error.message.includes('invalid_grant')) {
      console.log('\n🔧 El refresh token ha expirado completamente.');
      console.log('Necesitas ejecutar el setup inicial nuevamente:');
      console.log('node scripts/setup-google-calendar.js');
    }
    
    return false;
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  refreshGoogleToken()
    .then(success => {
      if (success) {
        console.log('\n🎉 Renovación completada exitosamente');
        process.exit(0);
      } else {
        console.log('\n❌ Error en la renovación');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

export { refreshGoogleToken }; 