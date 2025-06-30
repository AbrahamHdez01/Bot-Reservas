export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { origen, destino } = req.body;
  
  if (!origen || !destino) {
    return res.status(400).json({ error: 'Origen y destino son requeridos' });
  }

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origen)}&destination=${encodeURIComponent(destino)}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];
      const duration = leg.duration.value; // en segundos
      const minutes = Math.ceil(duration / 60);
      
      return res.status(200).json({
        minutos: minutes,
        texto: leg.duration.text,
        distancia: leg.distance.text
      });
    } else {
      return res.status(400).json({ 
        error: 'No se pudo calcular la ruta',
        status: data.status
      });
    }
  } catch (error) {
    console.error('Error en Directions API:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
} 