#!/usr/bin/env python3
"""
Simple Flask server for NASA Weather Analyzer (without CORS dependency)
This version works without external CORS library and includes manual CORS headers
"""

import requests
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from datetime import datetime, timedelta
import logging
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import joblib
import warnings
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

POWER_API_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"

# Manual CORS handling
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
    return response

def analyze_timeseries(timeseries, month, day):
    """Takes the full timeseries and analyzes data for a specific day of the year."""
    try:
        # Convert the NASA data (YYYYMMDD) into a pandas DataFrame for easy filtering
        dates = pd.to_datetime(list(timeseries.keys()), format='%Y%m%d')
        temps = list(timeseries.values())
        
        # Filter out any invalid temperatures (NASA uses -999 for missing data)
        valid_data = [(date, temp) for date, temp in zip(dates, temps) if temp != -999 and temp is not None]
        
        if not valid_data:
            return None
            
        dates, temps = zip(*valid_data)
        df = pd.DataFrame({'temperature': temps}, index=dates)

        # Filter for the specific month and day across all years
        daily_data = df[(df.index.month == month) & (df.index.day == day)]
        
        if daily_data.empty or len(daily_data) < 3:  # Need at least 3 years of data
            return None

        # Use NumPy to calculate percentiles for our thresholds
        all_temps = daily_data['temperature'].values
        
        analysis = {
            "very_cold_threshold": round(float(np.percentile(all_temps, 10)), 2),
            "cold_threshold": round(float(np.percentile(all_temps, 25)), 2),
            "hot_threshold": round(float(np.percentile(all_temps, 75)), 2),
            "very_hot_threshold": round(float(np.percentile(all_temps, 90)), 2),
            "average_temp": round(float(np.mean(all_temps)), 2),
            "median_temp": round(float(np.median(all_temps)), 2),
            "min_temp": round(float(np.min(all_temps)), 2),
            "max_temp": round(float(np.max(all_temps)), 2),
            "data_points": len(all_temps),
            "unit": "°C",
            "date_analyzed": f"{month:02d}/{day:02d}",
            "years_of_data": f"{df.index.year.min()}-{df.index.year.max()}"
        }
        
        # Calculate probabilities for different conditions
        very_hot_prob = (all_temps >= analysis["very_hot_threshold"]).mean() * 100
        hot_prob = (all_temps >= analysis["hot_threshold"]).mean() * 100
        cold_prob = (all_temps <= analysis["cold_threshold"]).mean() * 100
        very_cold_prob = (all_temps <= analysis["very_cold_threshold"]).mean() * 100
        
        analysis.update({
            "very_hot_probability": round(very_hot_prob, 1),
            "hot_probability": round(hot_prob, 1),
            "cold_probability": round(cold_prob, 1),
            "very_cold_probability": round(very_cold_prob, 1)
        })
        
        return analysis
        
    except Exception as e:
        logger.error(f"Error analyzing timeseries: {str(e)}")
        return None

def analyze_multiple_parameters(data_dict, month, day):
    """Analyze multiple weather parameters."""
    results = {}
    
    # Temperature analysis
    if 'T2M' in data_dict:
        temp_analysis = analyze_timeseries(data_dict['T2M'], month, day)
        if temp_analysis:
            results['temperature'] = temp_analysis
    
    # Precipitation analysis (if available)
    if 'PRECTOTCORR' in data_dict:
        precip_data = data_dict['PRECTOTCORR']
        try:
            dates = pd.to_datetime(list(precip_data.keys()), format='%Y%m%d')
            precip = [p if p != -999 else 0 for p in precip_data.values()]
            df = pd.DataFrame({'precipitation': precip}, index=dates)
            daily_precip = df[(df.index.month == month) & (df.index.day == day)]
            
            if not daily_precip.empty and len(daily_precip) >= 3:
                precip_values = daily_precip['precipitation'].values
                results['precipitation'] = {
                    "average_precip": round(float(np.mean(precip_values)), 2),
                    "very_wet_threshold": round(float(np.percentile(precip_values, 90)), 2),
                    "wet_threshold": round(float(np.percentile(precip_values, 75)), 2),
                    "dry_days_percentage": round((precip_values == 0).mean() * 100, 1),
                    "very_wet_probability": round((precip_values >= np.percentile(precip_values, 90)).mean() * 100, 1),
                    "unit": "mm/day",
                    "data_points": len(precip_values)
                }
        except Exception as e:
            logger.error(f"Error analyzing precipitation: {str(e)}")
    
    # Wind speed analysis (if available)
    if 'WS2M' in data_dict:
        wind_data = data_dict['WS2M']
        try:
            dates = pd.to_datetime(list(wind_data.keys()), format='%Y%m%d')
            wind_speeds = [w for w in wind_data.values() if w != -999]
            df = pd.DataFrame({'wind_speed': wind_speeds}, index=dates)
            daily_wind = df[(df.index.month == month) & (df.index.day == day)]
            
            if not daily_wind.empty and len(daily_wind) >= 3:
                wind_values = daily_wind['wind_speed'].values
                results['wind'] = {
                    "average_wind": round(float(np.mean(wind_values)), 2),
                    "very_windy_threshold": round(float(np.percentile(wind_values, 90)), 2),
                    "windy_threshold": round(float(np.percentile(wind_values, 75)), 2),
                    "very_windy_probability": round((wind_values >= np.percentile(wind_values, 90)).mean() * 100, 1),
                    "unit": "m/s",
                    "data_points": len(wind_values)
                }
        except Exception as e:
            logger.error(f"Error analyzing wind: {str(e)}")
    
    return results

def create_weather_features(dates, location_lat, location_lng):
    """Create features for ML model based on date and location."""
    features = []
    
    for date in dates:
        # Temporal features
        day_of_year = date.timetuple().tm_yday
        month = date.month
        day = date.day
        
        # Seasonal features (cyclical encoding)
        day_of_year_sin = np.sin(2 * np.pi * day_of_year / 365.25)
        day_of_year_cos = np.cos(2 * np.pi * day_of_year / 365.25)
        
        month_sin = np.sin(2 * np.pi * month / 12)
        month_cos = np.cos(2 * np.pi * month / 12)
        
        # Location features
        lat_normalized = location_lat / 90.0  # Normalize latitude
        lng_normalized = location_lng / 180.0  # Normalize longitude
        
        # Distance from equator (affects temperature patterns)
        distance_from_equator = abs(location_lat) / 90.0
        
        # Approximate distance from ocean (simplified)
        is_coastal = 1 if abs(location_lng) > 10 and abs(location_lat) < 60 else 0
        
        feature_row = [
            day_of_year_sin, day_of_year_cos,
            month_sin, month_cos,
            lat_normalized, lng_normalized,
            distance_from_equator, is_coastal,
            month, day  # Keep original for reference
        ]
        
        features.append(feature_row)
    
    return np.array(features)

def prepare_training_data(data_dict, location_lat, location_lng):
    """Prepare training data from historical weather data."""
    try:
        # Focus on temperature data for forecasting
        if 'T2M' not in data_dict:
            return None, None, None
            
        temp_data = data_dict['T2M']
        dates = []
        temperatures = []
        
        for date_str, temp in temp_data.items():
            if temp != -999:  # Valid data
                date_obj = datetime.strptime(date_str, '%Y%m%d')
                dates.append(date_obj)
                temperatures.append(temp)
        
        if len(dates) < 100:  # Need sufficient data
            return None, None, None
            
        # Create features
        features = create_weather_features(dates, location_lat, location_lng)
        targets = np.array(temperatures)
        
        return features, targets, dates
        
    except Exception as e:
        logger.error(f"Error preparing training data: {str(e)}")
        return None, None, None

def train_weather_model(features, targets):
    """Train a Random Forest model for weather forecasting."""
    try:
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            features, targets, test_size=0.2, random_state=42
        )
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train model
        model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
        
        model.fit(X_train_scaled, y_train)
        
        # Evaluate
        train_predictions = model.predict(X_train_scaled)
        test_predictions = model.predict(X_test_scaled)
        
        train_mae = mean_absolute_error(y_train, train_predictions)
        test_mae = mean_absolute_error(y_test, test_predictions)
        
        logger.info(f"Model trained - Train MAE: {train_mae:.2f}, Test MAE: {test_mae:.2f}")
        
        return model, scaler, test_mae
        
    except Exception as e:
        logger.error(f"Error training model: {str(e)}")
        return None, None, None

def generate_forecast(model, scaler, location_lat, location_lng, target_date, num_days=7):
    """Generate weather forecast for specified dates."""
    try:
        # Generate forecast dates
        forecast_dates = [target_date + timedelta(days=i) for i in range(num_days)]
        
        # Create features for forecast dates
        forecast_features = create_weather_features(forecast_dates, location_lat, location_lng)
        forecast_features_scaled = scaler.transform(forecast_features)
        
        # Make predictions
        predictions = model.predict(forecast_features_scaled)
        
        # Calculate confidence intervals (simplified)
        # In a real scenario, you'd use prediction intervals from the model
        prediction_std = np.std(predictions) * 0.5  # Simplified uncertainty
        
        forecast_results = []
        for i, (date, temp) in enumerate(zip(forecast_dates, predictions)):
            forecast_results.append({
                "date": date.strftime("%Y-%m-%d"),
                "predicted_temperature": round(float(temp), 2),
                "confidence_lower": round(float(temp - prediction_std), 2),
                "confidence_upper": round(float(temp + prediction_std), 2),
                "day_offset": i
            })
        
        return forecast_results
        
    except Exception as e:
        logger.error(f"Error generating forecast: {str(e)}")
        return None

@app.route('/api/analyze', methods=['POST', 'OPTIONS'])
def analyze_weather():
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"})
        
    try:
        data = request.get_json()
        
        # Validate input
        required_fields = ['latitude', 'longitude', 'month', 'day']
        if not all(k in data for k in required_fields):
            return jsonify({"error": "Missing required parameters: latitude, longitude, month, day"}), 400

        latitude = float(data['latitude'])
        longitude = float(data['longitude'])
        month = int(data['month'])
        day = int(data['day'])
        
        # Validate ranges
        if not (-90 <= latitude <= 90):
            return jsonify({"error": "Invalid latitude. Must be between -90 and 90"}), 400
        if not (-180 <= longitude <= 180):
            return jsonify({"error": "Invalid longitude. Must be between -180 and 180"}), 400
        if not (1 <= month <= 12):
            return jsonify({"error": "Invalid month. Must be between 1 and 12"}), 400
        if not (1 <= day <= 31):
            return jsonify({"error": "Invalid day. Must be between 1 and 31"}), 400

        # Parameters for NASA POWER API - Using multiple parameters but temperature is required
        parameters = ["T2M", "PRECTOTCORR", "WS2M"]  # Temperature, Precipitation, Wind Speed
        
        params = {
            "parameters": ",".join(parameters),
            "community": "RE",
            "longitude": longitude,
            "latitude": latitude,
            "start": "19950101",  # Start from 1995 for more data
            "end": "20231231",    # End at 2023
            "format": "JSON"
        }
        
        logger.info(f"Fetching NASA data for lat={latitude}, lon={longitude}, date={month:02d}/{day:02d}")
        
        # Fetch data from NASA POWER API
        response = requests.get(POWER_API_URL, params=params, timeout=30)
        response.raise_for_status()
        nasa_data = response.json()
        
        # Extract parameter data
        parameter_data = nasa_data.get("properties", {}).get("parameter", {})
        if not parameter_data:
            return jsonify({"error": "No data found for this location"}), 404

        # Analyze the data
        analysis_results = analyze_multiple_parameters(parameter_data, month, day)

        if not analysis_results:
            return jsonify({"error": f"Not enough data to analyze for {month:02d}/{day:02d} at this location"}), 404
        
        # Add metadata
        analysis_results['metadata'] = {
            "location": {"latitude": latitude, "longitude": longitude},
            "query_date": f"{month:02d}/{day:02d}",
            "data_source": "NASA POWER Project",
            "api_url": "https://power.larc.nasa.gov/",
            "analysis_timestamp": datetime.now().isoformat(),
            "methodology": "Percentile-based analysis of historical weather data"
        }
        
        return jsonify(analysis_results)
        
    except requests.exceptions.Timeout:
        return jsonify({"error": "Request timeout. NASA API may be slow. Please try again."}), 504
    except requests.exceptions.RequestException as e:
        logger.error(f"NASA API request failed: {str(e)}")
        return jsonify({"error": f"Failed to fetch data from NASA API"}), 502
    except ValueError as e:
        return jsonify({"error": f"Invalid input data: {str(e)}"}), 400
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return jsonify({"error": "An unexpected error occurred. Please try again."}), 500

@app.route('/api/forecast', methods=['POST', 'OPTIONS'])
def forecast_weather():
    # Handle preflight OPTIONS request
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"})
        
    try:
        data = request.get_json()
        
        # Validate input
        required_fields = ['latitude', 'longitude', 'date']
        if not all(k in data for k in required_fields):
            return jsonify({"error": "Missing required parameters: latitude, longitude, date"}), 400

        latitude = float(data['latitude'])
        longitude = float(data['longitude'])
        forecast_date = data['date']  # Expected format: YYYY-MM-DD
        num_days = int(data.get('days', 7))  # Default 7 days
        
        # Validate ranges
        if not (-90 <= latitude <= 90):
            return jsonify({"error": "Invalid latitude. Must be between -90 and 90"}), 400
        if not (-180 <= longitude <= 180):
            return jsonify({"error": "Invalid longitude. Must be between -180 and 180"}), 400
        if not (1 <= num_days <= 14):
            return jsonify({"error": "Invalid days. Must be between 1 and 14"}), 400

        # Parse target date
        try:
            target_date = datetime.strptime(forecast_date, '%Y-%m-%d')
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

        # Fetch historical data for training
        parameters = ["T2M", "PRECTOTCORR", "WS2M"]
        
        params = {
            "parameters": ",".join(parameters),
            "community": "RE",
            "longitude": longitude,
            "latitude": latitude,
            "start": "19950101",
            "end": "20231231",
            "format": "JSON"
        }
        
        logger.info(f"Training ML model for lat={latitude}, lon={longitude}, forecast from {forecast_date}")
        
        # Fetch data from NASA POWER API
        response = requests.get(POWER_API_URL, params=params, timeout=30)
        response.raise_for_status()
        nasa_data = response.json()
        
        # Extract parameter data
        parameter_data = nasa_data.get("properties", {}).get("parameter", {})
        if not parameter_data:
            return jsonify({"error": "No historical data found for this location"}), 404

        # Prepare training data
        features, targets, training_dates = prepare_training_data(parameter_data, latitude, longitude)
        if features is None:
            return jsonify({"error": "Insufficient data to train forecasting model"}), 404
        
        # Train model
        model, scaler, mae = train_weather_model(features, targets)
        if model is None:
            return jsonify({"error": "Failed to train forecasting model"}), 500
        
        # Generate forecast
        forecast_results = generate_forecast(model, scaler, latitude, longitude, target_date, num_days)
        if forecast_results is None:
            return jsonify({"error": "Failed to generate forecast"}), 500
        
        # Prepare response
        response_data = {
            "forecast": forecast_results,
            "model_accuracy": {
                "mean_absolute_error": round(float(mae), 2),
                "training_data_points": len(targets),
                "training_period": f"{min(training_dates).year}-{max(training_dates).year}"
            },
            "metadata": {
                "location": {"latitude": latitude, "longitude": longitude},
                "forecast_start_date": forecast_date,
                "forecast_days": num_days,
                "model_type": "Random Forest Regression",
                "data_source": "NASA POWER Project",
                "generated_timestamp": datetime.now().isoformat(),
                "disclaimer": "This is an ML-generated forecast based on historical patterns. Not suitable for critical decisions."
            }
        }
        
        return jsonify(response_data)
        
    except requests.exceptions.Timeout:
        return jsonify({"error": "Request timeout. NASA API may be slow. Please try again."}), 504
    except requests.exceptions.RequestException as e:
        logger.error(f"NASA API request failed: {str(e)}")
        return jsonify({"error": f"Failed to fetch data from NASA API"}), 502
    except ValueError as e:
        return jsonify({"error": f"Invalid input data: {str(e)}"}), 400
    except Exception as e:
        logger.error(f"Unexpected error in forecast: {str(e)}")
        return jsonify({"error": "An unexpected error occurred during forecasting. Please try again."}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "NASA Weather Analyzer API"})

@app.route('/', methods=['GET'])
def root():
    return jsonify({
        "message": "NASA Weather Likelihood Analyzer API",
        "version": "1.0.0",
        "endpoints": {
            "/api/analyze": "POST - Analyze weather likelihood for a location and date",
            "/api/forecast": "POST - Generate ML-based weather forecast for a location",
            "/api/health": "GET - Health check"
        }
    })

if __name__ == '__main__':
    print("🚀 Starting NASA Weather Analyzer API Server...")
    print("🔗 Server will be available at: http://127.0.0.1:5000")
    print("📊 API endpoint: http://127.0.0.1:5000/api/analyze")
    print("❤️ Health check: http://127.0.0.1:5000/api/health")
    app.run(debug=True, host='127.0.0.1', port=5000)
