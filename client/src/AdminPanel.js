import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast, Toaster } from 'react-hot-toast';
import { 
  CheckCircle, 
  Clock, 
  User, 
  Phone, 
  Package, 
  MapPin, 
  Calendar,
  LogOut,
  Shield
} from 'lucide-react';
import './App.css';

function AdminPanel() {
  const [password, setPassword] = useState(localStorage.getItem('adminPassword') || '');
  const [inputPassword, setInputPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(!!password);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (isAuthenticated) {
      fetchBookings();
    }
    // eslint-disable-next-line
  }, [isAuthenticated]);

  const fetchBookings = async () => {
    try {
      const res = await axios.get('/api/bookings', {
        headers: { 'x-admin-password': password }
      });
      setBookings(res.data);
    } catch (err) {
      setError('Contraseña incorrecta o sesión expirada.');
      setIsAuthenticated(false);
      localStorage.removeItem('adminPassword');
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    localStorage.setItem('adminPassword', inputPassword);
    setPassword(inputPassword);
    setIsAuthenticated(true);
    setInputPassword('');
    setError('');
  };

  const handleConfirm = async (id) => {
    setLoading(true);
    try {
      await axios.post(`/api/bookings/${id}/confirm`, {}, {
        headers: { 'x-admin-password': password }
      });
      toast.success('Reserva confirmada exitosamente');
      fetchBookings();
    } catch (err) {
      if (err.response?.status === 401) {
        setError('No autorizado. Vuelve a iniciar sesión.');
        setIsAuthenticated(false);
        localStorage.removeItem('adminPassword');
      } else {
        toast.error('Error al confirmar la reserva');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    setLoading(true);
    try {
      await axios.delete(`/api/bookings/${id}`, {
        headers: { 'x-admin-password': password }
      });
      toast.success('Reserva cancelada exitosamente');
      fetchBookings();
    } catch (err) {
      if (err.response?.status === 401) {
        setError('No autorizado. Vuelve a iniciar sesión.');
        setIsAuthenticated(false);
        localStorage.removeItem('adminPassword');
      } else {
        toast.error('Error al cancelar la reserva');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminPassword');
    setPassword('');
    setIsAuthenticated(false);
    setBookings([]);
    setError('');
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="app">
        <Toaster position="top-right" />
        <div className="container">
          <div className="admin-login-section">
            <div className="admin-login-card">
              <div className="admin-login-header">
                <Shield className="admin-icon" />
                <h2>Panel de Administración</h2>
                <p>Acceso restringido para administradores</p>
              </div>
              <form onSubmit={handleLogin} className="admin-login-form">
                <div className="form-group">
                  <label>Contraseña de administrador</label>
                  <input
                    type="password"
                    placeholder="Ingresa la contraseña"
                    value={inputPassword}
                    onChange={e => setInputPassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="admin-login-btn">
                  Entrar al Panel
                </button>
              </form>
              {error && <p className="error-message">{error}</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <Shield className="logo-icon" />
            <h1>Panel de Administración</h1>
          </div>
          <p className="subtitle">Gestión de reservas de Metro CDMX Delivery</p>
        </div>
      </header>

      <div className="container">
        <div className="admin-controls">
          <button onClick={handleLogout} className="logout-btn">
            <LogOut className="logout-icon" />
            Cerrar sesión
          </button>
        </div>

        <div className="admin-content">
          <div className="admin-stats">
            <div className="stat-card">
              <h3>Total de Reservas</h3>
              <span className="stat-number">{bookings.length}</span>
            </div>
            <div className="stat-card">
              <h3>Pendientes</h3>
              <span className="stat-number pending">{bookings.filter(b => b.status === 'pending').length}</span>
            </div>
            <div className="stat-card">
              <h3>Confirmadas</h3>
              <span className="stat-number confirmed">{bookings.filter(b => b.status === 'confirmed').length}</span>
            </div>
          </div>

          <div className="admin-filters">
            <button className={`filter-btn${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>Todas</button>
            <button className={`filter-btn${filter === 'pending' ? ' active' : ''}`} onClick={() => setFilter('pending')}>Pendientes</button>
            <button className={`filter-btn${filter === 'confirmed' ? ' active' : ''}`} onClick={() => setFilter('confirmed')}>Confirmadas</button>
          </div>

          <div className="bookings-admin-section">
            <h2>Gestión de Reservas</h2>
            <div className="bookings-admin-list">
              {bookings.length === 0 ? (
                <div className="empty-state">
                  <Clock className="empty-icon" />
                  <p>No hay reservas registradas</p>
                </div>
              ) : (
                bookings.filter(b => filter === 'all' ? true : b.status === filter).map((booking) => (
                  <div key={booking.id} className={`booking-admin-card ${booking.status}`}>
                    <div className="booking-admin-header">
                      <div className="booking-status">
                        {booking.status === 'confirmed' ? (
                          <CheckCircle className="status-icon confirmed" />
                        ) : (
                          <Clock className="status-icon pending" />
                        )}
                        <span className={`status-text ${booking.status}`}>
                          {booking.status === 'confirmed' ? 'Confirmada' : 'Por confirmar'}
                        </span>
                      </div>
                      <div className="booking-datetime">
                        <span className="booking-date">{formatDate(booking.delivery_date)}</span>
                        <span className="booking-time">{booking.delivery_time}</span>
                      </div>
                    </div>
                    
                    <div className="booking-admin-details">
                      <div className="detail-row">
                        <User className="detail-icon" />
                        <span><strong>Cliente:</strong> {booking.customer_name}</span>
                      </div>
                      <div className="detail-row">
                        <Phone className="detail-icon" />
                        <span><strong>Teléfono:</strong> {booking.customer_phone}</span>
                      </div>
                      <div className="detail-row">
                        <Package className="detail-icon" />
                        <span><strong>Productos:</strong> {booking.products}</span>
                      </div>
                      <div className="detail-row">
                        <MapPin className="detail-icon" />
                        <span><strong>Estación:</strong> {booking.metro_station}</span>
                      </div>
                      {booking.google_calendar_event_id && (
                        <div className="detail-row">
                          <Calendar className="detail-icon" />
                          <span className="calendar-badge">Agregado al calendario</span>
                        </div>
                      )}
                    </div>

                    {booking.status !== 'confirmed' && (
                      <div className="booking-actions">
                        <button 
                          onClick={() => handleConfirm(booking.id)}
                          className="confirm-btn"
                          disabled={loading}
                        >
                          {loading ? 'Confirmando...' : 'Confirmar Reserva'}
                        </button>
                        <button
                          onClick={() => handleCancel(booking.id)}
                          className="cancel-btn"
                          disabled={loading}
                        >
                          {loading ? 'Cancelando...' : 'Cancelar'}
                        </button>
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

export default AdminPanel; 