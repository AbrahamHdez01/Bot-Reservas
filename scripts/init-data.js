import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), 'data', 'reservas.json');

// Crear directorio data si no existe
const dataDir = path.dirname(dataPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('Directorio data creado');
}

// Crear archivo reservas.json si no existe
if (!fs.existsSync(dataPath)) {
  fs.writeFileSync(dataPath, JSON.stringify([], null, 2));
  console.log('Archivo reservas.json creado');
} else {
  console.log('Archivo reservas.json ya existe');
}

// Asegurar que el directorio public existe
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('Directorio public creado');
}

console.log('Inicialización de datos completada'); 