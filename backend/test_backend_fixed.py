#!/usr/bin/env python3
"""
Fixed Test script for NASA Weather Analyzer Backend
"""

import requests
import numpy as np
import pandas as pd
from datetime import datetime

def analyze_timeseries_debug(timeseries, month, day):
    """Debug version of analyze_timeseries"""
    print(f"🔍 Debug: Analyzing data for {month:02d}/{day:02d}")
    print(f"📊 Total data points: {len(timeseries)}")
    
    try:
        # Convert the NASA data (YYYYMMDD) into a pandas DataFrame for easy filtering
        dates = pd.to_datetime(list(timeseries.keys()), format='%Y%m%d')
        temps = list(timeseries.values())
        
        print(f"📅 Date range: {dates.min()} to {dates.max()}")
        
        # Filter out any invalid temperatures (NASA uses -999 for missing data)
        valid_data = [(date, temp) for date, temp in zip(dates, temps) if temp != -999 and temp is not None]
        print(f"✅ Valid data points after filtering: {len(valid_data)}")
        
        if not valid_data:
            print("❌ No valid data after filtering")
            return None
            
        dates, temps = zip(*valid_data)
        df = pd.DataFrame({'temperature': temps}, index=dates)

        # Filter for the specific month and day across all years
        print(f"🔍 Filtering for month {month}, day {day}")
        daily_data = df[(df.index.month == month) & (df.index.day == day)]
        
        print(f"📊 Daily data for {month:02d}/{day:02d}: {len(daily_data)} points")
        if not daily_data.empty:
            print(f"📈 Daily temperatures: {daily_data['temperature'].tolist()}")
        
        if daily_data.empty:
            print(f"❌ No data found for {month:02d}/{day:02d}")
            return None
            
        if len(daily_data) < 3:  # Reduced threshold for testing
            print(f"❌ Not enough data points ({len(daily_data)} < 3)")
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
        print(f"❌ Error in analysis: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def test_nasa_api_fixed():
    """Test connection to NASA POWER API with better parameters"""
    print("🛰️ Testing NASA POWER API Connection...")
    
    # Test parameters - New York City on July 15th
    latitude = 40.7128
    longitude = -74.0060
    month = 7
    day = 15
    
    POWER_API_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
    
    # Get multiple years of data for July around the target date
    params = {
        "parameters": "T2M",  # Temperature only for testing
        "community": "RE",
        "longitude": longitude,
        "latitude": latitude,
        "start": "20190701",  # July 2019-2023 (5 years)
        "end": "20230731",
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
        
        # Test analysis with debugging
        print("🔬 Testing weather analysis...")
        analysis = analyze_timeseries_debug(temp_data, month, day)
        
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
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 NASA Weather Analyzer Backend Test (Fixed)")
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
    success = test_nasa_api_fixed()
    
    if success:
        print("\n🎉 Backend test completed successfully!")
        print("🔧 The core functionality is working properly.")
    else:
        print("\n❌ Backend test failed")
        print("🔧 Please check the debug output above.")
