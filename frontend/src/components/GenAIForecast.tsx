import React, { useState } from 'react';
import axios from 'axios';
import { AlertTriangle, CloudRain, Thermometer, Wind, Zap, Shield } from 'lucide-react';

interface GenAIForecastProps {
  latitude: number;
  longitude: number;
  month: number;
  day: number;
  locationName: string;
  analysisMode?: 'historical' | 'forecast';
  forecastDate?: string; // ISO date for forecast mode
}

interface GenAIForecastResult {
  summary: string;
  detailed_forecast: string;
  precautions: string[];
  confidence_level: string;
}

const GenAIForecast: React.FC<GenAIForecastProps> = ({ latitude, longitude, month, day, locationName, analysisMode = 'historical', forecastDate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecast, setForecast] = useState<GenAIForecastResult | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // If in forecast mode, call the ML forecast endpoint to get forecast_data and then call genai
      if (analysisMode === 'forecast' && forecastDate) {
        // 1) Fetch ML forecast data
        const forecastResp = await axios.post('http://localhost:5000/api/forecast', {
          latitude,
          longitude,
          date: forecastDate,
          days: 1
        });

        const forecastData = forecastResp.data.forecast ? forecastResp.data : { forecast: [] };

        // 2) Send both historical (month/day) and forecast data to genai endpoint
        const response = await axios.post('http://localhost:5000/api/genai-forecast', {
          latitude,
          longitude,
          month,
          day,
          forecast_data: forecastData
        });

        setForecast(response.data.genai_forecast);
      } else {
        // Historical-only mode
        const response = await axios.post('http://localhost:5000/api/genai-forecast', {
          latitude,
          longitude,
          month,
          day
        });

        setForecast(response.data.genai_forecast);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceBadgeClass = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high': return 'confidence-high';
      case 'medium': return 'confidence-medium';
      case 'low': return 'confidence-low';
      default: return 'confidence-default';
    }
  };

  return (
    <div className="genai-forecast-container">
      <div className="card">
        <h3 className="card-title">
          <Zap size={18} />
          AI-Powered Weather Insights
        </h3>
        
        {!forecast ? (
          <div className="genai-setup">
            <p className="text-sm mb-4">
              Get AI-generated weather predictions and personalized recommendations for {locationName} on {month}/{day}.
            </p>
            
            <form onSubmit={handleSubmit} className="genai-form">
              <button 
                type="submit" 
                className="primary-button"
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate AI Forecast'}
              </button>
            </form>
            
            {error && (
              <div className="error-message">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="genai-results">
            <div className="confidence-badge-container">
              <span className={`confidence-badge ${getConfidenceBadgeClass(forecast.confidence_level)}`}>
                {forecast.confidence_level.toUpperCase()} CONFIDENCE
              </span>
            </div>
            
            <div className="forecast-summary">
              <h4>Summary</h4>
              <p>{forecast.summary}</p>
            </div>
            
            <div className="forecast-details">
              <h4>Detailed Forecast</h4>
              <p>{forecast.detailed_forecast}</p>
            </div>
            
            <div className="forecast-precautions">
              <h4>
                <Shield size={16} />
                Recommended Precautions
              </h4>
              <ul>
                {forecast.precautions.map((precaution, index) => (
                  <li key={index}>{precaution}</li>
                ))}
              </ul>
            </div>
            
            <button 
              onClick={() => setForecast(null)} 
              className="secondary-button"
            >
              Generate New Forecast
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenAIForecast;