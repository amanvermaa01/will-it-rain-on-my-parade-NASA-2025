#!/usr/bin/env python3
"""
Test script to verify the running Flask API
"""

import requests
import json
import time

def test_health_endpoint():
    """Test the health check endpoint"""
    print("🩺 Testing health endpoint...")
    try:
        response = requests.get("http://127.0.0.1:5000/api/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health check passed!")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Health check failed with status: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server")
        print("   Make sure the backend server is running on http://127.0.0.1:5000")
        return False
    except Exception as e:
        print(f"❌ Health check error: {str(e)}")
        return False

def test_analyze_endpoint():
    """Test the analyze endpoint with real data"""
    print("🌡️ Testing analyze endpoint...")
    
    # Test data - New York City on July 15th
    test_data = {
        "latitude": 40.7128,
        "longitude": -74.0060,
        "month": 7,
        "day": 15
    }
    
    try:
        print(f"📡 Sending request: {test_data}")
        response = requests.post(
            "http://127.0.0.1:5000/api/analyze", 
            json=test_data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Analysis successful!")
            print("📊 Results:")
            
            # Display temperature data
            if 'temperature' in result:
                temp = result['temperature']
                print(f"   🌡️ Temperature Analysis:")
                print(f"      Average: {temp.get('average_temp')}°C")
                print(f"      Very Hot Threshold: {temp.get('very_hot_threshold')}°C")
                print(f"      Very Cold Threshold: {temp.get('very_cold_threshold')}°C")
                print(f"      Data Points: {temp.get('data_points')}")
                print(f"      Years: {temp.get('years_of_data')}")
                print(f"      Very Hot Probability: {temp.get('very_hot_probability')}%")
            
            # Display precipitation data if available
            if 'precipitation' in result:
                precip = result['precipitation']
                print(f"   🌧️ Precipitation Analysis:")
                print(f"      Average: {precip.get('average_precip')} mm/day")
                print(f"      Very Wet Threshold: {precip.get('very_wet_threshold')} mm")
                print(f"      Dry Days: {precip.get('dry_days_percentage')}%")
            
            # Display wind data if available
            if 'wind' in result:
                wind = result['wind']
                print(f"   💨 Wind Analysis:")
                print(f"      Average: {wind.get('average_wind')} m/s")
                print(f"      Very Windy Threshold: {wind.get('very_windy_threshold')} m/s")
            
            # Display metadata
            if 'metadata' in result:
                meta = result['metadata']
                print(f"   📋 Metadata:")
                print(f"      Data Source: {meta.get('data_source')}")
                print(f"      Location: {meta.get('location')}")
                print(f"      Query Date: {meta.get('query_date')}")
            
            return True
            
        else:
            print(f"❌ Analysis failed with status: {response.status_code}")
            try:
                error = response.json()
                print(f"   Error: {error.get('error', 'Unknown error')}")
            except:
                print(f"   Raw response: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out - NASA API might be slow")
        return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server")
        return False
    except Exception as e:
        print(f"❌ Analysis error: {str(e)}")
        return False

def test_error_handling():
    """Test error handling with invalid data"""
    print("🚫 Testing error handling...")
    
    # Test with invalid coordinates
    invalid_data = {
        "latitude": 999,  # Invalid latitude
        "longitude": -74.0060,
        "month": 7,
        "day": 15
    }
    
    try:
        response = requests.post(
            "http://127.0.0.1:5000/api/analyze", 
            json=invalid_data,
            timeout=10
        )
        
        if response.status_code == 400:
            print("✅ Error handling works correctly!")
            error = response.json()
            print(f"   Expected error: {error.get('error')}")
            return True
        else:
            print(f"❌ Expected 400 error, got: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error handling test failed: {str(e)}")
        return False

def run_all_tests():
    """Run all API tests"""
    print("🧪 NASA Weather Analyzer API Tests")
    print("=" * 40)
    print()
    
    # Give server time to start if just launched
    print("⏳ Waiting for server to be ready...")
    time.sleep(2)
    
    tests_passed = 0
    total_tests = 3
    
    # Test 1: Health check
    if test_health_endpoint():
        tests_passed += 1
    print()
    
    # Test 2: Main analyze functionality
    if test_analyze_endpoint():
        tests_passed += 1
    print()
    
    # Test 3: Error handling
    if test_error_handling():
        tests_passed += 1
    print()
    
    # Results
    print("📊 Test Results")
    print("-" * 20)
    print(f"Tests passed: {tests_passed}/{total_tests}")
    
    if tests_passed == total_tests:
        print("🎉 All tests passed! Backend is working correctly.")
        return True
    else:
        print("❌ Some tests failed. Check the output above.")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
