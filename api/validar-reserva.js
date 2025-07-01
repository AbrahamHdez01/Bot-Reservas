import { supabase } from '../lib/supabase.js';
import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

function horaToMinutes(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function minutesToHora(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function esHoraValida(hora) {
  const [h, m] = hora.split(':').map(Number);
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

  if (!esHoraValida(horaDeseada)) {
    return res.status(400).json({
      error: 'Solo puedes reservar en intervalos de 30 minutos (ej: 9:00, 9:30)',
    });
  }

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

  const { data: reservas, error } = await supabase
    .from('reservas')
    .select('*')
    .eq('fecha', fecha)
    .order('hora', { ascending: true });

  if (error) {
    return res.status(500).json({ error: 'Error consultando reservas' });
  }

  const minutosDeseados = horaToMinutes(horaDeseada);

  for (const reserva of reservas) {
    const minutosExistente = horaToMinutes(reserva.hora);

    // 🚫 Empalme exacto
    if (minutosDeseados === minutosExistente) {
      return res.status(400).json({
        error: '¡Ups! Ya hay una entrega programada a esa hora. Elige otra por favor.',
      });
    }

    // ⏱️ Validar tiempo de traslado entre estaciones
    const origen = encodeURIComponent(reserva.estacion);
    const destino = encodeURIComponent(estacionDeseada);
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origen}&destination=${destino}&mode=transit&key=${GOOGLE_MAPS_API_KEY}`;

    const resp = await fetch(url);
    const directions = await resp.json();

    if (directions.status !== 'OK') continue;

    const duracionSeg = directions.routes[0].legs[0].duration.value;
    const duracionMin = Math.ceil(duracionSeg / 60);
    const margen = 15 + duracionMin;

    if (minutosDeseados < minutosExistente + margen) {
      return res.status(400).json({
        error:
          'No es posible llegar a tiempo desde la entrega anterior. Elige una hora posterior.',
      });
    }
  }

  return res.status(200).json({ ok: true });
} 