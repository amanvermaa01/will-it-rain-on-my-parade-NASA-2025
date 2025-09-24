#!/usr/bin/env python3
"""
Simple Flask server for NASA Weather Analyzer (without CORS dependency)
This version works without external CORS library and includes manual CORS headers
"""

import requests
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from datetime import datetime
import logging

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
            "/api/health": "GET - Health check"
        }
    })

if __name__ == '__main__':
    print("🚀 Starting NASA Weather Analyzer API Server...")
    print("🔗 Server will be available at: http://127.0.0.1:5000")
    print("📊 API endpoint: http://127.0.0.1:5000/api/analyze")
    print("❤️ Health check: http://127.0.0.1:5000/api/health")
    app.run(debug=True, host='127.0.0.1', port=5000)
