const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { google } = require('googleapis');
const axios = require('axios');
const moment = require('moment-timezone');
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
const db = new sqlite3.Database('./database.sqlite', (err) => {
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

    // Metro stations table
    db.run(`CREATE TABLE IF NOT EXISTS metro_stations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      line TEXT NOT NULL,
      latitude REAL,
      longitude REAL
    )`);

    // Insert default Metro CDMX stations
    const stations = [
      // Línea 1
      { name: 'Observatorio', line: '1', lat: 19.3975, lng: -99.2008 },
      { name: 'Tacubaya', line: '1', lat: 19.4025, lng: -99.1875 },
      { name: 'Juanacatlán', line: '1', lat: 19.4075, lng: -99.1750 },
      { name: 'Chapultepec', line: '1', lat: 19.4125, lng: -99.1875 },
      { name: 'Sevilla', line: '1', lat: 19.4175, lng: -99.1750 },
      { name: 'Insurgentes Sur', line: '1', lat: 19.4225, lng: -99.1625 },
      { name: 'Cuauhtémoc', line: '1', lat: 19.4275, lng: -99.1500 },
      { name: 'Balderas', line: '1', lat: 19.4325, lng: -99.1375 },
      { name: 'Salto del Agua', line: '1', lat: 19.4375, lng: -99.1250 },
      { name: 'Isabel la Católica', line: '1', lat: 19.4425, lng: -99.1125 },
      { name: 'Pino Suárez', line: '1', lat: 19.4475, lng: -99.1000 },
      { name: 'Merced', line: '1', lat: 19.4525, lng: -99.0875 },
      { name: 'Candelaria', line: '1', lat: 19.4575, lng: -99.0750 },
      { name: 'San Lázaro', line: '1', lat: 19.4625, lng: -99.0625 },
      { name: 'Moctezuma', line: '1', lat: 19.4675, lng: -99.0500 },
      { name: 'Balbuena', line: '1', lat: 19.4725, lng: -99.0375 },
      { name: 'Boulevard Puerto Aéreo', line: '1', lat: 19.4775, lng: -99.0250 },
      { name: 'Gómez Farías', line: '1', lat: 19.4825, lng: -99.0125 },
      { name: 'Zaragoza', line: '1', lat: 19.4875, lng: -99.0000 },
      { name: 'Pantitlán', line: '1', lat: 19.4925, lng: -98.9875 },
      
      // Línea 2
      { name: 'Cuatro Caminos', line: '2', lat: 19.4975, lng: -99.2008 },
      { name: 'Panteones', line: '2', lat: 19.5025, lng: -99.1875 },
      { name: 'Tacuba', line: '2', lat: 19.5075, lng: -99.1750 },
      { name: 'Cuitláhuac', line: '2', lat: 19.5125, lng: -99.1625 },
      { name: 'Popotla', line: '2', lat: 19.5175, lng: -99.1500 },
      { name: 'Colegio Militar', line: '2', lat: 19.5225, lng: -99.1375 },
      { name: 'Normal', line: '2', lat: 19.5275, lng: -99.1250 },
      { name: 'San Cosme', line: '2', lat: 19.5325, lng: -99.1125 },
      { name: 'Revolución', line: '2', lat: 19.5375, lng: -99.1000 },
      { name: 'Hidalgo', line: '2', lat: 19.5425, lng: -99.0875 },
      { name: 'Bellas Artes', line: '2', lat: 19.5475, lng: -99.0750 },
      { name: 'Allende', line: '2', lat: 19.5525, lng: -99.0625 },
      { name: 'Zócalo', line: '2', lat: 19.5575, lng: -99.0500 },
      { name: 'Pino Suárez', line: '2', lat: 19.4475, lng: -99.1000 },
      { name: 'San Antonio Abad', line: '2', lat: 19.5625, lng: -99.0375 },
      { name: 'Chabacano', line: '2', lat: 19.5675, lng: -99.0250 },
      { name: 'Viaducto', line: '2', lat: 19.5725, lng: -99.0125 },
      { name: 'Xola', line: '2', lat: 19.5775, lng: -99.0000 },
      { name: 'Villa de Cortés', line: '2', lat: 19.5825, lng: -98.9875 },
      { name: 'Nativitas', line: '2', lat: 19.5875, lng: -98.9750 },
      { name: 'Portales', line: '2', lat: 19.5925, lng: -98.9625 },
      { name: 'Ermita', line: '2', lat: 19.5975, lng: -98.9500 },
      { name: 'General Anaya', line: '2', lat: 19.6025, lng: -98.9375 },
      { name: 'Tasqueña', line: '2', lat: 19.6075, lng: -98.9250 }
    ];

    const insertStation = db.prepare('INSERT OR IGNORE INTO metro_stations (name, line, latitude, longitude) VALUES (?, ?, ?, ?)');
    stations.forEach(station => {
      insertStation.run(station.name, station.line, station.lat, station.lng);
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

  try {
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
    // En caso de error, devolver valores simulados
    return {
      duration: 1800, // 30 minutos en segundos
      durationText: '30 min',
      distance: 5000, // 5 km en metros
      distanceText: '5.0 km'
    };
  }
}

// API Routes

// Get all metro stations
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

// Get available time slots for a date
app.get('/api/available-slots/:date', (req, res) => {
  const { date } = req.params;
  
  // Bloquear fechas pasadas Y fines de semana (sábado=6, domingo=0)
  const dayOfWeek = moment.tz(date, 'YYYY-MM-DD', 'America/Mexico_City').day();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return res.json([]); // No hay horarios disponibles en fin de semana
  }

  // Generate time slots from 10 AM to 6 PM (18:00)
  const slots = [];
  for (let hour = 10; hour <= 17; hour++) { // Cambiar a <= 17 para incluir hasta 17:30
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(time);
    }
  }

  // Check existing bookings for this date
  db.all('SELECT delivery_time FROM bookings WHERE delivery_date = ?', [date], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const bookedTimes = rows.map(row => row.delivery_time);
    const availableSlots = slots.filter(slot => !bookedTimes.includes(slot));
    
    res.json(availableSlots);
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

    if (delivery_date === todayCDMX) {
      return res.status(400).json({
        error: 'No se puede reservar para el mismo día.'
      });
    }

    if (deliveryDateTime.isBefore(nowCDMX)) {
      return res.status(400).json({
        error: 'No se pueden hacer reservas en horas que ya pasaron.'
      });
    }

    // Validate minimum time between bookings (20 minutes)
    const existingBookings = await new Promise((resolve, reject) => {
      db.all('SELECT delivery_time FROM bookings WHERE delivery_date = ?', [delivery_date], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const requestedTime = moment.tz(`${delivery_date} ${delivery_time}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City');
    
    for (const booking of existingBookings) {
      const bookingTime = moment.tz(`${delivery_date} ${booking.delivery_time}`, 'YYYY-MM-DD HH:mm', 'America/Mexico_City');
      const timeDiff = Math.abs(requestedTime.diff(bookingTime, 'minutes'));
      
      if (timeDiff < 20) {
        return res.status(400).json({
          error: 'Debe haber al menos 20 minutos entre entregas. Horario no disponible.'
        });
      }
    }

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
}); 