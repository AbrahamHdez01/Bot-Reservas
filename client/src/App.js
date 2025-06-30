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
  const [cart, setCart] = useState({});
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
          fetch('/api/metro-stations'),
          fetch('/api/categories')
        ]);
        
        if (stationsResponse.ok) {
          const stationsData = await stationsResponse.json();
          
          if (stationsData.success && stationsData.stations) {
            // Convertir a formato para Select
            const stationOptions = stationsData.stations.map(station => ({
              value: station.name,
              label: `${station.name.replace(', Ciudad de México, CDMX, México', '').replace(', Estado de México, México', '')} (Línea ${station.line})`,
              name: station.name,
              line: station.line,
              available: station.available
            }));
            setStations(stationOptions);
            console.log(`✅ ${stationsData.total} estaciones disponibles cargadas`);
          }
        } else {
          console.error('Error al cargar estaciones');
          toast.error('Error al cargar las estaciones del metro');
        }
        
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        toast.error('Error al conectar con el servidor');
      }
    };
    
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      const fetchSlots = async () => {
        const dateStr = selectedDate.toISOString().split('T')[0];
        let slots;
        
        // Si hay estación seleccionada, usar validación inteligente
        if (selectedStation) {
          console.log(`🔍 Obteniendo horarios disponibles para ${selectedStation.name} el ${dateStr}...`);
          slots = await getAvailableSlots(dateStr, selectedStation.name);
        } else {
          // Si no hay estación, usar validación básica
          slots = await getAvailableSlots(dateStr);
        }
        
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
        
        if (selectedStation && availableSlots.length < slots.length) {
          const blockedSlots = slots.length - availableSlots.length;
          console.log(`⚠️ ${blockedSlots} horarios bloqueados por tiempos de traslado en metro`);
        }
      };
      
      fetchSlots();
    }
  }, [selectedDate, selectedStation]);

  const getAvailableSlots = async (date, station = null) => {
    try {
      let url = `/api/available-slots/${date}`;
      if (station) {
        // Codificar la estación para la URL
        url += `/${encodeURIComponent(station)}`;
      }
      
      const response = await fetch(url);
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
    
    if (!selectedDate || !selectedSlot || !selectedStation || Object.keys(cart).length === 0) {
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
          products: Object.values(cart).map(item => `${item.nombre} x${item.cantidad} (${item.categoria})`).join(', '),
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
        setCart({});
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
    if (!productsByCategory[category]) {
      fetchProductsByCategory(category);
    }
  };

  // Handle product selection
  const handleAddProduct = (category, product) => {
    setCart(prev => {
      const key = `${category}||${product}`;
      if (prev[key]) {
        // Si ya está, aumentar cantidad
        return { ...prev, [key]: { ...prev[key], cantidad: prev[key].cantidad + 1 } };
      } else {
        // Si no está, agregar con cantidad 1
        return { ...prev, [key]: { cantidad: 1, categoria: category, nombre: product } };
      }
    });
  };

  // Para cambiar cantidad
  const handleChangeCantidad = (key, cantidad) => {
    setCart(prev => ({ ...prev, [key]: { ...prev[key], cantidad: Math.max(1, cantidad) } }));
  };

  // Para eliminar producto del carrito
  const handleRemoveProduct = (key) => {
    setCart(prev => { const copy = { ...prev }; delete copy[key]; return copy; });
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
                          className="w-full"
                          classNamePrefix="rs"
                        />
                      </div>

                      {/* Products Multiselect */}
                      {selectedCategory && productsByCategory[selectedCategory] && (
                        <>
                          <div className="form-group">
                            <label>Selecciona los productos de {selectedCategory} *</label>
                            <Select
                              isMulti
                              options={productsByCategory[selectedCategory].map(product => ({
                                value: product,
                                label: product
                              }))}
                              value={[]}
                              onChange={options => {
                                if (options && options.length > 0) {
                                  const last = options[options.length - 1];
                                  handleAddProduct(selectedCategory, last.value);
                                }
                              }}
                              placeholder="Elige productos…"
                              className="w-full"
                              classNamePrefix="rs"
                            />
                          </div>
                          {/* Carrito debajo del selector */}
                          <div className="cart-section">
                            <h4>Carrito de productos</h4>
                            {Object.keys(cart).length === 0 ? (
                              <p>No hay productos en el carrito.</p>
                            ) : (
                              <ul className="cart-list">
                                {Object.entries(cart).map(([key, item]) => (
                                  <li key={key} className="cart-item">
                                    <span className="cart-product-name">{item.nombre} <span className="cart-product-cat">({item.categoria})</span></span>
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.cantidad}
                                      onChange={e => handleChangeCantidad(key, parseInt(e.target.value) || 1)}
                                      className="cart-qty-input"
                                    />
                                    <button onClick={() => handleRemoveProduct(key)} className="cart-remove-btn">Eliminar</button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </>
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
                            minDate={(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; })()}
                            filterDate={(date) => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              // Bloquear fechas pasadas Y fines de semana (sábado=6, domingo=0)
                              const dayOfWeek = date.getDay();
                              return date > today && dayOfWeek !== 0 && dayOfWeek !== 6;
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