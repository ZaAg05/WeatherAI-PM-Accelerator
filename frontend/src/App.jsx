import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [location, setLocation] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [videos, setVideos] = useState([]);

  // ⚠️ ATTENTION: Laissez 127.0.0.1 pour tester sur le PC. 
  // Remplacez par votre adresse IP (ex: 192.168.1.15) pour tester sur l'iPhone !
  const BACKEND_URL = 'http://192.168.1.103:8000';

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/records/`);
      setHistory(response.data.reverse()); // Les plus récents en premier
    } catch (err) {
      console.error("Erreur lors du chargement de l'historique", err);
    }
  };

  const processWeatherResponse = async (data) => {
    setWeatherData(data);
    
    // Chercher les vidéos YouTube en arrière-plan
    try {
      const videoResponse = await axios.get(`${BACKEND_URL}/videos/${data.location}`);
      setVideos(videoResponse.data);
    } catch (err) {
      console.error("Erreur YouTube", err);
      setVideos([]);
    }

    // Sauvegarde dans la base de données (CREATE)
    const today = new Date().toISOString().split('T')[0];
    await axios.post(`${BACKEND_URL}/records/`, {
      location: data.location,
      start_date: today,
      end_date: today,
      temperature: data.temperature,
      description: data.description
    });
    
    fetchHistory();
    setLocation('');
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setWeatherData(null);
    setVideos([]);
    
    try {
      const response = await axios.get(`${BACKEND_URL}/weather/${location}`);
      await processWeatherResponse(response.data);
    } catch (err) {
      setError("City not found. Please check the spelling.");
    }
  };

  const handleLocationSearch = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLoading(true);
    setError('');
    setWeatherData(null);
    setVideos([]);

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const response = await axios.get(`${BACKEND_URL}/weather/coords/?lat=${latitude}&lon=${longitude}`);
        await processWeatherResponse(response.data);
      } catch (err) {
        setError("Unable to fetch weather for your location.");
      } finally {
        setIsLoading(false);
      }
    }, () => {
      setError("Location access denied. Please allow location permissions.");
      setIsLoading(false);
    });
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${BACKEND_URL}/records/${id}`);
      fetchHistory();
    } catch (err) {
      console.error("Erreur de suppression", err);
    }
  };

  const handleExportCSV = () => {
    if (history.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID,Location,Temperature,Description,Date\n";
    
    history.forEach(row => {
      csvContent += `${row.id},${row.location},${row.temperature},${row.description},${row.start_date}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "weather_history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // NOUVEAU : Dégradé de couleurs dynamique selon la météo
  const getWeatherBackground = (iconCode) => {
    if (!iconCode) return 'rgba(255, 255, 255, 0.05)';
    
    const condition = iconCode.substring(0, 2);
    const isDay = iconCode.includes('d');

    switch (condition) {
      case '01': // Ciel clair (Soleil / Nuit claire)
        return isDay 
          ? 'linear-gradient(to bottom, #4A90E2, #87CEEB)' // Bleu ciel
          : 'linear-gradient(to bottom, #0F2027, #203A43)'; // Nuit sombre
      case '02': case '03': case '04': // Nuageux
        return isDay 
          ? 'linear-gradient(to bottom, #606c88, #3f4c6b)' // Gris bleuté
          : 'linear-gradient(to bottom, #2C3E50, #4CA1AF)'; // Nuit nuageuse
      case '09': case '10': case '11': // Pluie / Orage
        return 'linear-gradient(to bottom, #232526, #414345)'; // Gris sombre pluvieux
      case '13': // Neige
        return 'linear-gradient(to bottom, #E0EAFC, #CFDEF3)'; // Blanc bleuté
      case '50': // Brouillard
        return 'linear-gradient(to bottom, #757F9A, #D7DDE8)'; // Gris brouillard
      default:
        return 'rgba(255, 255, 255, 0.05)'; // Par défaut
    }
  };

  return (
    <div className="app-container">
      <header className="header glass-panel">
        <h1>☁️ WeatherAI</h1>
        <p>Technical Assessment for PM Accelerator • Built by <strong>Zakaria Agourram</strong></p>
      </header>

      <main className="main-content">
        {/* SECTION RECHERCHE */}
        <section className="search-section glass-panel">
          <h2>Check Current Weather</h2>
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Enter a city name..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>
          
          <div className="gps-container">
            <span>OR</span>
            <button onClick={handleLocationSearch} className="gps-btn" disabled={isLoading}>
              {isLoading ? "Locating..." : "📍 Use My Current Location"}
            </button>
          </div>

          {error && <div className="error-message">⚠️ {error}</div>}
        </section>

        {/* SECTION MÉTÉO MODIFIÉE */}
        {weatherData && (
          <section 
            className="weather-card glass-panel"
            style={{ 
              background: getWeatherBackground(weatherData.icon),
              border: 'none',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
            }}
          >
            <h2 style={{ color: 'white', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
              {weatherData.location}, {weatherData.country}
            </h2>
            <div className="weather-details">
              <img 
                src={`http://openweathermap.org/img/wn/${weatherData.icon}@4x.png`} 
                alt={weatherData.description} 
                className="weather-icon"
              />
              <span className="temp" style={{ color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
                {Math.round(weatherData.temperature)}°C
              </span>
              <span className="desc" style={{ color: 'white', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                {weatherData.description}
              </span>
            </div>
          </section>
        )}

        {/* SECTION YOUTUBE (Lecteurs intégrés) */}
        {videos.length > 0 && (
          <section className="videos-section glass-panel">
            <h2>Explore {weatherData.location}</h2>
            <div className="videos-grid" style={{ display: 'flex', gap: '15px', overflowX: 'auto', padding: '10px 0' }}>
              {videos.map((vid) => (
                <div key={vid.video_id} className="video-card" style={{ minWidth: '280px', flex: 1 }}>
                  <iframe 
                    width="100%" 
                    height="160" 
                    src={`https://www.youtube.com/embed/${vid.video_id}`} 
                    title={vid.title}
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    style={{ borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}
                  ></iframe>
                  <p style={{ fontSize: '0.85rem', marginTop: '8px', lineHeight: '1.2', color: '#e2e8f0' }}>{vid.title}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SECTION HISTORIQUE (CRUD) */}
        <section className="history-section glass-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
            <h2 style={{ margin: 0, borderBottom: 'none', paddingBottom: 0 }}>Recent Searches (CRUD)</h2>
            <button 
              onClick={handleExportCSV} 
              style={{ padding: '8px 15px', fontSize: '0.9rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              disabled={history.length === 0}
            >
              📥 Export CSV
            </button>
          </div>
          
          {history.length === 0 ? (
            <p style={{color: '#a0aec0', marginTop: '15px'}}>No history found.</p>
          ) : (
            <ul className="history-list" style={{ marginTop: '15px' }}>
              {history.map((record) => (
                <li key={record.id} className="history-item">
                  <div className="history-item-info">
                    <strong>{record.location}</strong> 
                    <span> • {Math.round(record.temperature)}°C • {record.description}</span>
                  </div>
                  <button onClick={() => handleDelete(record.id)} className="delete-btn">Delete</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="footer glass-panel">
        <h3>About Product Manager Accelerator</h3>
        <p>The Product Manager Accelerator Program is designed to support PM professionals through every stage of their career. From students looking for entry-level jobs to Directors looking to take on a leadership role, our program has helped over hundreds of students fulfill their career aspirations.</p>
      </footer>
    </div>
  );
}

export default App;