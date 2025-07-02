import { supabase } from '../lib/supabase.js';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// 🗄️ Cache de Directions con TTL de 1 hora
const directionsCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hora en ms

// Convierte 'HH:MM' o 'HH:MMam/pm' a minutos desde 00:00
function horaToMinutes(hora) {
  if (!hora) return NaN;
  hora = hora.trim();

  // Formato 24h HH:MM o HH:MM:SS
  const match24 = hora.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    return h * 60 + m;
  }

  // Formato 12h con espacio o sin espacio antes de AM/PM, mayúsc/minúsc
  const match12 = hora.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const ampm = match12[3].toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }

  // Formato 12h sin minutos ej '10am'
  const match12simple = hora.match(/^(\d{1,2})\s*(am|pm)$/i);
  if(match12simple){
     let h=parseInt(match12simple[1],10);
     const ampm=match12simple[2].toUpperCase();
     if(ampm==='PM'&&h!==12) h+=12;
     if(ampm==='AM'&&h===12) h=0;
     return h*60;
  }

  console.warn('horaToMinutes: formato no reconocido', hora);
  return NaN;
}

// Convierte minutos desde las 00:00 a 'HH:MM'
function minutesToHora(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// 🚀 Llama a Google Directions API con cache de 1 hora
async function calcularDuracionMaps(origen, destino) {
  if (!GOOGLE_MAPS_API_KEY) {
    console.log('⚠️  No hay API key de Google Maps, usando fallback de 40 min');
    return 40;
  }

  // Limpiar nombres de estaciones
  const limpiarNombre = (estacion) => {
    return estacion
      .replace(', Ciudad de México, CDMX, México', '')
      .replace(', Naucalpan de Juárez, Méx., México', '')
      .replace(', Estado de México, México', '')
      .replace('/Tenochtitlan', '')
      .replace('/Lagunilla', '')
      .replace('/Arena Ciudad de México', '')
      .replace('/Derechos Humanos', '')
      .replace('/Plaza de la Transparencia', '')
      .replace('/Basílica', '')
      .replace('-Basílica', '')
      .trim();
  };

  const origenLimpio = limpiarNombre(origen);
  const destinoLimpio = limpiarNombre(destino);
  
  // Si es la misma estación, tiempo mínimo
  if (origenLimpio === destinoLimpio) {
    console.log('✅ Misma estación, tiempo: 5 minutos');
    return 5;
  }

  // 🗄️ Verificar cache primero
  const cacheKey = `${origenLimpio}->${destinoLimpio}`;
  const cacheEntry = directionsCache.get(cacheKey);
  
  if (cacheEntry && (Date.now() - cacheEntry.timestamp) < CACHE_TTL) {
    console.log(`🗄️  Cache hit para ${cacheKey}: ${cacheEntry.duration} min`);
    return cacheEntry.duration;
  }
  
  console.log('🗺️  Calculando ruta Metro CDMX:');
  console.log('   Origen:', origenLimpio);
  console.log('   Destino:', destinoLimpio);
  
  // Intentar múltiples formatos para obtener el tiempo más preciso
  const intentos = [
    {
      origen: `Estación ${origenLimpio}, Metro Ciudad de México`,
      destino: `Estación ${destinoLimpio}, Metro Ciudad de México`,
      descripcion: 'Formato específico Metro CDMX'
    },
    {
      origen: `Metro ${origenLimpio}, CDMX`,
      destino: `Metro ${destinoLimpio}, CDMX`,
      descripcion: 'Formato Metro + nombre'
    },
    {
      origen: `${origenLimpio}, Ciudad de México`,
      destino: `${destinoLimpio}, Ciudad de México`,
      descripcion: 'Nombres simples + CDMX'
    }
  ];
  
  for (let i = 0; i < intentos.length; i++) {
    const intento = intentos[i];
    console.log(`📡 Intento ${i + 1}: ${intento.descripcion}`);
    
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(intento.origen)}&destination=${encodeURIComponent(intento.destino)}&mode=transit&transit_mode=subway&departure_time=now&region=mx&language=es&key=${GOOGLE_MAPS_API_KEY}`;
      
      const resp = await fetch(url);
      const data = await resp.json();
      
      console.log(`   Status: ${data.status}`);
      
      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        if (route.legs && route.legs.length > 0 && route.legs[0].duration) {
          const duracionSegundos = route.legs[0].duration.value;
          const duracionMinutos = Math.ceil(duracionSegundos / 60);
          
          // Para Metro CDMX, aplicar límites realistas
          const duracionFinal = Math.max(Math.min(duracionMinutos, 90), 8); // Entre 8 y 90 min
          
          // 🗄️ Guardar en cache
          directionsCache.set(cacheKey, {
            duration: duracionFinal,
            timestamp: Date.now()
          });
          
          console.log(`✅ ¡ÉXITO! Duración obtenida: ${duracionMinutos} min (ajustada: ${duracionFinal} min)`);
          console.log(`   Ruta encontrada con: ${intento.descripcion}`);
          console.log(`🗄️  Guardado en cache: ${cacheKey}`);
          return duracionFinal;
        }
      }
      
      if (data.error_message) {
        console.log(`   Error: ${data.error_message}`);
      }
      
    } catch (error) {
      console.log(`   Error en intento ${i + 1}:`, error.message);
    }
  }
  
  // Si todos los intentos fallan, usar tiempo estimado conservador
  const fallback = 35;
  console.log(`⚠️  Todos los intentos fallaron, usando estimado conservador de ${fallback} min`);
  
  // 🗄️ Guardar fallback en cache también
  directionsCache.set(cacheKey, {
    duration: fallback,
    timestamp: Date.now()
  });
  
  return fallback;
}

// 🕐 Solo permite horas en bloques de 15 min (:00, :15, :30, :45)
function esHoraValida(hora) {
  const [_, m] = hora.split(':').map(Number);
  return m === 0 || m === 15 || m === 30 || m === 45;
}

// Estaciones con horario temprano (8:30 AM)
const EARLY_STATIONS = new Set([
  "Constitución de 1917, Ciudad de México, CDMX, México",
  "UAM-I, Ciudad de México, CDMX, México",
  "Cerro de la Estrella, Ciudad de México, CDMX, México",
  "Iztapalapa, Ciudad de México, CDMX, México",
  "Atlalilco, Ciudad de México, CDMX, México",
  "Escuadrón 201, Ciudad de México, CDMX, México",
  "Aculco, Ciudad de México, CDMX, México",
  "Apatlaco, Ciudad de México, CDMX, México",
  "Iztacalco, Ciudad de México, CDMX, México",
  "Coyuya, Ciudad de México, CDMX, México",
  "Santa Anita, Ciudad de México, CDMX, México",
  "Periférico Oriente, Ciudad de México, CDMX, México",
  "Calle 11, Ciudad de México, CDMX, México",
  "Lomas Estrella, Ciudad de México, CDMX, México",
  "San Andrés Tomatlán, Ciudad de México, CDMX, México",
  "Culhuacán, Ciudad de México, CDMX, México",
  "Mixcoac, Ciudad de México, CDMX, México",
  "San Antonio, Ciudad de México, CDMX, México",
  "San Pedro de los Pinos, Ciudad de México, CDMX, México",
  "Tacubaya, Ciudad de México, CDMX, México",
  "Constituyentes, Ciudad de México, CDMX, México",
  "Auditorio, Ciudad de México, CDMX, México",
  "Polanco, Ciudad de México, CDMX, México"
]);

const EARLY_START_MINUTES = horaToMinutes('08:30');

// Estaciones excluidas
const EXCLUDED_KEYWORDS = [
  // Línea B
  'deportivo oceanía','romero rubio','ricardo flores magón','bosque de aragón','victoria','nezahualcóyotl','impulsora','rio de los remedios','muñoz','azteca','ciudad azteca','oceanía',
  // Línea 12
  'tezonco','olivos','nopalera','zapotitlán','tlaltenco','tláhuac',
  // Línea A
  'peñón viejo','acatitla','santa marta','los reyes','la paz'
];

function incluyeKeywordExcluido(nombreNorm){
  return EXCLUDED_KEYWORDS.some(k=>nombreNorm.includes(k));
}

function normalizeName(n){return n.toLowerCase().replace(/[\s\u2019']/g,' ').replace(/\s+/g,' ').trim();}
const isEarlyStation = (n)=>EARLY_STATIONS.has([...EARLY_STATIONS].find(s=>normalizeName(s)===normalizeName(n))||'');

// 🔍 Función principal de validación
export async function checkDisponibilidad({ fecha, horaDeseada, estacionDeseada }) {
  console.log('🔍 Validando reserva:', { fecha, horaDeseada, estacionDeseada });
  
  if (!fecha || !horaDeseada || !estacionDeseada) {
    return { error: 'Faltan datos' };
  }

  // 1️⃣ Validar intervalos de 15 minutos (bloques)
  if (!esHoraValida(horaDeseada)) {
    console.log('❌ Hora no válida (no es :00, :15, :30 o :45):', horaDeseada);
    return {
      error: 'Solo puedes reservar en intervalos de 15 minutos (ej: 9:00, 9:15, 9:30, 9:45).',
    };
  }

  // Cargar estaciones
  let estaciones = [];
  try {
    const estacionesRaw = await fs.readFile(
      path.join(process.cwd(), 'public/metro_stations.json'),
      'utf-8'
    );
    estaciones = JSON.parse(estacionesRaw);
  } catch (e) {
    return { error: 'No se pudieron cargar las estaciones' };
  }

  // Obtener todas las reservas del día ordenadas por hora
  const { data: reservas, error } = await supabase
    .from('reservas')
    .select('*')
    .eq('fecha', fecha)
    .in('estado', ['pendiente', 'confirmado'])
    .order('hora', { ascending: true });
    
  if (error) {
    console.error('❌ Error consultando reservas:', error);
    return { error: 'Error consultando reservas' };
  }

  console.log('📋 Reservas existentes para', fecha, ':', reservas.length, 'reservas');
  reservas.forEach(r => console.log('  -', r.hora, r.estacion, r.estado));

  const minutosDeseados = horaToMinutes(horaDeseada);
  console.log('⏰ Minutos deseados:', minutosDeseados, '(', horaDeseada, ')');

  // 2️⃣ Validar estaciones excluidas
  const estacionNormalizada = normalizeName(estacionDeseada);
  if (incluyeKeywordExcluido(estacionNormalizada)) {
    return {
      disponible: false,
      error: 'En esta estación no se realizan entregas.'
    };
  }

  // 3️⃣ Validar horarios tempranos por estación
  if (minutosDeseados < EARLY_START_MINUTES && isEarlyStation(estacionDeseada)) {
    return {
      disponible: false,
      error: 'Para esta estación las entregas inician a partir de las 08:30.'
    };
  }

  if (minutosDeseados < horaToMinutes('10:00') && !isEarlyStation(estacionDeseada)) {
    return {
      disponible: false,
      error: 'Las entregas en esta estación inician a partir de las 10:00.'
    };
  }

  // 🚨 BLOQUEO ESTRICTO: No permitir ninguna reserva en la misma hora (sin importar estación)
  for (const r of reservas) {
    if (horaToMinutes(r.hora) === minutosDeseados) {
      return res.status(400).json({
        error: '¡Ups! El repartidor no puede completar esta entrega. Selecciona otro horario.'
      });
    }
  }

  // 1️⃣ Lista de reservas efectivas (todas, ya que no puede haber duplicados)
  const efectivas = reservas;

  const tNueva = minutosDeseados;
  const efectivasConMinutos = efectivas.map(r => ({ ...r, min: horaToMinutes(r.hora) }));
  const idx = efectivasConMinutos.findIndex(r => r.min > tNueva);
  const prev = idx > 0 ? efectivasConMinutos[idx - 1] : null;
  const next = idx >= 0 ? efectivasConMinutos[idx] : null;

  // 2️⃣ Validar márgenes prev/next
  async function gapOK(prev, next) {
    // Validar margen desde ANTERIOR
    if (prev) {
      const durPrev = await calcularDuracionMaps(prev.estacion, estacionDeseada);
      const needPrev = 15 + durPrev;
      const gapPrev = tNueva - prev.min;
      if (gapPrev < needPrev) return false;
    }
    // Validar margen hacia SIGUIENTE  
    if (next) {
      const durNext = await calcularDuracionMaps(estacionDeseada, next.estacion);
      const needNext = 15 + durNext;
      const gapNext = next.min - tNueva;
      if (gapNext < needNext) return false;
    }
    return true;
  }

  const gapsValidos = await gapOK(prev, next);
  if (!gapsValidos) {
    return {
      disponible: false,
      error: '¡Ups! El repartidor no puede completar esta entrega. Selecciona otro horario.'
    };
  }

  return { disponible: true };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { fecha, horaDeseada, estacionDeseada } = req.body;
  const result = await checkDisponibilidad({ fecha, horaDeseada, estacionDeseada });

  if (result.error) {
    return res.status(400).json(result);
  }

  return res.status(200).json(result);
}

export { horaToMinutes }; 