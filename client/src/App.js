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
  Phone, 
  Calendar,
  Train
} from 'lucide-react';
import "react-datepicker/dist/react-datepicker.css";
import './App.css';
import AdminPanel from './AdminPanel';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

function App() {
  const [stations, setStations] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedStation, setSelectedStation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [productsByCategory, setProductsByCategory] = useState({});
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: ''
  });
  const [loading, setLoading] = useState(false);

  const productOptions = [
    { value: 'perfume', label: 'Perfume' },
    { value: 'bolsa', label: 'Bolsa' },
    { value: 'body_mist', label: 'Body Mist' },
    { value: 'complemento', label: 'Complemento' }
  ];

  useEffect(() => {
    // Fetch stations and categories on component mount
    const fetchData = async () => {
      try {
        const [stationsResponse, categoriesResponse] = await Promise.all([
          fetch('/api/stations'),
          fetch('/api/categories')
        ]);
        
        if (stationsResponse.ok) {
          const stationsData = await stationsResponse.json();
          // Convertir a formato para Select
          const stationOptions = stationsData.map(station => ({
            value: station.name,
            label: `${station.name} (Línea ${station.line})`,
            name: station.name,
            line: station.line,
            coordinates: { lat: station.latitude, lng: station.longitude }
          }));
          setStations(stationOptions);
        }
        
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      const fetchSlots = async () => {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const slots = await getAvailableSlots(dateStr);
        
        // Filtrar horarios que ya pasaron si es hoy
        const now = new Date();
        const isToday = selectedDate.toDateString() === now.toDateString();
        
        let availableSlots = slots;
        if (isToday) {
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          availableSlots = slots.filter(slot => {
            const [hour, minute] = slot.split(':').map(Number);
            return hour > currentHour || (hour === currentHour && minute > currentMinute);
          });
        }
        
        setAvailableSlots(availableSlots);
      };
      
      fetchSlots();
    }
  }, [selectedDate]);

  const getAvailableSlots = async (date) => {
    try {
      const response = await fetch(`/api/available-slots/${date}`);
      if (response.ok) {
        const slots = await response.json();
        return slots;
      } else {
        // Fallback to generated slots if API fails
        return generateTimeSlots();
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
      // Fallback to generated slots
      return generateTimeSlots();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedSlot || !selectedStation || selectedProducts.length === 0) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          products: selectedProducts.join(', '), // Convertir array a string
          metro_station: selectedStation.name,
          delivery_date: selectedDate.toISOString().split('T')[0],
          delivery_time: selectedSlot
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('¡Reserva creada exitosamente!');
        
        // Reset form
        setSelectedDate(null);
        setSelectedSlot(null);
        setSelectedStation(null);
        setSelectedProducts([]);
        setSelectedCategory('');
        setFormData({
          customer_name: '',
          customer_phone: ''
        });
      } else {
        toast.error(result.error || 'Error al crear la reserva');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al crear la reserva');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate time slots from 10 AM to 6 PM
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 10; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const categoriesData = await response.json();
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch products by category
  const fetchProductsByCategory = async (category) => {
    try {
      const response = await fetch(`/api/products/${category}`);
      if (response.ok) {
        const products = await response.json();
        setProductsByCategory(prev => ({ ...prev, [category]: products }));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Handle category selection
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setSelectedProducts([]);
    if (!productsByCategory[category]) {
      fetchProductsByCategory(category);
    }
  };

  // Handle product selection
  const handleProductToggle = (product) => {
    setSelectedProducts(prev => {
      if (prev.includes(product)) {
        return prev.filter(p => p !== product);
      } else {
        return [...prev, product];
      }
    });
  };

  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/" element={
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
                <div className="admin-link">
                  <a href="/admin" className="admin-link-text">👨‍💼 Admin</a>
                </div>
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
                      
                      {/* Category Selection */}
                      <div className="form-group">
                        <label>Selecciona una categoría *</label>
                        <Select
                          options={categories.map(cat => ({ value: cat, label: cat }))}
                          value={selectedCategory ? { value: selectedCategory, label: selectedCategory } : null}
                          onChange={(option) => handleCategoryChange(option?.value)}
                          placeholder="Selecciona una categoría..."
                          className="react-select-container"
                          classNamePrefix="react-select"
                        />
                      </div>

                      {/* Products Selection */}
                      {selectedCategory && productsByCategory[selectedCategory] && (
                        <div className="form-group">
                          <label>Selecciona los productos de {selectedCategory} *</label>
                          <div className="products-grid">
                            {productsByCategory[selectedCategory].map((product) => (
                              <div
                                key={product}
                                className={`product-item ${selectedProducts.includes(product) ? 'selected' : ''}`}
                                onClick={() => handleProductToggle(product)}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedProducts.includes(product)}
                                  onChange={() => handleProductToggle(product)}
                                  className="product-checkbox"
                                />
                                <span className="product-name">{product}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Selected Products Summary */}
                      {selectedProducts.length > 0 && (
                        <div className="selected-products">
                          <h4>Productos seleccionados ({selectedProducts.length}):</h4>
                          <div className="selected-products-list">
                            {selectedProducts.map((product, index) => (
                              <span key={index} className="selected-product-tag">
                                {product}
                                <button
                                  type="button"
                                  onClick={() => handleProductToggle(product)}
                                  className="remove-product"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
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
                            minDate={new Date(Date.now() + 24 * 60 * 60 * 1000)} // Mañana
                            filterDate={(date) => {
                              // Solo permitir fechas futuras (no hoy)
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              return date > today;
                            }}
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
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Creando reserva...' : 'Crear Reserva'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App; 