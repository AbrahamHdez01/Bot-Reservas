import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), 'data', 'reservas.json');
const backupDir = path.join(process.cwd(), 'data', 'backups');

// Crear directorio de respaldos si no existe
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Crear nombre del archivo de respaldo con timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `reservas-backup-${timestamp}.json`);

try {
  // Leer reservas actuales
  if (fs.existsSync(dataPath)) {
    const reservas = fs.readFileSync(dataPath, 'utf8');
    
    // Crear respaldo
    fs.writeFileSync(backupPath, reservas);
    
    console.log(`✅ Respaldo creado exitosamente: ${backupPath}`);
    
    // Mostrar estadísticas
    const reservasData = JSON.parse(reservas);
    console.log(`📊 Total de reservas respaldadas: ${reservasData.length}`);
    
    // Limpiar respaldos antiguos (mantener solo los últimos 10)
    const backups = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('reservas-backup-'))
      .sort()
      .reverse();
    
    if (backups.length > 10) {
      const toDelete = backups.slice(10);
      toDelete.forEach(file => {
        fs.unlinkSync(path.join(backupDir, file));
        console.log(`🗑️ Eliminado respaldo antiguo: ${file}`);
      });
    }
    
  } else {
    console.log('⚠️ No se encontró el archivo de reservas para respaldar');
  }
} catch (error) {
  console.error('❌ Error creando respaldo:', error);
} 