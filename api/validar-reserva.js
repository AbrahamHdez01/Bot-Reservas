import { supabase } from '../lib/supabase.js';
import fs from 'fs/promises';
import path from 'path';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Horas disponibles de 10:00 a 17:00 cada 15 minutos
const horasDisponibles = Array.from({ length: 29 }, (_, i) => {
  const h = 10 + Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { fecha, horaDeseada, estacionDeseada } = req.body;
  if (!fecha || !horaDeseada || !estacionDeseada) {
    return res.status(400).json({ error: 'Faltan datos' });
  }

  // Cargar estaciones
  let estaciones = [];
  try {
    const estacionesRaw = await fs.readFile(path.join(process.cwd(), 'public/metro_stations.json'), 'utf-8');
    estaciones = JSON.parse(estacionesRaw);
  } catch (e) {
    return res.status(500).json({ error: 'No se pudieron cargar las estaciones' });
  }

  // 1. Obtener reservas existentes para la fecha
  const { data: reservas, error } = await supabase
    .from('reservas')
    .select('estacion, hora')
    .eq('fecha', fecha);

  if (error) {
    return res.status(500).json({ error: 'Error consultando reservas' });
  }

  // 2. Verificar conflictos directos (misma hora y estación)
  let horasOcupadas = new Set(reservas.map(r => r.hora));
  if (horasOcupadas.has(horaDeseada)) {
    // Buscar siguiente hora disponible
    const sugerida = sugerirHora(horasDisponibles, horasOcupadas, horaDeseada);
    return res.status(200).json({
      disponible: false,
      horaSugerida: sugerida,
      motivo: `Ya hay una entrega a las ${horaDeseada}`,
      mensaje: sugerida
        ? `Tenemos una entrega cercana a esa hora. ¿Te parece bien las ${sugerida}?`
        : 'No hay horarios disponibles cercanos.'
    });
  }

  // 3. Verificar conflictos por traslado
  for (const reserva of reservas) {
    if (reserva.hora === horaDeseada) continue; // ya validado arriba

    // Calcular diferencia de minutos entre horas
    const [h1, m1] = horaDeseada.split(':').map(Number);
    const [h2, m2] = reserva.hora.split(':').map(Number);
    const minutosNueva = h1 * 60 + m1;
    const minutosExistente = h2 * 60 + m2;

    // Si la diferencia es menor a 15, hay conflicto directo
    if (Math.abs(minutosNueva - minutosExistente) < 15) {
      const sugerida = sugerirHora(horasDisponibles, horasOcupadas, horaDeseada);
      return res.status(200).json({
        disponible: false,
        horaSugerida: sugerida,
        motivo: `Entrega en estación ${reserva.estacion} a las ${reserva.hora}`,
        mensaje: sugerida
          ? `Tenemos una entrega cercana a esa hora. ¿Te parece bien las ${sugerida}?`
          : 'No hay horarios disponibles cercanos.'
      });
    }

    // Calcular tiempo de traslado entre estaciones
    const duracionTraslado = await calcularTraslado(estacionDeseada, reserva.estacion, estaciones);
    // Si el tiempo de traslado + margen (5 min) + duración (15 min) no permite llegar
    if (
      minutosNueva > minutosExistente &&
      minutosNueva < minutosExistente + 15 + duracionTraslado + 5
    ) {
      const sugerida = sugerirHora(horasDisponibles, horasOcupadas, horaDeseada);
      return res.status(200).json({
        disponible: false,
        horaSugerida: sugerida,
        motivo: `Entrega en estación ${reserva.estacion} a las ${reserva.hora}`,
        mensaje: sugerida
          ? `Tenemos una entrega cercana a esa hora. ¿Te parece bien las ${sugerida}?`
          : 'No hay horarios disponibles cercanos.'
      });
    }
  }

  // Si no hay conflicto
  return res.status(200).json({ disponible: true });
}

// Sugerir la siguiente hora disponible
function sugerirHora(horasDisponibles, horasOcupadas, horaDeseada) {
  const idx = horasDisponibles.indexOf(horaDeseada);
  for (let i = idx + 1; i < horasDisponibles.length; i++) {
    if (!horasOcupadas.has(horasDisponibles[i])) {
      return horasDisponibles[i];
    }
  }
  for (let i = idx - 1; i >= 0; i--) {
    if (!horasOcupadas.has(horasDisponibles[i])) {
      return horasDisponibles[i];
    }
  }
  return null;
}

// Calcular tiempo de traslado entre estaciones usando Google Directions API
async function calcularTraslado(estacionA, estacionB, estaciones) {
  if (estacionA === estacionB) return 0;
  const origen = estaciones.find(e => e.name === estacionA);
  const destino = estaciones.find(e => e.name === estacionB);
  if (!origen || !destino) return 30; // fallback

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origen.name)}&destination=${encodeURIComponent(destino.name)}&mode=transit&key=${GOOGLE_MAPS_API_KEY}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (
    data.status === 'OK' &&
    data.routes &&
    data.routes[0] &&
    data.routes[0].legs &&
    data.routes[0].legs[0]
  ) {
    return Math.ceil(data.routes[0].legs[0].duration.value / 60); // minutos
  }
  return 30; // fallback
} 