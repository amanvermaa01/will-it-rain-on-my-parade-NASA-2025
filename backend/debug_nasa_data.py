#!/usr/bin/env python3
"""
Debug script to inspect NASA API data structure
"""

import requests
import json

def inspect_nasa_data():
    """Inspect the structure of NASA POWER API data"""
    print("🔍 Inspecting NASA POWER API data structure...")
    
    # Test parameters - New York City on July 15th
    latitude = 40.7128
    longitude = -74.0060
    
    POWER_API_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
    
    params = {
        "parameters": "T2M",  # Temperature only
        "community": "RE",
        "longitude": longitude,
        "latitude": latitude,
        "start": "20230701",  # Just July 2023 for debugging
        "end": "20230731",
        "format": "JSON"
    }
    
    try:
        response = requests.get(POWER_API_URL, params=params, timeout=30)
        response.raise_for_status()
        nasa_data = response.json()
        
        print("✅ NASA API connection successful!")
        print(f"📊 Full response keys: {list(nasa_data.keys())}")
        
        if "properties" in nasa_data:
            props = nasa_data["properties"]
            print(f"📋 Properties keys: {list(props.keys())}")
            
            if "parameter" in props:
                params = props["parameter"]
                print(f"🌡️ Parameter keys: {list(params.keys())}")
                
                if "T2M" in params:
                    temp_data = params["T2M"]
                    print(f"📊 Temperature data type: {type(temp_data)}")
                    print(f"📊 Temperature data length: {len(temp_data)}")
                    print("📈 First 5 temperature records:")
                    for i, (date, temp) in enumerate(temp_data.items()):
                        if i < 5:
                            print(f"   {date}: {temp}°C")
                    print("...")
                else:
                    print("❌ No T2M data found")
            else:
                print("❌ No parameter data found")
        else:
            print("❌ No properties found")
            
        # Print full structure for debugging
        print("\n📄 Full response structure:")
        print(json.dumps(nasa_data, indent=2)[:1000] + "...")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    inspect_nasa_data()
