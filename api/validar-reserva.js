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

  // 1. Validar empalme exacto (misma estación, misma hora, misma fecha)
  const empalme = reservas.find(r => r.hora === horaDeseada && r.estacion === estacionDeseada);
  if (empalme) {
    return res.status(200).json({
      disponible: false,
      motivo: 'Empalme',
      mensaje: '¡Ups! Ya hay una entrega programada a esa hora. Por favor, elige otra.'
    });
  }

  // 2. Validar conflictos por tiempo de llegada (Directions + 15 min)
  const [hNueva, mNueva] = horaDeseada.split(':').map(Number);
  const minutosNueva = hNueva * 60 + mNueva;

  for (const reserva of reservas) {
    if (reserva.estacion === estacionDeseada && reserva.hora === horaDeseada) continue; // ya validado arriba
    const [hExist, mExist] = reserva.hora.split(':').map(Number);
    const minutosExist = hExist * 60 + mExist;
    // Solo comparar reservas el mismo día
    // Calcular tiempo de traslado real
    const duracionTraslado = await calcularTraslado(reserva.estacion, estacionDeseada, estaciones);
    // Si la nueva es después de la existente
    if (minutosNueva > minutosExist) {
      const tiempoMinimo = minutosExist + 15 + duracionTraslado;
      if (minutosNueva < tiempoMinimo) {
        // Sugerir siguiente hora válida
        const sugerida = sugerirSiguienteHoraValida(horasDisponibles, reservas, estacionDeseada, minutosExist, 15 + duracionTraslado);
        return res.status(200).json({
          disponible: false,
          motivo: 'Traslado',
          mensaje: `No hay tiempo suficiente para llegar desde la entrega anterior. Intenta a partir de las ${sugerida || 'otra hora'}.`,
          horaSugerida: sugerida
        });
      }
    }
    // Si la nueva es antes de la existente
    else if (minutosNueva < minutosExist) {
      const tiempoMinimo = minutosNueva + 15 + duracionTraslado;
      if (tiempoMinimo > minutosExist) {
        const sugerida = sugerirSiguienteHoraValida(horasDisponibles, reservas, estacionDeseada, minutosExist, -(15 + duracionTraslado));
        return res.status(200).json({
          disponible: false,
          motivo: 'Traslado',
          mensaje: `No hay tiempo suficiente para llegar a la siguiente entrega. Intenta antes de las ${sugerida || 'otra hora'}.`,
          horaSugerida: sugerida
        });
      }
    }
  }

  // Si todo bien
  return res.status(200).json({ disponible: true });
}

// Sugerir la siguiente hora válida (opcional: solo intervalos de 30 min)
function sugerirSiguienteHoraValida(horasDisponibles, reservas, estacionDeseada, desdeMin, margen) {
  // Solo intervalos de 30 min
  const horas30 = horasDisponibles.filter(h => h.endsWith(':00') || h.endsWith(':30'));
  for (const h of horas30) {
    const [hh, mm] = h.split(':').map(Number);
    const min = hh * 60 + mm;
    // No debe estar ocupada en la estación
    if (reservas.some(r => r.hora === h && r.estacion === estacionDeseada)) continue;
    // Debe respetar el margen
    if (margen > 0 && min >= desdeMin + margen) return h;
    if (margen < 0 && min <= desdeMin + margen) return h;
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