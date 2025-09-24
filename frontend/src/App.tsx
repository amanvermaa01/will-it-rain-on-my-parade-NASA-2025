import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import axios from 'axios';
import L from 'leaflet';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import 'leaflet/dist/leaflet.css';
import './App.css';

// Professional Icon Components using HTML symbols and SVG
const SunIcon = () => <span className="icon">☀</span>;
const MoonIcon = () => <span className="icon">☽</span>;
const SatelliteIcon = () => <span className="icon">◆</span>;
const LocationIcon = () => <span className="icon">●</span>;
const DateIcon = () => <span className="icon">▲</span>;
const AnalyticsIcon = () => <span className="icon">■</span>;
const ChartIcon = () => <span className="icon">▲</span>;
const ListIcon = () => <span className="icon">≡</span>;
const SearchIcon = () => <span className="icon">⚲</span>;
const WarningIcon = () => <span className="icon">⚠</span>;
const ThermometerIcon = () => <span className="icon">◀</span>;
const RaindropIcon = () => <span className="icon">▼</span>;
const WindIcon = () => <span className="icon">▶</span>;
const HotIcon = () => <span className="icon">▲</span>;
const WarmIcon = () => <span className="icon">☀</span>;
const CoolIcon = () => <span className="icon">▼</span>;
const ColdIcon = () => <span className="icon">❄</span>;
const RainIcon = () => <span className="icon">▼</span>;
const WindyIcon = () => <span className="icon">▶</span>;

// Fix for default marker icon issue with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface Position {
  lat: number;
  lng: number;
}

interface SearchResult {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

type Theme = 'light' | 'dark';
type ViewMode = 'cards' | 'charts';

interface ChartDataPoint {
  name: string;
  value: number;
  probability: number;
  threshold?: number;
}

interface WeatherAnalysis {
  temperature?: {
    very_cold_threshold: number;
    cold_threshold: number;
    hot_threshold: number;
    very_hot_threshold: number;
    average_temp: number;
    median_temp: number;
    min_temp: number;
    max_temp: number;
    data_points: number;
    unit: string;
    date_analyzed: string;
    years_of_data: string;
    very_hot_probability: number;
    hot_probability: number;
    cold_probability: number;
    very_cold_probability: number;
  };
  precipitation?: {
    average_precip: number;
    very_wet_threshold: number;
    wet_threshold: number;
    dry_days_percentage: number;
    very_wet_probability: number;
    unit: string;
    data_points: number;
  };
  wind?: {
    average_wind: number;
    very_windy_threshold: number;
    windy_threshold: number;
    very_windy_probability: number;
    unit: string;
    data_points: number;
  };
  metadata?: {
    location: { latitude: number; longitude: number };
    query_date: string;
    data_source: string;
    api_url: string;
    analysis_timestamp: string;
    methodology: string;
  };
}

// Theme Toggle Component
function ThemeToggle({ theme, onThemeChange }: { theme: Theme; onThemeChange: (theme: Theme) => void }) {
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    onThemeChange(newTheme);
  };

  return (
    <button 
      className="theme-toggle" 
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}

// Weather Charts Component
function WeatherCharts({ data }: { data: WeatherAnalysis }) {
  const temperatureData: ChartDataPoint[] = [];
  const precipitationData: ChartDataPoint[] = [];
  const windData: ChartDataPoint[] = [];
  
  // Prepare temperature data for charts
  if (data.temperature) {
    temperatureData.push(
      { name: 'Very Cold', value: data.temperature.very_cold_threshold, probability: data.temperature.very_cold_probability },
      { name: 'Cold', value: data.temperature.cold_threshold, probability: data.temperature.cold_probability },
      { name: 'Average', value: data.temperature.average_temp, probability: 50 },
      { name: 'Hot', value: data.temperature.hot_threshold, probability: data.temperature.hot_probability },
      { name: 'Very Hot', value: data.temperature.very_hot_threshold, probability: data.temperature.very_hot_probability }
    );
  }
  
  // Prepare precipitation data
  if (data.precipitation) {
    precipitationData.push(
      { name: 'Dry Days', value: data.precipitation.dry_days_percentage, probability: data.precipitation.dry_days_percentage },
      { name: 'Average', value: data.precipitation.average_precip, probability: 50 },
      { name: 'Very Wet', value: data.precipitation.very_wet_threshold, probability: data.precipitation.very_wet_probability }
    );
  }
  
  // Prepare wind data
  if (data.wind) {
    windData.push(
      { name: 'Calm', value: 0, probability: 30 },
      { name: 'Average', value: data.wind.average_wind, probability: 50 },
      { name: 'Windy', value: data.wind.windy_threshold, probability: 25 },
      { name: 'Very Windy', value: data.wind.very_windy_threshold, probability: data.wind.very_windy_probability }
    );
  }

  const chartColors = {
    temperature: '#000000',
    precipitation: '#333333',
    wind: '#666666'
  };

  return (
    <div className="weather-charts">
      <h2><AnalyticsIcon /> Interactive Weather Charts</h2>
      
      {data.temperature && (
        <div className="chart-section">
          <h3><ThermometerIcon /> Temperature Analysis</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={temperatureData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border-primary)" />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--theme-text-secondary)"
                  fontSize={12}
                />
                <YAxis 
                  stroke="var(--theme-text-secondary)"
                  fontSize={12}
                  label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--theme-bg-secondary)',
                    border: '1px solid var(--theme-border-primary)',
                    borderRadius: '8px',
                    color: 'var(--theme-text-primary)'
                  }}
                  formatter={(value: number, name: string) => [
                    `${value}°C (${temperatureData.find(d => d.value === value)?.probability}% probability)`,
                    name
                  ]}
                />
                <Bar dataKey="value" fill={chartColors.temperature} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {data.precipitation && (
        <div className="chart-section">
          <h3><RaindropIcon /> Precipitation Analysis</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={precipitationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border-primary)" />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--theme-text-secondary)"
                  fontSize={12}
                />
                <YAxis 
                  stroke="var(--theme-text-secondary)"
                  fontSize={12}
                  label={{ value: 'Precipitation (mm/day)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--theme-bg-secondary)',
                    border: '1px solid var(--theme-border-primary)',
                    borderRadius: '8px',
                    color: 'var(--theme-text-primary)'
                  }}
                  formatter={(value: number) => [`${value} mm/day`, 'Precipitation']}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={chartColors.precipitation}
                  strokeWidth={3}
                  dot={{ fill: chartColors.precipitation, strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {data.wind && (
        <div className="chart-section">
          <h3><WindIcon /> Wind Analysis</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={windData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border-primary)" />
                <XAxis 
                  dataKey="name" 
                  stroke="var(--theme-text-secondary)"
                  fontSize={12}
                />
                <YAxis 
                  stroke="var(--theme-text-secondary)"
                  fontSize={12}
                  label={{ value: 'Wind Speed (m/s)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--theme-bg-secondary)',
                    border: '1px solid var(--theme-border-primary)',
                    borderRadius: '8px',
                    color: 'var(--theme-text-primary)'
                  }}
                  formatter={(value: number, name: string) => [
                    `${value} m/s (${windData.find(d => d.value === value)?.probability}% probability)`,
                    name
                  ]}
                />
                <Bar dataKey="value" fill={chartColors.wind} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function LocationSearch({ onLocationSelect, mapRef }: { onLocationSelect: (pos: Position) => void; mapRef?: L.Map }) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);

  const searchLocations = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      // Using Nominatim (OpenStreetMap) geocoding service - free and no API key required
      const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: {
          q: query,
          format: 'json',
          limit: 5,
          addressdetails: 1,
        },
      });
      setSearchResults(response.data);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationSelect = (result: SearchResult) => {
    const position = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    };
    onLocationSelect(position);
    setSearchTerm(result.display_name.split(',')[0]); // Show just the main location name
    setShowResults(false);
    setSearchResults([]);
  };

  // Debounce search to avoid too many requests
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        searchLocations(searchTerm);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (e.target.value.length === 0) {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  return (
    <div className="location-search">
      <div className="search-input-container">
        <div className="search-input-wrapper">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search for a location (e.g., 'New York', 'Paris', 'Tokyo')..."
            value={searchTerm}
            onChange={handleInputChange}
            className="search-input"
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
          />
        </div>
        {isSearching && <div className="search-spinner">⏳</div>}
      </div>
      
      {showResults && searchResults.length > 0 && (
        <div className="search-results">
          {searchResults.map((result) => (
            <div
              key={result.place_id}
              className="search-result-item"
              onClick={() => handleLocationSelect(result)}
            >
              <div className="result-name">
                {result.display_name.split(',')[0]}
              </div>
              <div className="result-details">
                {result.display_name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LocationMarker({ position, setPosition, onMapReady }: { position: Position | null; setPosition: (pos: Position) => void; onMapReady?: (map: L.Map) => void }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  // Pass map reference to parent when ready
  useEffect(() => {
    if (onMapReady && map) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  return position === null ? null : <Marker position={position}></Marker>;
}

function ResultsDisplay({ data }: { data: WeatherAnalysis }) {
  return (
    <div className="results-container">
      <h2><SatelliteIcon /> Weather Analysis Results</h2>
      
      {data.metadata && (
        <div className="metadata">
          <p><LocationIcon /><strong>Location:</strong> {data.metadata.location.latitude.toFixed(4)}°N, {data.metadata.location.longitude.toFixed(4)}°E</p>
          <p><DateIcon /><strong>Date:</strong> {data.metadata.query_date} (Historical Analysis)</p>
          <p><AnalyticsIcon /><strong>Data Source:</strong> {data.metadata.data_source}</p>
        </div>
      )}

      {data.temperature && (
        <div className="weather-category">
          <h3><ThermometerIcon /> Temperature Analysis</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{data.temperature.average_temp}°C</div>
              <div className="stat-label">Average Temperature</div>
            </div>
            <div className="stat-card hot">
              <div className="stat-value">{data.temperature.very_hot_threshold}°C</div>
              <div className="stat-label"><HotIcon /> Very Hot Threshold</div>
              <div className="probability">{data.temperature.very_hot_probability}% chance</div>
            </div>
            <div className="stat-card warm">
              <div className="stat-value">{data.temperature.hot_threshold}°C</div>
              <div className="stat-label"><WarmIcon /> Hot Threshold</div>
              <div className="probability">{data.temperature.hot_probability}% chance</div>
            </div>
            <div className="stat-card cool">
              <div className="stat-value">{data.temperature.cold_threshold}°C</div>
              <div className="stat-label"><CoolIcon /> Cold Threshold</div>
              <div className="probability">{data.temperature.cold_probability}% chance</div>
            </div>
            <div className="stat-card cold">
              <div className="stat-value">{data.temperature.very_cold_threshold}°C</div>
              <div className="stat-label"><ColdIcon /> Very Cold Threshold</div>
              <div className="probability">{data.temperature.very_cold_probability}% chance</div>
            </div>
          </div>
          <div className="range-info">
            <p><strong>Historical Range:</strong> {data.temperature.min_temp}°C to {data.temperature.max_temp}°C</p>
            <p><strong>Data Period:</strong> {data.temperature.years_of_data} ({data.temperature.data_points} data points)</p>
          </div>
        </div>
      )}

      {data.precipitation && (
        <div className="weather-category">
          <h3><RaindropIcon /> Precipitation Analysis</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{data.precipitation.average_precip} mm</div>
              <div className="stat-label">Average Daily Precipitation</div>
            </div>
            <div className="stat-card wet">
              <div className="stat-value">{data.precipitation.very_wet_threshold} mm</div>
              <div className="stat-label"><RainIcon /> Very Wet Threshold</div>
              <div className="probability">{data.precipitation.very_wet_probability}% chance</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{data.precipitation.dry_days_percentage}%</div>
              <div className="stat-label"><WarmIcon /> Dry Days</div>
            </div>
          </div>
        </div>
      )}

      {data.wind && (
        <div className="weather-category">
          <h3><WindIcon /> Wind Analysis</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{data.wind.average_wind} m/s</div>
              <div className="stat-label">Average Wind Speed</div>
            </div>
            <div className="stat-card windy">
              <div className="stat-value">{data.wind.very_windy_threshold} m/s</div>
              <div className="stat-label"><WindyIcon /> Very Windy Threshold</div>
              <div className="probability">{data.wind.very_windy_probability}% chance</div>
            </div>
          </div>
        </div>
      )}

      <div className="methodology">
        <h4>📋 Methodology</h4>
        <p>This analysis uses NASA POWER satellite data to calculate historical weather patterns. 
           "Very hot/cold" conditions are defined as the 90th/10th percentile of historical temperatures 
           for this specific date. This means that historically, only 10% of years have been hotter/colder 
           than these thresholds on this date.</p>
      </div>
    </div>
  );
}

function App() {
  const [position, setPosition] = useState<Position | null>({ lat: 40.7128, lng: -74.0060 }); // Default to NYC
  const [date, setDate] = useState<string>('2025-07-15');
  const [results, setResults] = useState<WeatherAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [theme, setTheme] = useState<Theme>('light');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('nasa-weather-theme') as Theme;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = savedTheme || systemTheme;
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('nasa-weather-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const toggleViewMode = () => {
    setViewMode(prevMode => prevMode === 'cards' ? 'charts' : 'cards');
  };

  const handleLocationSelect = (newPosition: Position) => {
    setPosition(newPosition);
    // Fly to the selected location with appropriate zoom
    if (mapInstance) {
      mapInstance.flyTo(newPosition, Math.max(mapInstance.getZoom(), 8));
    }
  };

  const handleMapReady = (map: L.Map) => {
    setMapInstance(map);
  };

  const handleAnalysis = async () => {
    if (!position) {
      setError('Please select a location on the map');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    const selectedDate = new Date(date);
    const month = selectedDate.getMonth() + 1; // JS months are 0-indexed
    const day = selectedDate.getDate();

    try {
      const response = await axios.post('http://127.0.0.1:5000/api/analyze', {
        latitude: position.lat,
        longitude: position.lng,
        month: month,
        day: day,
      });
      setResults(response.data);
    } catch (err: any) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to get analysis. Please check your connection and try again.');
      }
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <div className="header-text">
            <h1><SatelliteIcon /> NASA Weather Likelihood Analyzer</h1>
            <p>Discover the probability of extreme weather conditions for any location and date</p>
          </div>
          <ThemeToggle theme={theme} onThemeChange={handleThemeChange} />
        </div>
      </header>
      
      <div className="main-content">
        <div className="input-section">
          <h2><LocationIcon /> Select Location & Date</h2>
          <p>Search for a location or click anywhere on the map to select a location, then choose your date of interest.</p>
          
          <LocationSearch onLocationSelect={handleLocationSelect} mapRef={mapInstance || undefined} />
          
          <div className="map-container">
            <MapContainer 
              center={position || { lat: 40.7128, lng: -74.0060 }} 
              zoom={4} 
              style={{ height: '400px', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <LocationMarker position={position} setPosition={setPosition} onMapReady={handleMapReady} />
            </MapContainer>
          </div>
          
          <div className="controls">
            <div className="input-group">
              <label htmlFor="date-input"><DateIcon /> Select Date:</label>
              <input 
                id="date-input"
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                min="2025-01-01"
                max="2025-12-31"
              />
            </div>
            
            {position && (
              <div className="location-info">
                <p><strong>Selected Location:</strong></p>
                <p>Latitude: {position.lat.toFixed(4)}°</p>
                <p>Longitude: {position.lng.toFixed(4)}°</p>
              </div>
            )}
            
            <button 
              className="analyze-button"
              onClick={handleAnalysis} 
              disabled={loading || !position}
            >
              {loading ? '🔄 Analyzing...' : '🚀 Analyze Weather Likelihood'}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="error-container">
            <h3><WarningIcon /> Error</h3>
            <p>{error}</p>
          </div>
        )}
        
        {results && (
          <div className="results-section">
            <div className="results-header">
              <button 
                className="view-toggle-button"
                onClick={toggleViewMode}
                aria-label={`Switch to ${viewMode === 'cards' ? 'chart' : 'card'} view`}
              >
                {viewMode === 'cards' ? (
                  <><ChartIcon /> Show Charts</>
                ) : (
                  <><ListIcon /> Show Cards</>
                )}
              </button>
            </div>
            
            {viewMode === 'cards' ? (
              <ResultsDisplay data={results} />
            ) : (
              <WeatherCharts data={results} />
            )}
          </div>
        )}
      </div>
      
      <footer className="app-footer">
        <div className="about-section">
          <h3>ℹ️ About This App</h3>
          <p>This application uses <strong>NASA POWER Project</strong> satellite data to analyze historical weather patterns 
             and provide probability estimates for extreme weather conditions. The analysis is based on 30+ years 
             of daily weather observations (1990-2023) for the exact location and date you specify.</p>
          <p><strong>Data Source:</strong> <a href="https://power.larc.nasa.gov/" target="_blank" rel="noopener noreferrer">NASA POWER Project</a></p>
          <p><strong>Methodology:</strong> Percentile-based statistical analysis of historical weather data</p>
          <p>⚠️ <em>Note: This provides historical likelihood, not weather forecasting.</em></p>
        </div>
      </footer>
    </div>
  );
}

export default App;
