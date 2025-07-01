import { supabase } from '../lib/supabase.js';
import fs from 'fs/promises';
import path from 'path';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Generar horas disponibles según estación
function generarHorasDisponibles(estacion) {
  const estacionLower = estacion.toLowerCase();
  let horaInicio = 10; // Por defecto 10:00
  let horaFin = 17; // 17:00
  
  // Ajustar horarios según estación específica
  if (["constitución", "chabacano", "la viga", "santa anita"].some(n => estacionLower.includes(n))) {
    horaInicio = 8.5; // 8:30 am
  } else if (["periférico oriente", "atlalilco"].some(n => estacionLower.includes(n))) {
    horaInicio = 8.5; // 8:30 am
  } else if (["mixcoac", "polanco"].some(n => estacionLower.includes(n))) {
    horaInicio = 8.5; // 8:30 am
  }

  const horas = [];
  for (let hora = horaInicio; hora <= horaFin; hora += 0.5) {
    const h = Math.floor(hora);
    const m = (hora % 1) * 60;
    horas.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
  return horas;
}

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

  const horasDisponibles = generarHorasDisponibles(estacionDeseada);

  // 1. Obtener reservas existentes para la fecha con estado confirmado o pendiente
  const { data: reservas, error } = await supabase
    .from('reservas')
    .select('estacion, hora')
    .eq('fecha', fecha)
    .in('estado', ['pendiente', 'confirmado']);

  if (error) {
    return res.status(500).json({ error: 'Error consultando reservas' });
  }

  // 2. Verificar conflictos directos (misma hora y estación)
  const reservaDirecta = reservas.find(r => r.hora === horaDeseada && r.estacion === estacionDeseada);
  if (reservaDirecta) {
    const horasOcupadas = new Set(reservas.map(r => r.hora));
    const sugerida = sugerirHora(horasDisponibles, horasOcupadas, horaDeseada);
    return res.status(200).json({
      disponible: false,
      horaSugerida: sugerida,
      motivo: `Ya hay una entrega en ${estacionDeseada} a las ${horaDeseada}`,
      mensaje: sugerida
        ? `Ya tenemos una entrega a esa hora en esa estación. ¿Te parece bien las ${sugerida}?`
        : 'No hay horarios disponibles.'
    });
  }

  // 3. Verificar conflictos por tiempo de traslado
  const [h1, m1] = horaDeseada.split(':').map(Number);
  const minutosNueva = h1 * 60 + m1;

  for (const reserva of reservas) {
    if (reserva.estacion === estacionDeseada) continue; // ya validado arriba

    const [h2, m2] = reserva.hora.split(':').map(Number);
    const minutosExistente = h2 * 60 + m2;

    // Calcular tiempo de traslado real entre estaciones
    const duracionTraslado = await calcularTraslado(reserva.estacion, estacionDeseada, estaciones);
    
    // Caso 1: Nueva reserva es DESPUÉS de la existente
    // Necesito tiempo para ir de la existente a la nueva + 15 min de entrega
    if (minutosNueva > minutosExistente) {
      const tiempoMinimo = minutosExistente + 15 + duracionTraslado; // 15 min entrega + traslado
      if (minutosNueva < tiempoMinimo) {
        const horasOcupadas = new Set(reservas.map(r => r.hora));
        const sugerida = sugerirHora(horasDisponibles, horasOcupadas, horaDeseada);
        return res.status(200).json({
          disponible: false,
          horaSugerida: sugerida,
          motivo: `Entrega en ${reserva.estacion} a las ${reserva.hora}. Traslado: ${duracionTraslado} min`,
          mensaje: sugerida
            ? `No hay tiempo suficiente para el traslado (${duracionTraslado} min desde ${reserva.estacion}). ¿Te parece bien las ${sugerida}?`
            : 'No hay horarios disponibles con tiempo suficiente para el traslado.'
        });
      }
    }
    
    // Caso 2: Nueva reserva es ANTES de la existente  
    // Necesito tiempo para ir de la nueva a la existente + 15 min de entrega
    else if (minutosNueva < minutosExistente) {
      const tiempoMinimo = minutosNueva + 15 + duracionTraslado; // 15 min entrega + traslado
      if (tiempoMinimo > minutosExistente) {
        const horasOcupadas = new Set(reservas.map(r => r.hora));
        const sugerida = sugerirHora(horasDisponibles, horasOcupadas, horaDeseada);
        return res.status(200).json({
          disponible: false,
          horaSugerida: sugerida,
          motivo: `Entrega en ${reserva.estacion} a las ${reserva.hora}. Traslado: ${duracionTraslado} min`,
          mensaje: sugerida
            ? `No hay tiempo suficiente para llegar a la siguiente entrega (${duracionTraslado} min hacia ${reserva.estacion}). ¿Te parece bien las ${sugerida}?`
            : 'No hay horarios disponibles con tiempo suficiente para el traslado.'
        });
      }
    }
  }

  // Si no hay conflicto
  return res.status(200).json({ disponible: true });
}

// Sugerir la siguiente hora disponible
function sugerirHora(horasDisponibles, horasOcupadas, horaDeseada) {
  const idx = horasDisponibles.indexOf(horaDeseada);
  
  // Buscar hacia adelante primero
  for (let i = idx + 1; i < horasDisponibles.length; i++) {
    if (!horasOcupadas.has(horasDisponibles[i])) {
      return horasDisponibles[i];
    }
  }
  
  // Si no encuentra hacia adelante, buscar hacia atrás
  for (let i = idx - 1; i >= 0; i--) {
    if (!horasOcupadas.has(horasDisponibles[i])) {
      return horasDisponibles[i];
    }
  }
  
  return null;
}

// Calcular tiempo de traslado entre estaciones usando Google Directions API con coordenadas
async function calcularTraslado(estacionA, estacionB, estaciones) {
  if (estacionA === estacionB) return 0;
  
  const origen = estaciones.find(e => e.name === estacionA);
  const destino = estaciones.find(e => e.name === estacionB);
  
  if (!origen || !destino) {
    console.warn(`Estación no encontrada: ${estacionA} o ${estacionB}`);
    return 30; // fallback
  }

  try {
    // Usar coordenadas en lugar de nombres
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origen.lat},${origen.lng}&destination=${destino.lat},${destino.lng}&mode=transit&key=${GOOGLE_MAPS_API_KEY}`;
    
    const resp = await fetch(url);
    const data = await resp.json();
    
    if (data.status === 'OK' && data.routes && data.routes[0] && data.routes[0].legs && data.routes[0].legs[0]) {
      const duracionMinutos = Math.ceil(data.routes[0].legs[0].duration.value / 60);
      console.log(`Traslado ${estacionA} → ${estacionB}: ${duracionMinutos} min`);
      return duracionMinutos;
    } else {
      console.warn(`Error en Directions API: ${data.status} para ${estacionA} → ${estacionB}`);
      return 30; // fallback
    }
  } catch (error) {
    console.error('Error calculando traslado:', error);
    return 30; // fallback
  }
} 