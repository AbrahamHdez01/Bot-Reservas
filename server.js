const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { google } = require('googleapis');
const axios = require('axios');
const moment = require('moment');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

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
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      products TEXT NOT NULL,
      metro_station TEXT NOT NULL,
      delivery_date TEXT NOT NULL,
      delivery_time TEXT NOT NULL,
      google_calendar_event_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

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

if (process.env.GOOGLE_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });
}

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Route optimization using Google Maps API
async function getTransitTime(origin, destination) {
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
    return null;
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

// Get available time slots for a date
app.get('/api/available-slots/:date', (req, res) => {
  const { date } = req.params;
  
  // Generate time slots from 9 AM to 8 PM
  const slots = [];
  for (let hour = 9; hour <= 20; hour++) {
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
    customer_email,
    customer_phone,
    products,
    metro_station,
    delivery_date,
    delivery_time
  } = req.body;

  try {
    // Validate minimum time between bookings (20 minutes)
    const existingBookings = await new Promise((resolve, reject) => {
      db.all('SELECT delivery_time FROM bookings WHERE delivery_date = ?', [delivery_date], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const requestedTime = moment(`${delivery_date} ${delivery_time}`, 'YYYY-MM-DD HH:mm');
    
    for (const booking of existingBookings) {
      const bookingTime = moment(`${delivery_date} ${booking.delivery_time}`, 'YYYY-MM-DD HH:mm');
      const timeDiff = Math.abs(requestedTime.diff(bookingTime, 'minutes'));
      
      if (timeDiff < 20) {
        return res.status(400).json({
          error: 'Debe haber al menos 20 minutos entre entregas. Horario no disponible.'
        });
      }
    }

    // Insert booking into database
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO bookings (customer_name, customer_email, customer_phone, products, metro_station, delivery_date, delivery_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [customer_name, customer_email, customer_phone, products, metro_station, delivery_date, delivery_time],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Create Google Calendar event
    try {
      const event = {
        summary: `Entrega: ${products} - ${metro_station}`,
        description: `Cliente: ${customer_name}\nEmail: ${customer_email}\nTeléfono: ${customer_phone}\nProductos: ${products}\nEstación: ${metro_station}`,
        start: {
          dateTime: moment(`${delivery_date} ${delivery_time}`).format(),
          timeZone: 'America/Mexico_City',
        },
        end: {
          dateTime: moment(`${delivery_date} ${delivery_time}`).add(30, 'minutes').format(),
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

      const calendarResponse = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      // Update booking with Google Calendar event ID
      db.run('UPDATE bookings SET google_calendar_event_id = ? WHERE id = ?', 
        [calendarResponse.data.id, result]);

      res.json({
        success: true,
        booking_id: result,
        calendar_event_id: calendarResponse.data.id,
        message: 'Reserva creada exitosamente y agregada al calendario'
      });

    } catch (calendarError) {
      console.error('Error creating calendar event:', calendarError);
      res.json({
        success: true,
        booking_id: result,
        message: 'Reserva creada exitosamente (error al crear evento en calendario)'
      });
    }

  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Error al crear la reserva' });
  }
});

// Get all bookings
app.get('/api/bookings', (req, res) => {
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

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
}); 