import React, { useState, useEffect } from 'react';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import Select from 'react-select';
import { toast, Toaster } from 'react-hot-toast';
import { 
  MapPin, 
  Clock, 
  Package, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Train
} from 'lucide-react';
import "react-datepicker/dist/react-datepicker.css";
import './App.css';

function App() {
  const [stations, setStations] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState([]);

  const productOptions = [
    { value: 'perfume', label: 'Perfume' },
    { value: 'bolsa', label: 'Bolsa' },
    { value: 'body_mist', label: 'Body Mist' },
    { value: 'complemento', label: 'Complemento' }
  ];

  useEffect(() => {
    fetchStations();
    fetchBookings();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate]);

  const fetchStations = async () => {
    try {
      const response = await axios.get('/api/stations');
      const stationOptions = response.data.map(station => ({
        value: station.name,
        label: `${station.name} (Línea ${station.line})`,
        line: station.line,
        coordinates: { lat: station.latitude, lng: station.longitude }
      }));
      setStations(stationOptions);
    } catch (error) {
      toast.error('Error al cargar las estaciones');
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await axios.get(`/api/available-slots/${dateStr}`);
      setAvailableSlots(response.data);
    } catch (error) {
      toast.error('Error al cargar horarios disponibles');
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await axios.get('/api/bookings');
      setBookings(response.data);
    } catch (error) {
      toast.error('Error al cargar reservas');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedStation || !selectedSlot || selectedProducts.length === 0) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    if (!formData.customer_name || !formData.customer_email || !formData.customer_phone) {
      toast.error('Por favor completa tus datos de contacto');
      return;
    }

    setLoading(true);

    try {
      const bookingData = {
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        products: selectedProducts.map(p => p.label).join(', '),
        metro_station: selectedStation.value,
        delivery_date: selectedDate.toISOString().split('T')[0],
        delivery_time: selectedSlot
      };

      const response = await axios.post('/api/bookings', bookingData);
      
      if (response.data.success) {
        toast.success('¡Reserva creada exitosamente! Se ha agregado a tu calendario.');
        
        // Reset form
        setSelectedDate(new Date());
        setSelectedSlot(null);
        setSelectedStation(null);
        setSelectedProducts([]);
        setFormData({
          customer_name: '',
          customer_email: '',
          customer_phone: ''
        });
        
        // Refresh data
        fetchAvailableSlots();
        fetchBookings();
      }
    } catch (error) {
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Error al crear la reserva');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="app">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <Train className="logo-icon" />
            <h1>Metro CDMX Delivery</h1>
          </div>
          <p className="subtitle">Reserva tus entregas en el Metro de la Ciudad de México</p>
        </div>
      </header>

      <div className="container">
        <div className="main-content">
          {/* Booking Form */}
          <div className="booking-section">
            <h2>Nueva Reserva</h2>
            <form onSubmit={handleSubmit} className="booking-form">
              
              {/* Customer Information */}
              <div className="form-section">
                <h3><User className="section-icon" /> Información Personal</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nombre completo *</label>
                    <input
                      type="text"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                      placeholder="Tu nombre completo"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                      placeholder="tu@email.com"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Teléfono *</label>
                    <input
                      type="tel"
                      value={formData.customer_phone}
                      onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                      placeholder="55 1234 5678"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Products Selection */}
              <div className="form-section">
                <h3><Package className="section-icon" /> Productos</h3>
                <div className="form-group">
                  <label>Selecciona los productos *</label>
                  <Select
                    isMulti
                    options={productOptions}
                    value={selectedProducts}
                    onChange={setSelectedProducts}
                    placeholder="Selecciona los productos..."
                    className="react-select-container"
                    classNamePrefix="react-select"
                  />
                </div>
              </div>

              {/* Metro Station Selection */}
              <div className="form-section">
                <h3><MapPin className="section-icon" /> Estación de Metro</h3>
                <div className="form-group">
                  <label>Selecciona la estación *</label>
                  <Select
                    options={stations}
                    value={selectedStation}
                    onChange={setSelectedStation}
                    placeholder="Busca una estación..."
                    className="react-select-container"
                    classNamePrefix="react-select"
                    isSearchable
                  />
                </div>
              </div>

              {/* Date and Time Selection */}
              <div className="form-section">
                <h3><Calendar className="section-icon" /> Fecha y Hora</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Fecha de entrega *</label>
                    <DatePicker
                      selected={selectedDate}
                      onChange={setSelectedDate}
                      minDate={new Date()}
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Selecciona una fecha"
                      className="date-picker"
                    />
                  </div>
                  <div className="form-group">
                    <label>Hora de entrega *</label>
                    <Select
                      options={availableSlots.map(slot => ({ value: slot, label: slot }))}
                      value={selectedSlot ? { value: selectedSlot, label: selectedSlot } : null}
                      onChange={(option) => setSelectedSlot(option?.value)}
                      placeholder="Selecciona un horario"
                      className="react-select-container"
                      classNamePrefix="react-select"
                      isDisabled={!selectedDate}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                className="submit-btn"
                disabled={loading}
              >
                {loading ? 'Creando reserva...' : 'Crear Reserva'}
              </button>
            </form>
          </div>

          {/* Bookings List */}
          <div className="bookings-section">
            <h2>Mis Reservas</h2>
            <div className="bookings-list">
              {bookings.length === 0 ? (
                <div className="empty-state">
                  <AlertCircle className="empty-icon" />
                  <p>No tienes reservas aún</p>
                </div>
              ) : (
                bookings.map((booking) => (
                  <div key={booking.id} className="booking-card">
                    <div className="booking-header">
                      <CheckCircle className="booking-status-icon" />
                      <span className="booking-date">{formatDate(booking.delivery_date)}</span>
                      <span className="booking-time">{booking.delivery_time}</span>
                    </div>
                    <div className="booking-details">
                      <p><strong>Cliente:</strong> {booking.customer_name}</p>
                      <p><strong>Productos:</strong> {booking.products}</p>
                      <p><strong>Estación:</strong> {booking.metro_station}</p>
                      <p><strong>Contacto:</strong> {booking.customer_email} | {booking.customer_phone}</p>
                    </div>
                    {booking.google_calendar_event_id && (
                      <div className="calendar-badge">
                        <Calendar className="calendar-icon" />
                        Agregado al calendario
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 