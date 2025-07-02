import { supabase } from '../lib/supabase.js';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Convierte 'HH:MM' a minutos desde las 00:00
function horaToMinutes(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

// Convierte minutos desde las 00:00 a 'HH:MM'
function minutesToHora(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Llama a Google Directions API y devuelve duración en minutos
async function calcularDuracionMaps(origen, destino) {
  if (!GOOGLE_MAPS_API_KEY) {
    console.log('⚠️  No hay API key de Google Maps, usando fallback de 40 min');
    return 40;
  }

  // Limpiar nombres de estaciones para que sean más simples
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
  
  console.log('🗺️  Calculando ruta Metro CDMX:');
  console.log('   Origen:', origenLimpio);
  console.log('   Destino:', destinoLimpio);
  
  // Si es la misma estación, tiempo mínimo
  if (origenLimpio === destinoLimpio) {
    console.log('✅ Misma estación, tiempo: 5 minutos');
    return 5;
  }
  
  // Intentar múltiples formatos para obtener el tiempo más preciso
  const intentos = [
    // Formato 1: Estación específica de Metro CDMX
    {
      origen: `Estación ${origenLimpio}, Metro Ciudad de México`,
      destino: `Estación ${destinoLimpio}, Metro Ciudad de México`,
      descripcion: 'Formato específico Metro CDMX'
    },
    // Formato 2: Con "Metro" al inicio
    {
      origen: `Metro ${origenLimpio}, CDMX`,
      destino: `Metro ${destinoLimpio}, CDMX`,
      descripcion: 'Formato Metro + nombre'
    },
    // Formato 3: Nombres simples con Ciudad de México
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
          
          console.log(`✅ ¡ÉXITO! Duración obtenida: ${duracionMinutos} min (ajustada: ${duracionFinal} min)`);
          console.log(`   Ruta encontrada con: ${intento.descripcion}`);
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
  console.log('⚠️  Todos los intentos fallaron, usando estimado conservador de 35 min');
  return 35;
}

// Solo permite horas en :00, :15, :30 o :45
function esHoraValida(hora) {
  const [_, m] = hora.split(':').map(Number);
  return m === 0 || m === 15 || m === 30 || m === 45;
}

// Replace existing EARLY_RESTRICTED_STATIONS and keyword logic
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

export async function checkDisponibilidad({ fecha, horaDeseada, estacionDeseada }) {
  console.log('🔍 Validando reserva:', { fecha, horaDeseada, estacionDeseada });
  
  if (!fecha || !horaDeseada || !estacionDeseada) {
    return { error: 'Faltan datos' };
  }

  // 3. Validar intervalos de 15 minutos
  if (!esHoraValida(horaDeseada)) {
    console.log('❌ Hora no válida (no es :00, :15, :30 o :45):', horaDeseada);
    return {
      error: 'Solo puedes reservar en intervalos de 15 minutos (ej: 9:00, 9:15, 9:30, 9:45).',
    };
  }

  // Cargar estaciones (por si se requiere en el futuro)
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

  // Obtener todas las reservas del día ordenadas por hora ascendente
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

  // 0. Validar que la estación esté permitida y horario temprano
  const estacionNormalizada = normalizeName(estacionDeseada);
  const estacionObj = estaciones.find(e => normalizeName(e.name).includes(estacionNormalizada));
  if (incluyeKeywordExcluido(estacionNormalizada)) {
    return {
      disponible: false,
      error: 'En esta estación no se realizan entregas.'
    };
  }

  // Restringir reservas antes de 08:30 en estaciones de ciertos rangos
  if (minutosDeseados < EARLY_START_MINUTES && isEarlyStation(estacionDeseada)) {
    // Early station antes de 08:30 → no permitido (debe ser >= 08:30)
    return {
      disponible: false,
      error: 'Para esta estación las entregas inician a partir de las 08:30.'
    };
  }

  // Para estaciones fuera de la lista, bloquear horas antes de 10:00
  if (minutosDeseados < horaToMinutes('10:00') && !isEarlyStation(estacionDeseada)) {
    return {
      disponible: false,
      error: 'Las entregas en esta estación inician a partir de las 10:00.'
    };
  }

  // 1. Validar empalme - Permitir múltiples reservas en la misma estación/hora/fecha
  const reservaEnMismaHora = reservas.find(r => horaToMinutes(r.hora) === minutosDeseados);
  if (reservaEnMismaHora) {
    // Comparar estaciones de forma case-insensitive y normalizada
    const estacionExistente = reservaEnMismaHora.estacion.toLowerCase().trim();
    const estacionNueva = estacionDeseada.toLowerCase().trim();
    
    if (estacionExistente === estacionNueva) {
      console.log('✅ Misma estación, hora y fecha - Permitido para múltiples entregas');
      console.log('   Reserva existente:', reservaEnMismaHora.hora, reservaEnMismaHora.estacion);
      console.log('   Nueva reserva:', horaDeseada, estacionDeseada);
    } else {
      console.log('❌ Empalme detectado en diferente estación:', reservaEnMismaHora.hora, reservaEnMismaHora.estacion, 'vs', estacionDeseada);
      return {
        disponible: false,
        error: 'Ya hay otra reservación a esa hora en una estación diferente. Por favor elige otro horario.'
      };
    }
  }

  // 2. Validar traslado solo desde la reserva previa más cercana
  const reservasPrevias = reservas
    .map(r => ({ ...r, min: horaToMinutes(r.hora) }))
    .filter(r => r.min < minutosDeseados);

  console.log('📅 Reservas previas:', reservasPrevias.length);
  reservasPrevias.forEach(r => console.log('  -', r.hora, r.estacion, '(', r.min, 'min)'));

  if (reservasPrevias.length > 0) {
    // Tomar la reserva previa más cercana
    const reservaAnterior = reservasPrevias[reservasPrevias.length - 1];
    console.log('🚇 Calculando traslado desde:', reservaAnterior.estacion, 'hacia:', estacionDeseada);
    
    const duracionMin = await calcularDuracionMaps(reservaAnterior.estacion, estacionDeseada);
    const margen = 15 + duracionMin;
    const tiempoMinimoRequerido = reservaAnterior.min + margen;
    
    console.log('⏱️  Duración traslado:', duracionMin, 'min');
    console.log('⏱️  Margen total:', margen, 'min (15 + ' + duracionMin + ')');
    console.log('⏱️  Tiempo mínimo requerido:', tiempoMinimoRequerido, 'min');
    console.log('⏱️  Tiempo deseado:', minutosDeseados, 'min');
    console.log('⏱️  ¿Es válido?', minutosDeseados >= tiempoMinimoRequerido);
    
    if (minutosDeseados < tiempoMinimoRequerido) {
      console.log('❌ No hay tiempo suficiente para traslado');
      return {
        disponible: false,
        error: 'El repartidor no podrá llegar a tiempo desde la entrega anterior. Elige una hora más tarde.'
      };
    }
  }

  // 3. Validar traslado hacia la siguiente reserva
  const reservasPosteriores = reservas
    .map(r => ({ ...r, min: horaToMinutes(r.hora) }))
    .filter(r => r.min > minutosDeseados);

  if (reservasPosteriores.length > 0) {
    const siguiente = reservasPosteriores[0]; // ya vienen ordenadas asc
    console.log('🚇 Calculando traslado desde estación solicitada hacia siguiente reserva:', estacionDeseada, '→', siguiente.estacion);

    const duracionMin = await calcularDuracionMaps(estacionDeseada, siguiente.estacion);
    const margen = 15 + duracionMin;
    const tiempoNecesario = minutosDeseados + margen;

    console.log('⏱️  Duración traslado (hacia siguiente):', duracionMin, 'min');
    console.log('⏱️  Margen total:', margen, 'min');
    console.log('⏱️  Próxima reserva', siguiente.hora, '(', siguiente.min, 'min )');

    if (siguiente.min < tiempoNecesario) {
      return {
        disponible: false,
        error: 'El repartidor no alcanzará a llegar a la siguiente entrega a tiempo. Elige una hora más temprana.'
      };
    }
  }

  console.log('✅ Validación exitosa - reserva permitida');
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