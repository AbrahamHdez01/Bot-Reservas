// Mapa topológico del Metro CDMX para cálculos precisos de distancia
// Basado en la estructura real de líneas y conexiones

const METRO_LINES = {
  'linea1': {
    stations: [
      'observatorio', 'tacubaya', 'juanacatlán', 'chapultepec', 'sevilla', 
      'insurgentes', 'cuauhtémoc', 'balderas', 'salto del agua', 'isabel la católica', 
      'pino suárez', 'merced', 'candelaria', 'san lázaro', 'moctezuma', 
      'balbuena', 'boulevard puerto aéreo', 'gómez farías', 'zaragoza', 'pantitlán'
    ],
    color: 'rosa'
  },
  'linea2': {
    stations: [
      'cuatro caminos', 'panteones', 'tacuba', 'cuitláhuac', 'popotla', 
      'colegio militar', 'normal', 'san cosme', 'revolución', 'hidalgo', 
      'bellas artes', 'allende', 'zócalo', 'pino suárez', 'san antonio abad', 
      'chabacano', 'viaducto', 'xola', 'villa de cortés', 'nativitas', 
      'portales', 'ermita', 'general anaya', 'tasqueña'
    ],
    color: 'azul'
  },
  'linea3': {
    stations: [
      'indios verdes', 'deportivo 18 de marzo', 'potrero', 'la raza', 'tlatelolco', 
      'guerrero', 'hidalgo', 'juárez', 'balderas', 'niños héroes', 
      'hospital general', 'centro médico', 'etiopía', 'eugenia', 'división del norte', 
      'zapata', 'coyoacán', 'viveros', 'miguel ángel de quevedo', 'copilco', 'universidad'
    ],
    color: 'verde'
  }
};

// Estaciones de transferencia (conexiones entre líneas)
const TRANSFER_STATIONS = {
  'pantitlán': ['linea1', 'linea5', 'linea9', 'lineaA'],
  'tacubaya': ['linea1', 'linea7', 'linea9'],
  'balderas': ['linea1', 'linea3'],
  'pino suárez': ['linea1', 'linea2'],
  'candelaria': ['linea1', 'linea4'],
  'hidalgo': ['linea2', 'linea3'],
  'bellas artes': ['linea2', 'linea8'],
  'salto del agua': ['linea1', 'linea8'],
  'chabacano': ['linea2', 'linea8', 'linea9']
};

function normalizeStationName(name) {
  return name
    .toLowerCase()
    .replace(/,.*$/, '') // Remover ", Ciudad de México, CDMX, México"
    .replace(/\/.*$/, '') // Remover aliases como "/tenochtitlan"
    .replace(/\s+/g, ' ')
    .trim();
}

function findStationInLines(stationName) {
  const normalized = normalizeStationName(stationName);
  
  for (const [lineId, lineData] of Object.entries(METRO_LINES)) {
    const index = lineData.stations.findIndex(station => 
      normalizeStationName(station) === normalized ||
      normalized.includes(normalizeStationName(station)) ||
      normalizeStationName(station).includes(normalized)
    );
    
    if (index !== -1) {
      return { lineId, index, stationName: lineData.stations[index] };
    }
  }
  
  return null;
}

function calculateStationDistance(origin, destination) {
  const originInfo = findStationInLines(origin);
  const destInfo = findStationInLines(destination);
  
  if (!originInfo || !destInfo) {
    return null;
  }
  
  // Misma estación
  if (originInfo.lineId === destInfo.lineId && originInfo.index === destInfo.index) {
    return { stations: 0, transfers: 0, estimatedMinutes: 3 };
  }
  
  // Misma línea
  if (originInfo.lineId === destInfo.lineId) {
    const stationDiff = Math.abs(originInfo.index - destInfo.index);
    return { 
      stations: stationDiff, 
      transfers: 0, 
      estimatedMinutes: Math.max(3 + (stationDiff - 1) * 2, 3) // 3 min base + 2 min por estación
    };
  }
  
  // Para diferentes líneas, usar estimación simple por ahora
  return { stations: 5, transfers: 1, estimatedMinutes: 12 };
}

export function calcularDistanciaMetro(origen, destino) {
  // Limpiar nombres de estaciones
  const limpiar = (s) =>
    s.replace(/, (Ciudad|Estado) de.*$/, '')
      .replace(/\\.*$/, '')
      .trim();

  const o = limpiar(origen);
  const d = limpiar(destino);
  
  if (normalizeStationName(o) === normalizeStationName(d)) {
    return 3; // Misma estación
  }
  
  const result = calculateStationDistance(o, d);
  
  if (result) {
    console.log(`DEBUG Metro: ${o} -> ${d} = ${result.stations} estaciones, ${result.transfers} transferencias, ${result.estimatedMinutes} min`);
    return Math.min(result.estimatedMinutes, 45); // Máximo 45 minutos
  }
  
  // Fallback si no se encuentra
  console.log(`DEBUG Metro: No se encontró ruta para ${o} -> ${d}, usando fallback`);
  return 15;
} 