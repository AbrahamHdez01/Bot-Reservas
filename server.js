const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { google } = require('googleapis');
const axios = require('axios');
const moment = require('moment-timezone');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for Render deployment
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'client/build')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Database setup
const db = new sqlite3.Database(':memory:', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

// Initialize database tables
function initDatabase() {
  db.serialize(() => {
    // Bookings table
    db.run(`CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      products TEXT NOT NULL,
      metro_station TEXT NOT NULL,
      delivery_date TEXT NOT NULL,
      delivery_time TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      google_calendar_event_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Crear índice único para evitar duplicados al sincronizar con Google Calendar
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_calendar_event_id ON bookings(google_calendar_event_id)`);

    // Metro stations table (DROP and recreate for serverless)
    db.run('DROP TABLE IF EXISTS metro_stations');
    db.run(`CREATE TABLE IF NOT EXISTS metro_stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      line TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      available INTEGER DEFAULT 1,
      reason TEXT
    )`);

    // Poblar desde metro_stations.json
    let metroStations = {};
    try {
      // En lugar de leer archivo, usar datos hardcodeados para serverless
      metroStations = {
        "1": [
          {"name": "Observatorio, Ciudad de México, CDMX, México", "available": false, "reason": "Mantenimiento"},
          {"name": "Tacubaya, Ciudad de México, CDMX, México", "available": false, "reason": "Mantenimiento"},
          {"name": "Juanacatlán, Ciudad de México, CDMX, México", "available": false, "reason": "Mantenimiento"},
          {"name": "Chapultepec, Ciudad de México, CDMX, México", "available": true},
          {"name": "Sevilla, Ciudad de México, CDMX, México", "available": true},
          {"name": "Insurgentes, Ciudad de México, CDMX, México", "available": true},
          {"name": "Cuauhtémoc, Ciudad de México, CDMX, México", "available": true},
          {"name": "Balderas, Ciudad de México, CDMX, México", "available": true},
          {"name": "Salto del Agua, Ciudad de México, CDMX, México", "available": true},
          {"name": "Isabel la Católica, Ciudad de México, CDMX, México", "available": true},
          {"name": "Pino Suárez, Ciudad de México, CDMX, México", "available": true},
          {"name": "Merced, Ciudad de México, CDMX, México", "available": true},
          {"name": "Candelaria, Ciudad de México, CDMX, México", "available": true},
          {"name": "San Lázaro, Ciudad de México, CDMX, México", "available": true},
          {"name": "Moctezuma, Ciudad de México, CDMX, México", "available": true},
          {"name": "Balbuena, Ciudad de México, CDMX, México", "available": true},
          {"name": "Boulevard Puerto Aéreo, Ciudad de México, CDMX, México", "available": true},
          {"name": "Gómez Farías, Ciudad de México, CDMX, México", "available": true},
          {"name": "Zaragoza, Ciudad de México, CDMX, México", "available": true},
          {"name": "Pantitlán, Ciudad de México, CDMX, México", "available": true}
        ],
        "2": [
          {"name": "Cuatro Caminos, Naucalpan de Juárez, Méx., México", "available": true},
          {"name": "Panteones, Ciudad de México, CDMX, México", "available": true},
          {"name": "Tacuba, Ciudad de México, CDMX, México", "available": true},
          {"name": "Cuitláhuac, Ciudad de México, CDMX, México", "available": true},
          {"name": "Popotla, Ciudad de México, CDMX, México", "available": true},
          {"name": "Colegio Militar, Ciudad de México, CDMX, México", "available": true},
          {"name": "Normal, Ciudad de México, CDMX, México", "available": true},
          {"name": "San Cosme, Ciudad de México, CDMX, México", "available": true},
          {"name": "Revolución, Ciudad de México, CDMX, México", "available": true},
          {"name": "Hidalgo, Ciudad de México, CDMX, México", "available": true},
          {"name": "Bellas Artes, Ciudad de México, CDMX, México", "available": true},
          {"name": "Allende, Ciudad de México, CDMX, México", "available": true},
          {"name": "Zócalo/Tenochtitlan, Ciudad de México, CDMX, México", "available": true},
          {"name": "Pino Suárez, Ciudad de México, CDMX, México", "available": true},
          {"name": "San Antonio Abad, Ciudad de México, CDMX, México", "available": true},
          {"name": "Chabacano, Ciudad de México, CDMX, México", "available": true},
          {"name": "Viaducto, Ciudad de México, CDMX, México", "available": true},
          {"name": "Xola, Ciudad de México, CDMX, México", "available": true},
          {"name": "Villa de Cortés, Ciudad de México, CDMX, México", "available": true},
          {"name": "Nativitas, Ciudad de México, CDMX, México", "available": true},
          {"name": "Portales, Ciudad de México, CDMX, México", "available": true},
          {"name": "Ermita, Ciudad de México, CDMX, México", "available": true},
          {"name": "General Anaya, Ciudad de México, CDMX, México", "available": true},
          {"name": "Tasqueña, Ciudad de México, CDMX, México", "available": true}
        ],
        "3": [
          {"name": "Indios Verdes, Ciudad de México, CDMX, México", "available": true},
          {"name": "Deportivo 18 de Marzo, Ciudad de México, CDMX, México", "available": true},
          {"name": "Potrero, Ciudad de México, CDMX, México", "available": true},
          {"name": "La Raza, Ciudad de México, CDMX, México", "available": true},
          {"name": "Tlatelolco, Ciudad de México, CDMX, México", "available": true},
          {"name": "Guerrero, Ciudad de México, CDMX, México", "available": true},
          {"name": "Hidalgo, Ciudad de México, CDMX, México", "available": true},
          {"name": "Juárez, Ciudad de México, CDMX, México", "available": true},
          {"name": "Balderas, Ciudad de México, CDMX, México", "available": true},
          {"name": "Niños Héroes, Ciudad de México, CDMX, México", "available": true},
          {"name": "Hospital General, Ciudad de México, CDMX, México", "available": true},
          {"name": "Centro Médico, Ciudad de México, CDMX, México", "available": true},
          {"name": "Etiopía/Plaza de la Transparencia, Ciudad de México, CDMX, México", "available": true},
          {"name": "Eugenia, Ciudad de México, CDMX, México", "available": true},
          {"name": "División del Norte, Ciudad de México, CDMX, México", "available": true},
          {"name": "Zapata, Ciudad de México, CDMX, México", "available": true},
          {"name": "Coyoacán, Ciudad de México, CDMX, México", "available": true},
          {"name": "Viveros/Derechos Humanos, Ciudad de México, CDMX, México", "available": true},
          {"name": "Miguel Ángel de Quevedo, Ciudad de México, CDMX, México", "available": true},
          {"name": "Copilco, Ciudad de México, CDMX, México", "available": true},
          {"name": "Universidad, Ciudad de México, CDMX, México", "available": true}
        ]
      };
      console.log('✅ Estaciones del Metro CDMX cargadas correctamente desde datos hardcodeados');
    } catch (error) {
      console.error('❌ Error cargando estaciones del metro:', error.message);
    }

    const insertStation = db.prepare('INSERT INTO metro_stations (name, line, latitude, longitude, available, reason) VALUES (?, ?, ?, ?, ?, ?)');
    Object.entries(metroStations).forEach(([line, stations]) => {
      stations.forEach(station => {
        insertStation.run(
          station.name,
          line,
          station.latitude || null,
          station.longitude || null,
          station.available === false ? 0 : 1,
          station.reason || null
        );
      });
    });
    insertStation.finalize();
  });
}

// Google Calendar setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Verificar si las credenciales de Google Calendar están configuradas
const googleCalendarConfigured = process.env.GOOGLE_CLIENT_ID && 
                                process.env.GOOGLE_CLIENT_SECRET && 
                                process.env.GOOGLE_REFRESH_TOKEN;

// Función para renovar token automáticamente
const refreshAccessToken = async () => {
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    console.log('🔄 Token renovado automáticamente');
    if (credentials.access_token) {
      console.log('✅ Nuevo access token generado');
    }
    return credentials.access_token;
  } catch (error) {
    console.error('❌ Error renovando token:', error.message);
    return null;
  }
};

// Función para verificar si el token necesita renovación
const ensureValidToken = async () => {
  try {
    const tokenInfo = await oauth2Client.getAccessToken();
    if (!tokenInfo.token) {
      console.log('🔄 Token no válido, renovando...');
      return await refreshAccessToken();
    }
    return tokenInfo.token;
  } catch (error) {
    console.log('🔄 Error obteniendo token, renovando...');
    return await refreshAccessToken();
  }
};

if (googleCalendarConfigured) {
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });
  
  // Configurar renovación automática cada 50 minutos (los tokens duran 1 hora)
  setInterval(async () => {
    await refreshAccessToken();
  }, 50 * 60 * 1000); // 50 minutos
  
  // Renovar token al inicio
  setTimeout(async () => {
    await refreshAccessToken();
  }, 5000); // Esperar 5 segundos después del inicio
  
  console.log('✅ Google Calendar configurado correctamente');
  console.log('📅 Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Configurado' : 'Faltante');
  console.log('🔑 Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'Configurado' : 'Faltante');
  console.log('🔄 Refresh Token:', process.env.GOOGLE_REFRESH_TOKEN ? 'Configurado' : 'Faltante');
  console.log('⏰ Renovación automática configurada cada 50 minutos');
} else {
  console.log('⚠️ Google Calendar no configurado - las reservas se guardarán solo en la base de datos');
  console.log('📅 Client ID:', process.env.GOOGLE_CLIENT_ID ? 'Configurado' : 'Faltante');
  console.log('🔑 Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'Configurado' : 'Faltante');
  console.log('🔄 Refresh Token:', process.env.GOOGLE_REFRESH_TOKEN ? 'Configurado' : 'Faltante');
}

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Productos por categorías y género
const PRODUCTS_BY_CATEGORY = {
  'PERFUMES HOMBRE': [
    'New Code Red', 'Devos Magnetic', 'Bleu Intense', 'Nitro Intense', 'Devos Sport',
    'Magnat (ed. caballero)', 'L\'Bel i.d', 'Vanilla For Men', 'Forze Unlimited', 'Kromo Black Courant',
    'Live Adventure', 'Homme 033', 'Atheus', 'Element D\'Orsay Inspire', 'New Code (ed. caballero)',
    'Nitro Cryzone', 'Desafiant', 'Le Tempo', 'Nitro Air Element', 'Live Intense',
    'Fogos', 'Devos Magnetic Seduction', 'Leyenda Christian Meier', 'Fist Cyzone',
    'Break In', 'Motion', 'D\'Antan', 'H for Men Cardigan Evolution (set)',
    'Energique Extreme Intense (trío)', 'Score Cyzone', 'Fist Team', 'You (ed. hombre)',
    'Seduttore', 'Victorius 1200 C', 'Kalos Privé Homme', 'Impredecible'
  ],
  'PERFUMES MUJER': [
    'Mityka Zaffyr', 'Chic Mia', 'Magnat (ed. dama)', 'Dream Mer', 'Valentia',
    'Exotic', 'Ainnara Bleu & Blue', 'Rêve Sensuelle', 'Tradition Du Thé Sensual',
    'Tiaré My Moment', 'Passion Concert Noir de Nuit', 'Autenti-X', 'Liasson Temps',
    'Femme L\'Bel', 'Flirty Girl', 'Momentos Libertad', 'Moon Myse', 'Passion Musk',
    'Sweet Black Exclusive', 'Grazzia', 'Brises de Vie', 'Viva ViveMon L\'Bel',
    'Liberté', 'In Me Cyzone', 'Soleil Rosé', 'Pure Bloom', 'Emouv Mithyka',
    'Sweet Chick', 'L\'Éclat L\'Bel', 'Danzzia', 'Liasson (ed. dama)',
    'Satin Rouge', 'Satin Nude', 'Dancing Sunset', 'Passion Body & Spirit'
  ],
  'BODY MIST': [
    'Berrylicious', 'Taste Coco', 'Pink Pomelo', 'Select Mist', 'Taste Warm', 'Paradisso'
  ],
  'BOLSAS': [
    'Bolso Bandolera Beige', 'Bolsa Café', 'Mochila Beige', 'Caja para Maquillaje'
  ],
  'COMPLEMENTOS': [
    'Essential Limpiadora Suave', 'Essential Desmaquillador Bifásico', 'Espuma de Limpieza Facial',
    'Elixir De Luxe (tratamiento capilar)', 'Tratamiento Multibeneficios para Cabello'
  ]
};

// === Sincronización con Google Calendar para reconstruir el histórico de reservas ===
async function syncBookingsFromCalendar() {
  if (!googleCalendarConfigured) return;

  try {
    console.log('🔄 Sincronizando reservas desde Google Calendar…');
    
    // Consultar eventos de los últimos 12 meses y los próximos 12 meses
    const timeMin = moment().subtract(12, 'months').startOf('day').toISOString();
    const timeMax = moment().add(12, 'months').endOf('day').toISOString();

    const eventsRes = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500,
    });

    const events = eventsRes.data.items || [];

    const insertBookingStmt = db.prepare(`INSERT OR IGNORE INTO bookings
      (customer_name, customer_phone, products, metro_station, delivery_date, delivery_time, status, google_calendar_event_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

    for (const ev of events) {
      // Solo procesar eventos creados por la app (contienen "Entrega:" en el summary)
      if (!ev.summary || !ev.summary.includes('Entrega:')) continue;

      // Determinar estado
      let status = 'pending';
      if (ev.summary.includes('[CONFIRMADA]') || ev.summary.includes('[CONFIRMADO]') || ev.summary.includes('[CONFIRMADA]')) {
        status = 'confirmed';
      }

      // Extraer productos y estación del summary => "Entrega: <products> - <station>"
      let products = '';
      let metro_station = '';
      const summaryMatch = ev.summary.match(/Entrega:\s*(.+?)\s*-\s*(.+)$/);
      if (summaryMatch) {
        products = summaryMatch[1].trim();
        metro_station = summaryMatch[2].trim();
      }

      // Parsear del description los campos faltantes
      let customer_name = '';
      let customer_phone = '';
      if (ev.description) {
        const nameMatch = ev.description.match(/Cliente:\s*(.+)/i);
        if (nameMatch) customer_name = nameMatch[1].trim();
        const phoneMatch = ev.description.match(/Tel[eé]fono:\s*(.+)/i);
        if (phoneMatch) customer_phone = phoneMatch[1].trim();
        // Si description contiene Productos/Estación puede sobreescribir
        const prodMatch = ev.description.match(/Productos:\s*(.+)/i);
        if (prodMatch) products = prodMatch[1].trim();
        const stationMatch = ev.description.match(/Estación:\s*(.+)/i);
        if (stationMatch) metro_station = stationMatch[1].trim();
        const statusMatch = ev.description.match(/Estado:\s*(.+)/i);
        if (statusMatch) {
          status = statusMatch[1].toLowerCase().includes('confirm') ? 'confirmed' : 'pending';
        }
      }

      // Fecha y hora de entrega
      let delivery_date = '';
      let delivery_time = '';
      if (ev.start?.dateTime) {
        const dt = moment(ev.start.dateTime).tz('America/Mexico_City');
        delivery_date = dt.format('YYYY-MM-DD');
        delivery_time = dt.format('HH:mm');
      }

      if (!delivery_date || !delivery_time) continue; // datos insuficientes

      insertBookingStmt.run(
        customer_name,
        customer_phone,
        products,
        metro_station,
        delivery_date,
        delivery_time,
        status,
        ev.id
      );
    }

    insertBookingStmt.finalize(() => {
      console.log('✅ Sincronización de reservas finalizada');
    });
  } catch (err) {
    console.error('❌ Error al sincronizar reservas desde Google Calendar:', err);
  }
}

// Llamar a la sincronización después de inicializar la base de datos
if (googleCalendarConfigured) {
  // Asegurarnos de esperar a que la tabla "bookings" exista (ya creada en initDatabase)
  db.serialize(() => {
    syncBookingsFromCalendar();
  });
}

// Route optimization using Google Maps API
async function getTransitTime(origin, destination) {
  // Si no hay API key de Google Maps, devolver valores simulados
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.log('Google Maps API key no configurada, usando valores simulados');
    return {
      duration: 1800, // 30 minutos en segundos
      durationText: '30 min',
      distance: 5000, // 5 km en metros
      distanceText: '5.0 km'
    };
  }

  // Verificar límites antes de hacer la llamada
  if (!checkMapsAPILimits()) {
    console.log('🚫 Límite diario de Google Maps API alcanzado, usando valores estimados');
    return {
      duration: 1800, // 30 minutos en segundos
      durationText: '30 min (estimado - límite alcanzado)',
      distance: 5000, // 5 km en metros
      distanceText: '5.0 km (estimado)'
    };
  }

  try {
    // Incrementar contador antes de hacer la llamada
    incrementMapsAPIUsage();
    
    const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params: {
        origin: origin,
        destination: destination,
        mode: 'transit',
        transit_mode: 'subway',
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const leg = route.legs[0];
      
      console.log(`✅ Google Maps: ${origin.replace(', Ciudad de México, CDMX, México', '')} → ${destination.replace(', Ciudad de México, CDMX, México', '')} = ${leg.duration.text}`);
      
      return {
        duration: leg.duration.value, // seconds
        durationText: leg.duration.text,
        distance: leg.distance.value, // meters
        distanceText: leg.distance.text
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting transit time:', error);
    
    // Si hay error, no decrementar el contador (ya se usó el request)
    if (error.response && error.response.status === 429) {
      console.log('⚠️ Rate limit alcanzado en Google Maps API');
    }
    
    // En caso de error, devolver valores simulados
    return {
      duration: 1800, // 30 minutos en segundos
      durationText: '30 min (estimado - error)',
      distance: 5000, // 5 km en metros
      distanceText: '5.0 km (estimado)'
    };
  }
}

// Metro stations data moved to hardcoded section in initDatabase() for serverless compatibility

// API Routes

// Get available metro stations (only those marked as available)
app.get('/api/metro-stations', (req, res) => {
  db.all('SELECT * FROM metro_stations WHERE available = 1 ORDER BY line, name', (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
    const stations = rows.map(station => ({
      name: station.name,
      line: station.line,
      latitude: station.latitude,
      longitude: station.longitude,
      available: !!station.available,
      reason: station.reason || null
    }));
    res.json({
      success: true,
      stations,
      total: stations.length
    });
  });
});

// Get stations by line
app.get('/api/metro-stations/line/:lineNumber', (req, res) => {
  const { lineNumber } = req.params;
  
  db.all('SELECT * FROM metro_stations WHERE line = ? AND available = 1 ORDER BY name', [lineNumber], (err, rows) => {
    if (err) {
      console.error('Error obteniendo estaciones por línea:', err);
      return res.status(500).json({ 
        success: false, 
        error: 'Error al obtener las estaciones de la línea' 
      });
    }

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Línea ${lineNumber} no encontrada o sin estaciones disponibles`
      });
    }

    const stations = rows.map(station => ({
      name: station.name,
      line: station.line,
      latitude: station.latitude,
      longitude: station.longitude,
      available: !!station.available,
      reason: station.reason || null
    }));
    
    res.json({
      success: true,
      line: lineNumber,
      stations: stations,
      total: stations.length
    });
  });
});

// Get all metro lines
app.get('/api/metro-lines', (req, res) => {
  db.all(`SELECT 
    line,
    COUNT(*) as totalStations,
    SUM(available) as availableStations
  FROM metro_stations 
  GROUP BY line 
  ORDER BY line`, (err, rows) => {
    if (err) {
      console.error('Error obteniendo líneas:', err);
      return res.status(500).json({ 
        success: false, 
        error: 'Error al obtener las líneas del metro' 
      });
    }

    const lines = rows.map(row => ({
      number: row.line,
      name: `Línea ${row.line}`,
      totalStations: row.totalStations,
      availableStations: row.availableStations
    }));

    res.json({
      success: true,
      lines: lines,
      total: lines.length
    });
  });
});

// Mantener el endpoint legacy para compatibilidad
app.get('/api/stations', (req, res) => {
  db.all('SELECT * FROM metro_stations ORDER BY line, name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get product categories
app.get('/api/categories', (req, res) => {
  res.json(Object.keys(PRODUCTS_BY_CATEGORY));
});

// Get products by category
app.get('/api/products/:category', (req, res) => {
  const { category } = req.params;
  const products = PRODUCTS_BY_CATEGORY[category];
  
  if (!products) {
    return res.status(404).json({ error: 'Categoría no encontrada' });
  }
  
  res.json(products);
});

// Get available time slots for a date and station
app.get('/api/available-slots/:date/:station?', async (req, res) => {
  const { date, station } = req.params;
  
  // Bloquear fechas pasadas Y fines de semana (sábado=6, domingo=0)
  const dayOfWeek = moment.tz(date, 'YYYY-MM-DD', 'America/Mexico_City').day();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return res.json([]); // No hay horarios disponibles en fin de semana
  }

  try {
    // Get existing bookings for this date
    const existingBookings = await new Promise((resolve, reject) => {
      db.all('SELECT delivery_time, metro_station FROM bookings WHERE delivery_date = ?', [date], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Si no se especifica estación, generar horarios dinámicos básicos
    if (!station) {
      const availableSlots = await generateDynamicTimeSlots(date, existingBookings);
      return res.json(availableSlots);
    }

    // Validación inteligente por estación con horarios dinámicos
    const stationName = decodeURIComponent(station);
    const availableSlots = await generateDynamicTimeSlotsForStation(date, stationName, existingBookings);

    res.json(availableSlots);

  } catch (error) {
    console.error('Error getting available slots:', error);
    // Fallback: devolver slots básicos
    const availableSlots = await generateDynamicTimeSlots(date, []);
    res.json(availableSlots);
  }
});

// Mantener endpoint legacy para compatibilidad
app.get('/api/available-slots/:date', async (req, res) => {
  const { date } = req.params;
  
  // Bloquear fechas pasadas Y fines de semana (sábado=6, domingo=0)
  const dayOfWeek = moment.tz(date, 'YYYY-MM-DD', 'America/Mexico_City').day();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return res.json([]); // No hay horarios disponibles en fin de semana
  }

  try {
    // Get existing bookings for this date
    const existingBookings = await new Promise((resolve, reject) => {
      db.all('SELECT delivery_time, metro_station FROM bookings WHERE delivery_date = ?', [date], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const availableSlots = await generateDynamicTimeSlots(date, existingBookings);
    res.json(availableSlots);

  } catch (error) {
    console.error('Error getting available slots:', error);
    const availableSlots = await generateDynamicTimeSlots(date, []);
    res.json(availableSlots);
  }
});

// Función para generar horarios dinámicos básicos (sin estación específica)
async function generateDynamicTimeSlots(date, existingBookings) {
  const slots = [];
  
  // Horario de 10:00 AM a 5:00 PM
  const startHour = 10;
  const endHour = 17;
  const endMinute = 0;
  
  // Generar slots cada 5 minutos
  for (let hour = startHour; hour <= endHour; hour++) {
    const maxMinute = (hour === endHour) ? endMinute : 55;
    
    for (let minute = 0; minute <= maxMinute; minute += 5) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(time);
    }
  }

  // Filtrar slots que tienen conflictos básicos (separación mínima de 5 minutos)
  const availableSlots = [];
  
  for (const slot of slots) {
    const slotMoment = moment.tz(`${date} ${slot}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City');
    let isAvailable = true;
    
    // Verificar separación mínima con otras reservas
    for (const booking of existingBookings) {
      const bookingMoment = moment.tz(`${date} ${booking.delivery_time}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City');
      const timeDiff = Math.abs(slotMoment.diff(bookingMoment, 'minutes'));
      
      if (timeDiff < 5) {
        isAvailable = false;
        break;
      }
    }
    
    if (isAvailable) {
      availableSlots.push(slot);
    }
  }
  
  return availableSlots;
}

// Función para generar horarios dinámicos para una estación específica
async function generateDynamicTimeSlotsForStation(date, stationName, existingBookings) {
  const slots = [];
  
  // Horario de 10:00 AM a 5:00 PM
  const startHour = 10;
  const endHour = 17;
  const endMinute = 0;
  
  // Generar slots cada 5 minutos
  for (let hour = startHour; hour <= endHour; hour++) {
    const maxMinute = (hour === endHour) ? endMinute : 55;
    
    for (let minute = 0; minute <= maxMinute; minute += 5) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(time);
    }
  }

  const availableSlots = [];
  
  for (const slot of slots) {
    const newBooking = {
      delivery_date: date,
      delivery_time: slot,
      metro_station: stationName
    };

    // Validar si este horario es posible usando la validación inteligente
    const validation = await validateBookingSchedule(newBooking, existingBookings);
    
    if (validation.valid) {
      availableSlots.push(slot);
    }
  }

  return availableSlots;
}

// Contador de uso diario de Google Maps API
let dailyMapsAPIUsage = 0;
let lastResetDate = new Date().toDateString();

// Límites de seguridad
const DAILY_MAPS_API_LIMIT = 150; // Límite diario conservador
const MONTHLY_LIMIT_WARNING = 1000; // Advertencia mensual

// Función para resetear contador diario
function resetDailyCounterIfNeeded() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    console.log(`🔄 Reseteando contador diario de Google Maps API. Uso anterior: ${dailyMapsAPIUsage} requests`);
    dailyMapsAPIUsage = 0;
    lastResetDate = today;
  }
}

// Función para verificar límites antes de usar Google Maps API
function checkMapsAPILimits() {
  resetDailyCounterIfNeeded();
  
  if (dailyMapsAPIUsage >= DAILY_MAPS_API_LIMIT) {
    console.log(`⚠️ LÍMITE DIARIO ALCANZADO: ${dailyMapsAPIUsage}/${DAILY_MAPS_API_LIMIT} requests`);
    return false;
  }
  
  return true;
}

// Función para incrementar contador de uso
function incrementMapsAPIUsage() {
  dailyMapsAPIUsage++;
  console.log(`📊 Google Maps API usage: ${dailyMapsAPIUsage}/${DAILY_MAPS_API_LIMIT} requests hoy`);
  
  // Advertencias
  if (dailyMapsAPIUsage >= DAILY_MAPS_API_LIMIT * 0.8) {
    console.log(`⚠️ ADVERTENCIA: 80% del límite diario usado (${dailyMapsAPIUsage}/${DAILY_MAPS_API_LIMIT})`);
  }
}

// Función para validar si es posible hacer una reserva considerando los tiempos de traslado en metro
async function validateBookingSchedule(newBooking, existingBookings) {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.log('⚠️ Google Maps API no configurada, usando validación básica de tiempo');
    // Fallback: validación básica de 20 minutos entre reservas
    const requestedTime = moment.tz(`${newBooking.delivery_date} ${newBooking.delivery_time}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City');
    
    for (const booking of existingBookings) {
      const bookingTime = moment.tz(`${newBooking.delivery_date} ${booking.delivery_time}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City');
      const timeDiff = Math.abs(requestedTime.diff(bookingTime, 'minutes'));
      
      if (timeDiff < 5) {
        return {
          valid: false,
          reason: 'Debe haber al menos 5 minutos entre entregas. Horario no disponible.'
        };
      }
    }
    return { valid: true };
  }

  try {
    // Ordenar todas las reservas del día por hora (incluyendo la nueva)
    const allBookings = [...existingBookings, newBooking].sort((a, b) => {
      const timeA = moment.tz(`${newBooking.delivery_date} ${a.delivery_time}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City');
      const timeB = moment.tz(`${newBooking.delivery_date} ${b.delivery_time}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City');
      return timeA.diff(timeB);
    });

    // Encontrar la posición de la nueva reserva
    const newBookingIndex = allBookings.findIndex(booking => 
      booking.delivery_time === newBooking.delivery_time && 
      booking.metro_station === newBooking.metro_station
    );

    // Validar tiempos de traslado hacia la reserva anterior y siguiente
    const validations = [];

    // Validar tiempo desde la reserva anterior
    if (newBookingIndex > 0) {
      const previousBooking = allBookings[newBookingIndex - 1];
      validations.push({
        from: previousBooking,
        to: newBooking,
        direction: 'from_previous'
      });
    }

    // Validar tiempo hacia la reserva siguiente
    if (newBookingIndex < allBookings.length - 1) {
      const nextBooking = allBookings[newBookingIndex + 1];
      validations.push({
        from: newBooking,
        to: nextBooking,
        direction: 'to_next'
      });
    }

    // Realizar validaciones de tiempo de traslado
    for (const validation of validations) {
      const { from, to, direction } = validation;

      // Si es la misma estación, solo necesitamos 5 minutos de separación
      if (from.metro_station === to.metro_station) {
        const fromTime = moment.tz(`${newBooking.delivery_date} ${from.delivery_time}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City');
        const toTime = moment.tz(`${newBooking.delivery_date} ${to.delivery_time}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City');
        const timeDiff = toTime.diff(fromTime, 'minutes');

        if (timeDiff < 5) {
          return {
            valid: false,
            reason: `Se necesitan al menos 5 minutos entre entregas en la misma estación (${from.metro_station}).`
          };
        }
        continue;
      }

      // Calcular tiempo de traslado usando Google Maps
      console.log(`🗺️ Calculando tiempo de traslado: ${from.metro_station} → ${to.metro_station}`);
      
      const transitInfo = await getTransitTime(from.metro_station, to.metro_station);
      
      if (!transitInfo) {
        console.log(`⚠️ No se pudo calcular ruta entre ${from.metro_station} y ${to.metro_station}, usando tiempo estimado`);
        // Fallback: asumir 30 minutos si no hay información
        const estimatedMinutes = 30;
        const fromTime = moment.tz(`${newBooking.delivery_date} ${from.delivery_time}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City');
        const toTime = moment.tz(`${newBooking.delivery_date} ${to.delivery_time}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City');
        const availableTime = toTime.diff(fromTime, 'minutes');

        if (availableTime < estimatedMinutes + 10) { // +10 minutos de buffer
          return {
            valid: false,
            reason: `Tiempo insuficiente para trasladarse de ${from.metro_station} a ${to.metro_station}. Se necesitan aproximadamente ${estimatedMinutes + 10} minutos, pero solo hay ${availableTime} minutos disponibles.`
          };
        }
        continue;
      }

      // Calcular tiempo disponible entre las dos reservas
      const fromTime = moment.tz(`${newBooking.delivery_date} ${from.delivery_time}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City');
      const toTime = moment.tz(`${newBooking.delivery_date} ${to.delivery_time}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City');
      const availableMinutes = toTime.diff(fromTime, 'minutes');

      // Tiempo necesario = tiempo de traslado + 10 minutos de entrega + 5 minutos de buffer
      const requiredMinutes = Math.ceil(transitInfo.duration / 60) + 15; // 10 entrega + 5 buffer

      console.log(`⏱️ Tiempo disponible: ${availableMinutes} min, Tiempo requerido: ${requiredMinutes} min (${transitInfo.durationText} + 15 min buffer)`);

      if (availableMinutes < requiredMinutes) {
        const stationFrom = from.metro_station.replace(', Ciudad de México, CDMX, México', '').replace(', Estado de México, México', '');
        const stationTo = to.metro_station.replace(', Ciudad de México, CDMX, México', '').replace(', Estado de México, México', '');
        
        return {
          valid: false,
          reason: `Tiempo insuficiente para trasladarse de ${stationFrom} a ${stationTo}. Se necesitan ${requiredMinutes} minutos (${transitInfo.durationText} en metro + buffer), pero solo hay ${availableMinutes} minutos disponibles.`
        };
      }
    }

    return { valid: true };

  } catch (error) {
    console.error('Error validando horario:', error);
    // En caso de error, usar validación básica
    const requestedTime = moment.tz(`${newBooking.delivery_date} ${newBooking.delivery_time}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City');
    
    for (const booking of existingBookings) {
      const bookingTime = moment.tz(`${newBooking.delivery_date} ${booking.delivery_time}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City');
      const timeDiff = Math.abs(requestedTime.diff(bookingTime, 'minutes'));
      
      if (timeDiff < 30) {
        return {
          valid: false,
          reason: 'Error al validar rutas. Se requieren al menos 30 minutos entre entregas por seguridad.'
        };
      }
    }
    return { valid: true };
  }
}

// Debug endpoint para verificar fechas
app.post('/api/debug/date', (req, res) => {
  const { delivery_date, delivery_time } = req.body;
  
  const nowCDMX = moment.tz('America/Mexico_City');
  const todayCDMX = nowCDMX.format('YYYY-MM-DD');
  const deliveryDateTime = moment.tz(`${delivery_date} ${delivery_time}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City');
  
  res.json({
    received: {
      delivery_date,
      delivery_time
    },
    server: {
      now_cdmx: nowCDMX.format('YYYY-MM-DD HH:mm:ss'),
      today_cdmx: todayCDMX,
      delivery_datetime: deliveryDateTime.format('YYYY-MM-DD HH:mm:ss'),
      is_same_day: delivery_date === todayCDMX,
      is_before_now: deliveryDateTime.isBefore(nowCDMX)
    }
  });
});

// Create a new booking
app.post('/api/bookings', async (req, res) => {
  const {
    customer_name,
    customer_phone,
    products,
    metro_station,
    delivery_date,
    delivery_time
  } = req.body;

  try {
    // Validate that the time is not today and not in the past
    const deliveryDateTime = moment.tz(`${delivery_date} ${delivery_time}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City');
    const nowCDMX = moment.tz('America/Mexico_City');
    const todayCDMX = nowCDMX.format('YYYY-MM-DD');

    // Permitir reservas para el mismo día si el horario no ha pasado

    if (deliveryDateTime.isBefore(nowCDMX)) {
      return res.status(400).json({
        error: 'No se pueden hacer reservas en horas que ya pasaron.'
      });
    }

    // Validar disponibilidad y tiempos de traslado usando Google Maps Directions API
    const existingBookings = await new Promise((resolve, reject) => {
      db.all('SELECT delivery_time, metro_station FROM bookings WHERE delivery_date = ?', [delivery_date], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Crear objeto de la nueva reserva para validación
    const newBooking = {
      delivery_date,
      delivery_time,
      metro_station
    };

    // Validar si es posible hacer la reserva considerando tiempos de traslado en metro
    console.log(`🚇 Validando reserva para ${metro_station} a las ${delivery_time}...`);
    const validation = await validateBookingSchedule(newBooking, existingBookings);
    
    if (!validation.valid) {
      console.log(`❌ Reserva rechazada: ${validation.reason}`);
      return res.status(400).json({
        error: validation.reason
      });
    }
    
    console.log(`✅ Reserva validada exitosamente para ${metro_station} a las ${delivery_time}`);

    // Validar número telefónico de 10 dígitos
    const phoneDigits = (customer_phone || '').replace(/\D/g, ''); // quitar espacios, guiones, etc.
    if (phoneDigits.length !== 10) {
      return res.status(400).json({ error: 'El número telefónico debe contener exactamente 10 dígitos.' });
    }

    // Validar que la fecha no sea fin de semana (sábado = 6, domingo = 0)
    const deliveryMoment = moment.tz(delivery_date, 'YYYY-MM-DD', 'America/Mexico_City');
    const dayOfWeek = deliveryMoment.day();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return res.status(400).json({ error: 'No se permiten reservaciones en fines de semana (sábado o domingo).' });
    }

    // Insert booking into database
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO bookings (customer_name, customer_phone, products, metro_station, delivery_date, delivery_time, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [customer_name, customer_phone, products, metro_station, delivery_date, delivery_time, 'pending'],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Create Google Calendar event
    if (googleCalendarConfigured) {
      try {
        console.log('📅 Intentando crear evento en Google Calendar...');
        
        const event = {
          summary: `[POR CONFIRMAR] Entrega: ${products} - ${metro_station}`,
          description: `Cliente: ${customer_name}\nTeléfono: ${customer_phone}\nProductos: ${products}\nEstación: ${metro_station}\nEstado: Por confirmar`,
          start: {
            dateTime: moment.tz(`${delivery_date} ${delivery_time}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City').format('YYYY-MM-DDTHH:mm:ss'),
            timeZone: 'America/Mexico_City',
          },
          end: {
            dateTime: moment.tz(`${delivery_date} ${delivery_time}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City').add(30, 'minutes').format('YYYY-MM-DDTHH:mm:ss'),
            timeZone: 'America/Mexico_City',
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 },
              { method: 'popup', minutes: 30 },
            ],
          },
        };

        console.log(' Creando evento con fecha:', delivery_date, 'hora:', delivery_time);

        const calendarResponse = await calendar.events.insert({
          calendarId: 'primary',
          resource: event,
        });

        console.log('✅ Evento creado en Google Calendar:', calendarResponse.data.id);
        console.log(' Link del evento:', calendarResponse.data.htmlLink);

        // Update booking with Google Calendar event ID
        db.run('UPDATE bookings SET google_calendar_event_id = ? WHERE id = ?', 
          [calendarResponse.data.id, result]);

        res.json({
          success: true,
          booking_id: result,
          calendar_event_id: calendarResponse.data.id,
          calendar_link: calendarResponse.data.htmlLink,
          message: 'Reserva creada exitosamente y agregada al calendario'
        });

      } catch (calendarError) {
        console.error('❌ Error creating calendar event:', calendarError.message);
        console.error('📋 Error details:', calendarError.response?.data || calendarError);
        res.json({
          success: true,
          booking_id: result,
          message: 'Reserva creada exitosamente (error al crear evento en calendario)'
        });
      }
    } else {
      // Si Google Calendar no está configurado, solo guardar en base de datos
      console.log('⚠️ Google Calendar no configurado, guardando solo en base de datos');
      res.json({
        success: true,
        booking_id: result,
        message: 'Reserva creada exitosamente (Google Calendar no configurado)'
      });
    }

  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Error al crear la reserva' });
  }
});

function adminAuth(req, res, next) {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
  const sentPassword = req.headers['x-admin-password'] || req.body.admin_password;
  if (sentPassword !== adminPassword) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
}

// Get all bookings
app.get('/api/bookings', adminAuth, (req, res) => {
  db.all('SELECT * FROM bookings ORDER BY delivery_date DESC, delivery_time DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get route optimization between two stations
app.get('/api/route/:origin/:destination', async (req, res) => {
  const { origin, destination } = req.params;
  
  try {
    const transitInfo = await getTransitTime(origin, destination);
    
    if (transitInfo) {
      res.json({
        origin,
        destination,
        transitTime: transitInfo
      });
    } else {
      res.status(404).json({ error: 'No se pudo calcular la ruta' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al calcular la ruta' });
  }
});

// Confirm a booking
app.post('/api/bookings/:id/confirm', adminAuth, async (req, res) => {
  const { id } = req.params;

  try {
    // Get booking details
    const booking = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM bookings WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!booking) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    // Update status in database
    await new Promise((resolve, reject) => {
      db.run('UPDATE bookings SET status = ? WHERE id = ?', ['confirmed', id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Update Google Calendar event if it exists
    if (booking.google_calendar_event_id && googleCalendarConfigured) {
      try {
        const event = {
          summary: `[CONFIRMADA] Entrega: ${booking.products} - ${booking.metro_station}`,
          description: `Cliente: ${booking.customer_name}\nTeléfono: ${booking.customer_phone}\nProductos: ${booking.products}\nEstación: ${booking.metro_station}\nEstado: Confirmada`,
          start: {
            dateTime: moment.tz(`${booking.delivery_date} ${booking.delivery_time}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City').format('YYYY-MM-DDTHH:mm:ss'),
            timeZone: 'America/Mexico_City',
          },
          end: {
            dateTime: moment.tz(`${booking.delivery_date} ${booking.delivery_time}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City').add(30, 'minutes').format('YYYY-MM-DDTHH:mm:ss'),
            timeZone: 'America/Mexico_City',
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 24 * 60 },
              { method: 'popup', minutes: 30 },
            ],
          },
        };

        await calendar.events.update({
          calendarId: 'primary',
          eventId: booking.google_calendar_event_id,
          resource: event,
        });

      } catch (calendarError) {
        console.error('Error updating calendar event:', calendarError);
        // Continue even if calendar update fails
      }
    }

    res.json({
      success: true,
      message: 'Reserva confirmada exitosamente'
    });

  } catch (error) {
    console.error('Error confirming booking:', error);
    res.status(500).json({ error: 'Error al confirmar la reserva' });
  }
});

// Cancel a booking
app.delete('/api/bookings/:id', adminAuth, async (req, res) => {
  const { id } = req.params;

  try {
    // Get booking details
    const booking = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM bookings WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!booking) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    // Delete Google Calendar event if it exists
    if (booking.google_calendar_event_id && googleCalendarConfigured) {
      try {
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: booking.google_calendar_event_id,
        });
      } catch (calendarError) {
        console.error('Error deleting calendar event:', calendarError);
        // Continuar aunque falle la eliminación en Google Calendar
      }
    }

    // Delete booking from database
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM bookings WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({ success: true, message: 'Reserva cancelada y eliminada correctamente' });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Error al cancelar la reserva' });
  }
});

// === Página de Política de Privacidad ===
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'privacy.html'));
});

// Serve React app
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Endpoint para monitorear uso de APIs (solo para admin)
app.get('/api/admin/api-usage', adminAuth, (req, res) => {
  resetDailyCounterIfNeeded();
  
  const usageStats = {
    googleMaps: {
      dailyUsage: dailyMapsAPIUsage,
      dailyLimit: DAILY_MAPS_API_LIMIT,
      percentageUsed: Math.round((dailyMapsAPIUsage / DAILY_MAPS_API_LIMIT) * 100),
      remainingRequests: DAILY_MAPS_API_LIMIT - dailyMapsAPIUsage,
      lastReset: lastResetDate,
      status: dailyMapsAPIUsage >= DAILY_MAPS_API_LIMIT ? 'LIMIT_REACHED' : 
              dailyMapsAPIUsage >= DAILY_MAPS_API_LIMIT * 0.8 ? 'WARNING' : 'OK'
    },
    googleCalendar: {
      status: 'FREE_TIER',
      note: 'Google Calendar API es gratuito sin límites de facturación'
    }
  };

  res.json({
    success: true,
    usage: usageStats,
    recommendations: {
      googleMaps: dailyMapsAPIUsage >= DAILY_MAPS_API_LIMIT * 0.8 ? 
        'Considera reducir validaciones o aumentar límite diario' : 
        'Uso normal, dentro de límites seguros'
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
}); 