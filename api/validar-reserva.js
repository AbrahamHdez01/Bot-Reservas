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
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origen)}&destination=${encodeURIComponent(destino)}&mode=transit&key=${GOOGLE_MAPS_API_KEY}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.status === 'OK' && data.routes[0]?.legs[0]?.duration?.value) {
    return Math.ceil(data.routes[0].legs[0].duration.value / 60);
  }
  // Si falla, asumir 30 min por defecto
  return 30;
}

// Solo permite horas en :00 o :30
function esHoraValida(hora) {
  const [_, m] = hora.split(':').map(Number);
  return m === 0 || m === 30;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { fecha, horaDeseada, estacionDeseada } = req.body;
  if (!fecha || !horaDeseada || !estacionDeseada) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  // 3. Validar intervalos de 30 minutos
  if (!esHoraValida(horaDeseada)) {
    return res.status(400).json({
      error: 'Solo puedes reservar en intervalos de 30 minutos (ej: 9:00, 9:30).',
    });
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
    return res.status(500).json({ error: 'No se pudieron cargar las estaciones' });
  }

  // Obtener todas las reservas del día ordenadas por hora ascendente
  const { data: reservas, error } = await supabase
    .from('reservas')
    .select('*')
    .eq('fecha', fecha)
    .order('hora', { ascending: true });
  if (error) {
    return res.status(500).json({ error: 'Error consultando reservas' });
  }

  const minutosDeseados = horaToMinutes(horaDeseada);

  // 1. Bloquear si ya existe una reserva a la misma hora/fecha (sin importar estación)
  if (reservas.some(r => horaToMinutes(r.hora) === minutosDeseados)) {
    return res.status(400).json({
      error: '¡Ups! Ya hay una entrega programada a esa hora. Elige otra por favor.'
    });
  }

  // 2. Validar traslado solo desde la reserva previa más cercana
  const reservasPrevias = reservas
    .map(r => ({ ...r, min: horaToMinutes(r.hora) }))
    .filter(r => r.min < minutosDeseados);

  if (reservasPrevias.length > 0) {
    // Tomar la reserva previa más cercana
    const reservaAnterior = reservasPrevias[reservasPrevias.length - 1];
    const duracionMin = await calcularDuracionMaps(reservaAnterior.estacion, estacionDeseada);
    const margen = 15 + duracionMin;
    if (minutosDeseados < reservaAnterior.min + margen) {
      return res.status(400).json({
        error: 'No es posible llegar a tiempo desde la entrega anterior. Elige una hora posterior.'
      });
    }
  }

  return res.status(200).json({ ok: true });
} 