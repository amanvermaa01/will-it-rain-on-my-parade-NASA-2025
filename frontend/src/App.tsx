import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import axios from 'axios';
import L from 'leaflet';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import 'leaflet/dist/leaflet.css';
import './App.css';

// Lucide React Icons
import {
  Sun,
  Moon,
  Satellite,
  MapPin,
  Calendar,
  BarChart3,
  TrendingUp,
  List,
  Search,
  AlertTriangle,
  Thermometer,
  CloudRain,
  Wind,
  Flame,
  CloudSnow,
  Clock,
  History,
  Zap,
  Eye,
  Loader2,
  X,
  ChevronRight,
  Activity
} from 'lucide-react';

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

interface RecentSearch {
  id: string;
  name: string;
  position: Position;
  timestamp: number;
}

interface ForecastDay {
  date: string;
  predicted_temperature: number;
  confidence_lower: number;
  confidence_upper: number;
  day_offset: number;
}

interface ForecastData {
  forecast: ForecastDay[];
  model_accuracy: {
    mean_absolute_error: number;
    training_data_points: number;
    training_period: string;
  };
  metadata: {
    location: { latitude: number; longitude: number };
    forecast_start_date: string;
    forecast_days: number;
    model_type: string;
    data_source: string;
    generated_timestamp: string;
    disclaimer: string;
  };
}

type Theme = 'light' | 'dark';
type ViewMode = 'cards' | 'charts';
type AnalysisMode = 'historical' | 'forecast';

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
      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
}

// Analysis Mode Toggle Component
function AnalysisModeToggle({ mode, onModeChange }: { mode: AnalysisMode; onModeChange: (mode: AnalysisMode) => void }) {

  return (
    <div className="analysis-mode-toggle">
      <button 
        className={`mode-button ${mode === 'historical' ? 'active' : ''}`}
        onClick={() => onModeChange('historical')}
        aria-label="Switch to historical analysis"
      >
        <History size={18} />
        Historical
      </button>
      <button 
        className={`mode-button ${mode === 'forecast' ? 'active' : ''}`}
        onClick={() => onModeChange('forecast')}
        aria-label="Switch to forecast mode"
      >
        <TrendingUp size={18} />
        Forecast
      </button>
    </div>
  );
}

// Recent Searches Component
function RecentSearches({ recentSearches, onLocationSelect, onClearSearches }: {
  recentSearches: RecentSearch[];
  onLocationSelect: (position: Position, name: string) => void;
  onClearSearches: () => void;
}) {
  if (recentSearches.length === 0) {
    return (
      <div className="recent-searches-card">
        <div className="recent-searches-header">
          <h3><Clock size={18} /> Recent Searches</h3>
        </div>
        <div className="no-recent-searches">
          <Search size={24} className="no-searches-icon" />
          <p>No recent searches yet</p>
          <span>Your last 5 searches will appear here</span>
        </div>
      </div>
    );
  }

  return (
    <div className="recent-searches-card">
      <div className="recent-searches-header">
        <h3><Clock size={18} /> Recent Searches</h3>
        <button 
          className="clear-searches-btn"
          onClick={onClearSearches}
          title="Clear all searches"
        >
          <X size={16} />
        </button>
      </div>
      <div className="recent-searches-list">
        {recentSearches.map((search) => (
          <div
            key={search.id}
            className="recent-search-item"
            onClick={() => onLocationSelect(search.position, search.name)}
          >
            <div className="recent-search-content">
              <div className="recent-search-name">
                <MapPin size={14} />
                {search.name}
              </div>
              <div className="recent-search-coords">
                {search.position.lat.toFixed(3)}°, {search.position.lng.toFixed(3)}°
              </div>
              <div className="recent-search-time">
                {new Date(search.timestamp).toLocaleDateString()}
              </div>
            </div>
            <ChevronRight size={16} className="recent-search-arrow" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Forecast Results Component
function ForecastResults({ data }: { data: ForecastData }) {
  return (
    <div className="forecast-container">
      <h2><TrendingUp size={24} /> Weather Forecast Results</h2>
      
      {data.metadata && (
        <div className="metadata">
          <p><MapPin size={16} /><strong>Location:</strong> {data.metadata.location.latitude.toFixed(4)}°N, {data.metadata.location.longitude.toFixed(4)}°E</p>
          <p><Calendar size={16} /><strong>Forecast Period:</strong> {data.metadata.forecast_days} days from {data.metadata.forecast_start_date}</p>
          <p><Activity size={16} /><strong>Model:</strong> {data.metadata.model_type}</p>
          <p><Zap size={16} /><strong>Accuracy:</strong> {data.model_accuracy.mean_absolute_error}°C MAE ({data.model_accuracy.training_data_points} training points)</p>
        </div>
      )}

      <div className="forecast-grid">
        {data.forecast.map((day, index) => (
          <div key={day.date} className={`forecast-day-card ${index === 0 ? 'today' : ''}`}>
            <div className="forecast-date">
              <Calendar size={16} />
              {new Date(day.date).toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}
              {index === 0 && <span className="today-badge">Today</span>}
            </div>
            <div className="forecast-temp">
              <Thermometer size={20} />
              <span className="temp-value">{day.predicted_temperature}°C</span>
            </div>
            <div className="forecast-range">
              <span className="temp-range">
                {day.confidence_lower}° - {day.confidence_upper}°C
              </span>
              <span className="confidence-label">Confidence Range</span>
            </div>
          </div>
        ))}
      </div>

      <div className="forecast-disclaimer">
        <AlertTriangle size={16} />
        <p>{data.metadata.disclaimer}</p>
      </div>
    </div>
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
      <h2><BarChart3 size={24} /> Interactive Weather Charts</h2>
      
      {data.temperature && (
        <div className="chart-section">
          <h3><Thermometer size={20} /> Temperature Analysis</h3>
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
          <h3><CloudRain size={20} /> Precipitation Analysis</h3>
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
          <h3><Wind size={20} /> Wind Analysis</h3>
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

function LocationSearch({ onLocationSelect, mapRef }: { onLocationSelect: (pos: Position, name?: string) => void; mapRef?: L.Map }) {
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
    const locationName = result.display_name.split(',')[0]; // Get main location name
    onLocationSelect(position, locationName);
    setSearchTerm(locationName);
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
          <Search size={18} className="search-input-icon" />
          <input
            type="text"
            placeholder="Search for a location (e.g., 'New York', 'Paris', 'Tokyo')..."
            value={searchTerm}
            onChange={handleInputChange}
            className="search-input"
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
          />
        </div>
        {isSearching && <div className="search-spinner"><Loader2 size={18} className="spinning" /></div>}
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
      <h2><Satellite size={24} /> Weather Analysis Results</h2>
      
      {data.metadata && (
        <div className="metadata">
          <p><MapPin size={16} /><strong>Location:</strong> {data.metadata.location.latitude.toFixed(4)}°N, {data.metadata.location.longitude.toFixed(4)}°E</p>
          <p><Calendar size={16} /><strong>Date:</strong> {data.metadata.query_date} (Historical Analysis)</p>
          <p><BarChart3 size={16} /><strong>Data Source:</strong> {data.metadata.data_source}</p>
        </div>
      )}

      {data.temperature && (
        <div className="weather-category">
          <h3><Thermometer size={20} /> Temperature Analysis</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{data.temperature.average_temp}°C</div>
              <div className="stat-label">Average Temperature</div>
            </div>
            <div className="stat-card hot">
              <div className="stat-value">{data.temperature.very_hot_threshold}°C</div>
              <div className="stat-label"><Flame size={16} /> Very Hot Threshold</div>
              <div className="probability">{data.temperature.very_hot_probability}% chance</div>
            </div>
            <div className="stat-card warm">
              <div className="stat-value">{data.temperature.hot_threshold}°C</div>
              <div className="stat-label"><Sun size={16} /> Hot Threshold</div>
              <div className="probability">{data.temperature.hot_probability}% chance</div>
            </div>
            <div className="stat-card cool">
              <div className="stat-value">{data.temperature.cold_threshold}°C</div>
              <div className="stat-label"><Wind size={16} /> Cold Threshold</div>
              <div className="probability">{data.temperature.cold_probability}% chance</div>
            </div>
            <div className="stat-card cold">
              <div className="stat-value">{data.temperature.very_cold_threshold}°C</div>
              <div className="stat-label"><CloudSnow size={16} /> Very Cold Threshold</div>
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
          <h3><CloudRain size={20} /> Precipitation Analysis</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{data.precipitation.average_precip} mm</div>
              <div className="stat-label">Average Daily Precipitation</div>
            </div>
            <div className="stat-card wet">
              <div className="stat-value">{data.precipitation.very_wet_threshold} mm</div>
              <div className="stat-label"><CloudRain size={16} /> Very Wet Threshold</div>
              <div className="probability">{data.precipitation.very_wet_probability}% chance</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{data.precipitation.dry_days_percentage}%</div>
              <div className="stat-label"><Sun size={16} /> Dry Days</div>
            </div>
          </div>
        </div>
      )}

      {data.wind && (
        <div className="weather-category">
          <h3><Wind size={20} /> Wind Analysis</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{data.wind.average_wind} m/s</div>
              <div className="stat-label">Average Wind Speed</div>
            </div>
            <div className="stat-card windy">
              <div className="stat-value">{data.wind.very_windy_threshold} m/s</div>
              <div className="stat-label"><Wind size={16} /> Very Windy Threshold</div>
              <div className="probability">{data.wind.very_windy_probability}% chance</div>
            </div>
          </div>
        </div>
      )}

      <div className="methodology">
        <h4><BarChart3 size={16} /> Methodology</h4>
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
  const [forecastResults, setForecastResults] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [theme, setTheme] = useState<Theme>('light');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('historical');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('nasa-weather-theme') as Theme;
    let systemTheme: Theme = 'light';
    
    // Safely check for matchMedia support
    if (typeof window !== 'undefined' && window.matchMedia) {
      try {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        systemTheme = mediaQuery && mediaQuery.matches ? 'dark' : 'light';
      } catch (error) {
        // Fallback to light theme if matchMedia fails
        systemTheme = 'light';
      }
    }
    
    const initialTheme = savedTheme || systemTheme;
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  // Initialize recent searches from localStorage
  useEffect(() => {
    const savedSearches = localStorage.getItem('nasa-weather-recent-searches');
    if (savedSearches) {
      try {
        const parsed = JSON.parse(savedSearches) as RecentSearch[];
        setRecentSearches(parsed);
      } catch (error) {
        console.error('Error parsing recent searches:', error);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearches = (searches: RecentSearch[]) => {
    localStorage.setItem('nasa-weather-recent-searches', JSON.stringify(searches));
  };

  // Add location to recent searches
  const addToRecentSearches = (position: Position, name: string) => {
    const newSearch: RecentSearch = {
      id: Date.now().toString(),
      name: name,
      position: position,
      timestamp: Date.now()
    };

    const updatedSearches = [
      newSearch,
      ...recentSearches.filter(search => 
        Math.abs(search.position.lat - position.lat) > 0.01 || 
        Math.abs(search.position.lng - position.lng) > 0.01
      )
    ].slice(0, 5); // Keep only the 5 most recent

    setRecentSearches(updatedSearches);
    saveRecentSearches(updatedSearches);
  };

  // Clear all recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('nasa-weather-recent-searches');
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('nasa-weather-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const toggleViewMode = () => {
    setViewMode(prevMode => prevMode === 'cards' ? 'charts' : 'cards');
  };

  const handleLocationSelect = (newPosition: Position, locationName?: string) => {
    setPosition(newPosition);
    // Add to recent searches if we have a name
    if (locationName) {
      addToRecentSearches(newPosition, locationName);
    }
    // Fly to the selected location with appropriate zoom
    if (mapInstance) {
      mapInstance.flyTo(newPosition, Math.max(mapInstance.getZoom(), 8));
    }
  };

  const handleRecentLocationSelect = (position: Position, name: string) => {
    setPosition(position);
    if (mapInstance) {
      mapInstance.flyTo(position, Math.max(mapInstance.getZoom(), 8));
    }
    // Move to top of recent searches
    addToRecentSearches(position, name);
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
    setForecastResults(null);

    try {
      if (analysisMode === 'historical') {
        const selectedDate = new Date(date);
        const month = selectedDate.getMonth() + 1; // JS months are 0-indexed
        const day = selectedDate.getDate();

        const response = await axios.post('http://127.0.0.1:5000/api/analyze', {
          latitude: position.lat,
          longitude: position.lng,
          month: month,
          day: day,
        });
        setResults(response.data);
      } else {
        // Forecast mode
        const response = await axios.post('http://127.0.0.1:5000/api/forecast', {
          latitude: position.lat,
          longitude: position.lng,
          date: date,
          days: 7 // Default 7 days forecast
        });
        setForecastResults(response.data);
      }
    } catch (err: any) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError(`Failed to get ${analysisMode} data. Please check your connection and try again.`);
      }
      console.error(`${analysisMode} analysis error:`, err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <div className="header-text">
            <h1><Satellite size={28} /> NASA Weather Analyzer</h1>
            <p>AI-powered weather analysis with historical data and ML forecasting</p>
          </div>
          <div className="header-controls">
            <ThemeToggle theme={theme} onThemeChange={handleThemeChange} />
          </div>
        </div>
      </header>
      
      <div className="main-layout">
        <div className="main-content">
          <div className="input-section">
            <div className="section-header">
              <h2><MapPin size={24} /> Location & Analysis</h2>
              <p>Search for a location or click on the map, then choose your analysis type and date.</p>
            </div>
            
            <AnalysisModeToggle mode={analysisMode} onModeChange={setAnalysisMode} />
            
            <LocationSearch 
              onLocationSelect={(pos, name) => handleLocationSelect(pos, name)} 
              mapRef={mapInstance || undefined} 
            />
            
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
                <label htmlFor="date-input">
                  <Calendar size={16} /> 
                  {analysisMode === 'historical' ? 'Analysis Date:' : 'Forecast Start Date:'}
                </label>
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
                {loading ? (
                  <><Loader2 size={18} className="spinning" /> Analyzing...</>
                ) : (
                  <>{analysisMode === 'historical' ? <History size={18} /> : <TrendingUp size={18} />} 
                  {analysisMode === 'historical' ? 'Analyze Historical Data' : 'Generate Forecast'}</>
                )}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="error-container">
              <h3><AlertTriangle size={20} /> Error</h3>
              <p>{error}</p>
            </div>
          )}
          
          {(results || forecastResults) && (
            <div className="results-section">
              {analysisMode === 'historical' && results && (
                <>
                  <div className="results-header">
                    <button 
                      className="view-toggle-button"
                      onClick={toggleViewMode}
                      aria-label={`Switch to ${viewMode === 'cards' ? 'chart' : 'card'} view`}
                    >
                      {viewMode === 'cards' ? (
                        <><BarChart3 size={16} /> Show Charts</>
                      ) : (
                        <><List size={16} /> Show Cards</>
                      )}
                    </button>
                  </div>
                  
                  {viewMode === 'cards' ? (
                    <ResultsDisplay data={results} />
                  ) : (
                    <WeatherCharts data={results} />
                  )}
                </>
              )}
              
              {analysisMode === 'forecast' && forecastResults && (
                <ForecastResults data={forecastResults} />
              )}
            </div>
          )}
        </div>
        
        <aside className="sidebar">
          <RecentSearches 
            recentSearches={recentSearches}
            onLocationSelect={handleRecentLocationSelect}
            onClearSearches={clearRecentSearches}
          />
        </aside>
      </div>
      
      <footer className="app-footer">
        <div className="about-section">
          <h3><Eye size={18} /> About This App</h3>
          <p>This application combines <strong>NASA POWER Project</strong> satellite data with machine learning 
             to provide both historical weather analysis and AI-powered forecasting. Historical analysis uses 
             30+ years of observations (1990-2023), while forecasts use trained ML models.</p>
          <p><strong>Data Source:</strong> <a href="https://power.larc.nasa.gov/" target="_blank" rel="noopener noreferrer">NASA POWER Project</a></p>
          <p><strong>Technologies:</strong> React, TypeScript, Python, scikit-learn, NASA APIs</p>
          <p><AlertTriangle size={14} /> <em>ML forecasts are experimental and not suitable for critical decisions.</em></p>
        </div>
      </footer>
    </div>
  );
}

export default App;
