// Metro CDMX - Calculador de distancias basado en coordenadas geográficas
import fs from 'fs';
import path from 'path';

let metroData = null;
let estacionesMap = null;

// Función para calcular distancia entre dos puntos usando fórmula de Haversine
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distancia en km
}

// Normalizar nombres de estaciones
function normalizeStationName(name) {
  return name
    .toLowerCase()
    .replace(/,.*$/, '') // Remover ", Ciudad de México, CDMX, México"
    .replace(/\/.*$/, '') // Remover aliases como "/tenochtitlan"
    .replace(/\s+/g, ' ')
    .trim()
    // Normalizar acentos y caracteres especiales
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9\s]/g, '');
}

// Cargar datos del GeoJSON
function loadMetroData() {
  if (metroData) return metroData;
  
  try {
    const geoJsonPath = path.join(process.cwd(), 'data', 'metro_geo.json');
    
    // Verificar si existe el archivo completo, si no usar datos básicos
    if (!fs.existsSync(geoJsonPath)) {
      console.log('DEBUG: GeoJSON no encontrado, usando datos básicos');
      return createBasicMetroData();
    }
    
    const rawData = fs.readFileSync(geoJsonPath, 'utf8');
    metroData = JSON.parse(rawData);
    
    // Crear mapa de estaciones normalizadas
    estacionesMap = new Map();
    
    for (const feature of metroData.features) {
      const normalizedName = normalizeStationName(feature.properties.name);
      estacionesMap.set(normalizedName, {
        name: feature.properties.name,
        coordinates: feature.geometry.coordinates,
        lines: feature.properties.routes
      });
    }
    
    console.log(`DEBUG: Cargadas ${estacionesMap.size} estaciones del GeoJSON`);
    return metroData;
    
  } catch (error) {
    console.error('Error cargando GeoJSON:', error);
    return createBasicMetroData();
  }
}

// Datos básicos de estaciones principales si no hay GeoJSON
function createBasicMetroData() {
  const basicStations = {
    'nativitas': { coordinates: [-99.140303, 19.379292], lines: ['Línea 2'] },
    'portales': { coordinates: [-99.141719, 19.369677], lines: ['Línea 2'] },
    'sevilla': { coordinates: [-99.171052, 19.422118], lines: ['Línea 1'] },
    'chapultepec': { coordinates: [-99.177425, 19.421046], lines: ['Línea 1'] },
    'tacubaya': { coordinates: [-99.186459, 19.401961], lines: ['Línea 1', 'Línea 7'] },
    'mixcoac': { coordinates: [-99.187317, 19.376053], lines: ['Línea 7'] },
    'insurgentes': { coordinates: [-99.16322, 19.423676], lines: ['Línea 1'] },
    'balderas': { coordinates: [-99.148951, 19.427036], lines: ['Línea 1', 'Línea 3'] }
  };
  
  estacionesMap = new Map();
  for (const [name, data] of Object.entries(basicStations)) {
    estacionesMap.set(name, data);
  }
  
  console.log('DEBUG: Usando datos básicos de estaciones');
  return { features: [] };
}

// Calcular tiempo de viaje basado en distancia geográfica
function calculateTravelTime(distanceKm) {
  // Velocidad promedio del metro: ~30 km/h
  // Tiempo base por estación: 1 minuto (parada + aceleración)
  // Tiempo adicional por distancia: distancia_km * 2 minutos/km
  
  if (distanceKm < 0.5) {
    return 5; // Estaciones muy cercanas o misma estación
  }
  
  // Fórmula: tiempo_base + (distancia * factor_velocidad)
  // Factor velocidad: 2 min/km (equivale a 30 km/h promedio)
  const timeMinutes = Math.round(1 + (distanceKm * 2));
  
  // Aplicar límites: mínimo 5 min, máximo 90 min
  return Math.max(5, Math.min(timeMinutes, 90));
}

// Función principal para calcular tiempo entre estaciones
export function tiempoGrafo(origen, destino) {
  try {
    // Cargar datos si no están cargados
    if (!metroData) {
      loadMetroData();
    }
    
    const origenNorm = normalizeStationName(origen);
    const destinoNorm = normalizeStationName(destino);
    
    // Buscar estaciones en el mapa
    const stationOrigen = estacionesMap.get(origenNorm);
    const stationDestino = estacionesMap.get(destinoNorm);
    
    if (!stationOrigen || !stationDestino) {
      console.log(`DEBUG: Estación no encontrada - Origen: ${origenNorm} (${!!stationOrigen}), Destino: ${destinoNorm} (${!!stationDestino})`);
      return null;
    }
    
    // Misma estación
    if (origenNorm === destinoNorm) {
      return 5;
    }
    
    // Calcular distancia geográfica
    const [lon1, lat1] = stationOrigen.coordinates;
    const [lon2, lat2] = stationDestino.coordinates;
    
    const distanceKm = haversineDistance(lat1, lon1, lat2, lon2);
    const travelTime = calculateTravelTime(distanceKm);
    
    console.log(`DEBUG Metro Geo: ${origen} -> ${destino} = ${travelTime} min (${distanceKm.toFixed(2)} km)`);
    return travelTime;
    
  } catch (error) {
    console.error('Error en tiempoGrafo:', error);
    return null;
  }
}

// Función auxiliar para obtener información de una estación
export function getStationInfo(nombre) {
  if (!metroData) {
    loadMetroData();
  }
  
  const normalizado = normalizeStationName(nombre);
  return estacionesMap.get(normalizado) || null;
}

// Función para obtener todas las estaciones disponibles
export function getAllStations() {
  if (!metroData) {
    loadMetroData();
  }
  
  return Array.from(estacionesMap.keys());
}

// Función para encontrar estaciones cercanas (dentro de cierto radio)
export function findNearbyStations(nombre, radiusKm = 2) {
  if (!metroData) {
    loadMetroData();
  }
  
  const station = getStationInfo(nombre);
  if (!station) return [];
  
  const [lon1, lat1] = station.coordinates;
  const nearby = [];
  
  for (const [name, data] of estacionesMap) {
    if (name === normalizeStationName(nombre)) continue;
    
    const [lon2, lat2] = data.coordinates;
    const distance = haversineDistance(lat1, lon1, lat2, lon2);
    
    if (distance <= radiusKm) {
      nearby.push({
        name: data.name,
        distance: Math.round(distance * 1000) // en metros
      });
    }
  }
  
  return nearby.sort((a, b) => a.distance - b.distance);
} 