import { checkDisponibilidad } from './validar-reserva.js';
import { horaToMinutes } from './validar-reserva.js';

function normalizeName(n){return n.toLowerCase().replace(/[\s\u2019']/g,' ').replace(/\s+/g,' ').trim();}
const EARLY_STATIONS_SET = new Set([
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
const isEarlyStation=n=>[...EARLY_STATIONS_SET].some(s=>normalizeName(s)===normalizeName(n));

export default async function handler(req,res){
  if(req.method!== 'GET') return res.status(405).json({error:'Method not allowed'});
  const {fecha,estacion}=req.query;
  if(!fecha||!estacion) return res.status(400).json({error:'Faltan datos'});

  const start = isEarlyStation(estacion)?horaToMinutes('08:30'):horaToMinutes('10:00');
  const end = horaToMinutes('17:00');
  const slots=[];

  for(let min=start;min<=end;min+=30){
    const h=Math.floor(min/60);const m=min%60;
    const hora= `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
    const result=await checkDisponibilidad({fecha,horaDeseada:hora,estacionDeseada:estacion});
    if(result.disponible) slots.push(hora);
  }
  return res.status(200).json({horas:slots});
} 