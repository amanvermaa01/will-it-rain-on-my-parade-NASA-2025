#!/usr/bin/env python3
"""
Test script for NASA Weather Analyzer Backend
Tests the core functionality without running the Flask server
"""

import requests
import numpy as np
import pandas as pd
from datetime import datetime

def analyze_timeseries(timeseries, month, day):
    """Takes the full timeseries and analyzes data for a specific day of the year."""
    try:
        # Convert the NASA data (YYYYMMDD) into a pandas DataFrame for easy filtering
        dates = pd.to_datetime(list(timeseries.keys()), format='%Y%m%d')
        temps = list(timeseries.values())
        
        # Filter out any invalid temperatures (NASA uses -999 for missing data)
        valid_data = [(date, temp) for date, temp in zip(dates, temps) if temp != -999]
        
        if not valid_data:
            return None
            
        dates, temps = zip(*valid_data)
        df = pd.DataFrame({'temperature': temps}, index=dates)

        # Filter for the specific month and day across all years
        daily_data = df[(df.index.month == month) & (df.index.day == day)]
        
        if daily_data.empty or len(daily_data) < 5:  # Need at least 5 years of data
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
        print(f"Error analyzing timeseries: {str(e)}")
        return None

def test_nasa_api():
    """Test connection to NASA POWER API"""
    print("🛰️ Testing NASA POWER API Connection...")
    
    # Test parameters - New York City on July 15th
    latitude = 40.7128
    longitude = -74.0060
    month = 7
    day = 15
    
    POWER_API_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
    
    params = {
        "parameters": "T2M",  # Temperature only for testing
        "community": "RE",
        "longitude": longitude,
        "latitude": latitude,
        "start": "20100101",  # Use a longer range to ensure enough years for percentiles
        "end": "20231231",
        "format": "JSON"
    }
    
    try:
        print(f"📍 Testing location: {latitude}°N, {longitude}°W")
        print(f"📅 Testing date: {month:02d}/{day:02d}")
        print("🔄 Fetching data from NASA API...")
        
        response = requests.get(POWER_API_URL, params=params, timeout=30)
        response.raise_for_status()
        nasa_data = response.json()
        
        print("✅ NASA API connection successful!")
        
        # Extract temperature data
        temp_data = nasa_data.get("properties", {}).get("parameter", {}).get("T2M", {})
        
        if not temp_data:
            print("❌ No temperature data found")
            return False
            
        print(f"📊 Data points received: {len(temp_data)}")
        
        # Test analysis
        print("🔬 Testing weather analysis...")
        analysis = analyze_timeseries(temp_data, month, day)
        
        if analysis:
            print("✅ Analysis successful!")
            print("📈 Results:")
            print(f"   Average Temperature: {analysis['average_temp']}°C")
            print(f"   Very Hot Threshold (90th percentile): {analysis['very_hot_threshold']}°C")
            print(f"   Very Cold Threshold (10th percentile): {analysis['very_cold_threshold']}°C")
            print(f"   Data Period: {analysis['years_of_data']}")
            print(f"   Data Points: {analysis['data_points']}")
            print(f"   Very Hot Probability: {analysis['very_hot_probability']}%")
            print(f"   Very Cold Probability: {analysis['very_cold_probability']}%")
            return True
        else:
            print("❌ Analysis failed")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ NASA API request timed out")
        return False
    except requests.exceptions.RequestException as e:
        print(f"❌ NASA API request failed: {str(e)}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 NASA Weather Analyzer Backend Test")
    print("=" * 50)
    
    # Test dependencies
    print("🔍 Checking dependencies...")
    try:
        import numpy as np
        import pandas as pd
        import requests
        print("✅ All dependencies available")
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        exit(1)
    
    # Test NASA API
    success = test_nasa_api()
    
    if success:
        print("\n🎉 Backend test completed successfully!")
        print("🔧 The core functionality is working properly.")
        print("💡 You can now start the Flask server with: python app.py")
    else:
        print("\n❌ Backend test failed")
        print("🔧 Please check your internet connection and try again.")
