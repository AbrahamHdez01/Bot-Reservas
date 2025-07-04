import { supabase } from '../lib/supabase.js';
import { tiempoGrafo } from '../lib/metroGrafo.js';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/* ──────────────────────────────────────────────────────────
   UTILITARIOS DE FECHA / HORA
─────────────────────────────────────────────────────────── */
function horaToMinutes(hora) {
  if (!hora) return NaN;
  hora = hora.trim();
  const match24 = hora.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);  // HH:MM o HH:MM:SS
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = parseInt(match24[2], 10);
    return h * 60 + m;
  }
  const match12 = hora.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = parseInt(match12[2], 10);
    const ampm = match12[3].toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}
  const match12simple = hora.match(/^(\d{1,2})\s*(am|pm)$/i);
  if (match12simple) {
    let h = parseInt(match12simple[1], 10);
    const ampm = match12simple[2].toUpperCase();
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60;
  }
  console.warn('horaToMinutes: formato no reconocido =>', hora);
  return NaN;
}

function minutesToHora(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/* ──────────────────────────────────────────────────────────
   CÁLCULO DE DURACIÓN CON GRAFO + GOOGLE MAPS FALLBACK
─────────────────────────────────────────────────────────── */
const directionsCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 h

async function calcularDuracion(origen, destino) {
  const limpiar = (s) =>
    s.replace(/, (Ciudad|Estado) de.*$/, '')
      .replace(/\\.*$/, '')
      .trim();

  const o = limpiar(origen);
  const d = limpiar(destino);
  if (o === d) return 5;

  const key = `${o}->${d}`;
  const hit = directionsCache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.min;

  // PASO 1: Intentar con grafo topológico del metro (múltiples formatos)
  const formatosOrigen = [origen, o];
  const formatosDestino = [destino, d];
  
  for (const formatoOrigen of formatosOrigen) {
    for (const formatoDestino of formatosDestino) {
  try {
        const tiempoMetro = tiempoGrafo(formatoOrigen, formatoDestino);
    if (tiempoMetro !== null) {
          console.log(`DEBUG: Usando grafo metro: ${formatoOrigen} -> ${formatoDestino} = ${tiempoMetro} min`);
      directionsCache.set(key, { min: tiempoMetro, ts: Date.now() });
      return tiempoMetro;
    }
  } catch (error) {
        // Continuar con el siguiente formato
      }
    }
  }
  
  console.log(`DEBUG: Grafo metro no encontró: ${o} -> ${d}`);

  // PASO 2: Fallback a Google Maps Directions
  if (!GOOGLE_MAPS_API_KEY) {
    console.log(`DEBUG: Sin API key y estaciones no en grafo: ${o} -> ${d}, usando fallback 15 min`);
    return 15;
  }

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
    o
  )}&destination=${encodeURIComponent(
    d
  )}&mode=transit&transit_mode=subway&departure_time=now&region=mx&language=es&key=${GOOGLE_MAPS_API_KEY}`;
      
  try {
    const r = await fetch(url);
    const j = await r.json();
    if (j.status === 'OK') {
      const seg = j.routes[0].legs[0].duration.value;
      const googleMinutes = Math.max(Math.min(Math.ceil(seg / 60), 90), 8); // Límites 8-90
      console.log(`DEBUG: Usando Google Maps: ${o} -> ${d} = ${googleMinutes} min`);
      directionsCache.set(key, { min: googleMinutes, ts: Date.now() });
      return googleMinutes;
        }
  } catch (error) {
    console.log(`DEBUG: Error Google Maps: ${error.message}`);
      }
      
  // PASO 3: Fallback final
  console.log(`DEBUG: Fallback final: ${o} -> ${d} = 15 min`);
  return 15;
  }
  
/* ──────────────────────────────────────────────────────────
   CONSTANTES DE NEGOCIO
─────────────────────────────────────────────────────────── */
function esHoraValida(h) {
  const m = parseInt(h.split(':')[1] || '0', 10);
  return [0, 15, 30, 45].includes(m);
}

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
const EXCLUDED_KEYWORDS = [
  'deportivo oceanía',
  'ciudad azteca',
  'tezonco',
  'tláhuac',
  'peñón viejo',
  'la paz',
];

const EARLY_MIN = horaToMinutes('08:30');
const REGULAR_MIN = horaToMinutes('10:00');

const TZ = 'America/Mexico_City';
const hoyMX = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());

/* ──────────────────────────────────────────────────────────
   VALIDACIÓN PRINCIPAL
─────────────────────────────────────────────────────────── */
export async function checkDisponibilidad({ fecha, horaDeseada, estacionDeseada }) {
  if (!fecha || !horaDeseada || !estacionDeseada)
    return { error: 'Faltan datos' };

  // 0. Bloqueo fecha de hoy (normalizada) - solo mismo día
  const hoy = hoyMX();
  
  // Normalizar la fecha de entrada para asegurar formato correcto
  let fechaNorm;
  try {
    // Si la fecha viene en formato YYYY-M-D, la normalizamos
    if (typeof fecha === 'string' && fecha.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
      const [year, month, day] = fecha.split('-');
      fechaNorm = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } else {
      // Para otros formatos, usar la conversión estándar
      fechaNorm = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(
        new Date(fecha)
      );
    }
  } catch (e) {
    return { error: 'Formato de fecha inválido.' };
  }
  
  if (fechaNorm === hoy)
    return { error: 'No se pueden hacer reservas para el mismo día. Selecciona mañana o una fecha posterior.' };

  // 1. Bloque de 15 min
  if (!esHoraValida(horaDeseada))
    return { error: 'Solo puedes reservar en intervalos de 15 minutos (:00 :15 :30 :45).' };

  // 2. Exclusión por estación
  const normal = estacionDeseada.toLowerCase();
  if (EXCLUDED_KEYWORDS.some((k) => normal.includes(k)))
    return { error: 'En esta estación no se realizan entregas.' };

  // 3. Horario mínimo por estación
  const minReq =
    [...EARLY_STATIONS].some((s) => s.toLowerCase() === normal) ? EARLY_MIN : REGULAR_MIN;
  const tNueva = horaToMinutes(horaDeseada);
  if (tNueva < minReq)
    return {
      error:
        minReq === EARLY_MIN
          ? 'Para esta estación las entregas inician a partir de las 08:30.'
          : 'Las entregas en esta estación inician a partir de las 10:00.',
    };

  // 4. Reservas existentes del día
  const { data, error } = await supabase
    .from('reservas')
    .select('*')
    .eq('fecha', fecha)
    .in('estado', ['pendiente', 'confirmado'])
    .order('hora');
  if (error) return { error: 'Error consultando reservas.' };
  const reservas = data || [];

  // 5. Bloqueo de hora exacta (independiente de estación)
  if (reservas.some((r) => horaToMinutes(r.hora) === tNueva))
    return {
      error:
        '¡Ups! El repartidor no puede completar esta entrega. Selecciona otro horario.',
    };

  // 6. Prev / Next y márgenes
  const withMin = reservas.map((r) => ({ ...r, min: horaToMinutes(r.hora) }));
  let prev = null,
    next = null;
  for (const r of withMin) {
    if (r.min < tNueva) prev = r;
    else if (r.min > tNueva) {
      next = r;
      break;
    }
  }

  const gapOK = async () => {
    if (prev) {
      const duracion = await calcularDuracion(prev.estacion, estacionDeseada);
      const need = 15 + duracion;
      const gap = tNueva - prev.min;
      console.log(`DEBUG prev: ${prev.estacion} -> ${estacionDeseada}, duracion: ${duracion}min, need: ${need}min, gap: ${gap}min, OK: ${gap >= need}`);
      if (gap < need) return false;
    }
    if (next) {
      const duracion = await calcularDuracion(estacionDeseada, next.estacion);
      const need = 15 + duracion;
      const gap = next.min - tNueva;
      console.log(`DEBUG next: ${estacionDeseada} -> ${next.estacion}, duracion: ${duracion}min, need: ${need}min, gap: ${gap}min, OK: ${gap >= need}`);
      if (gap < need) return false;
    }
    return true;
  };

  if (!(await gapOK()))
    return {
      error:
        '¡Ups! El repartidor no puede completar esta entrega. Selecciona otro horario.',
    };

  return { disponible: true };
}

/* ──────────────────────────────────────────────────────────
   ENDPOINT HTTP
─────────────────────────────────────────────────────────── */
export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Método no permitido' });

  const { fecha, horaDeseada, estacionDeseada } = req.body;
  const result = await checkDisponibilidad({ fecha, horaDeseada, estacionDeseada });

  if (result.error) return res.status(400).json(result);
  return res.status(200).json(result);
}

export { horaToMinutes }; 