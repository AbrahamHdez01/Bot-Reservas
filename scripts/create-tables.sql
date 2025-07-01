-- Crear tabla de reservas
CREATE TABLE IF NOT EXISTS reservas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  estacion VARCHAR(255) NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  productos JSONB NOT NULL,
  estado VARCHAR(50) DEFAULT 'pendiente',
  calendar_event_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_reservas_fecha ON reservas(fecha);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON reservas(estado);
CREATE INDEX IF NOT EXISTS idx_reservas_estacion ON reservas(estacion);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updated_at
CREATE TRIGGER update_reservas_updated_at 
    BEFORE UPDATE ON reservas 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insertar algunos datos de ejemplo (opcional)
INSERT INTO reservas (nombre, telefono, estacion, fecha, hora, productos, estado) VALUES
('Juan Pérez', '5551234567', 'Chabacano', '2024-01-15', '10:30:00', '[{"nombre": "Perfume A", "cantidad": 2, "precio": 150}]', 'pendiente'),
('María García', '5559876543', 'Constitución', '2024-01-16', '14:00:00', '[{"nombre": "Perfume B", "cantidad": 1, "precio": 200}]', 'completada')
ON CONFLICT DO NOTHING; 