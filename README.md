# 🛰️ NASA Weather Likelihood Analyzer

A modern web application built for the **2025 NASA Space Apps Challenge** that enables users to analyze the probability of extreme weather conditions for any location and date using NASA's historical satellite data.

![NASA Weather Analyzer](https://img.shields.io/badge/NASA-Space%20Apps%202025-blue?style=for-the-badge&logo=nasa)
![React](https://img.shields.io/badge/React-18.2.0-blue?style=for-the-badge&logo=react)
![Flask](https://img.shields.io/badge/Flask-2.3.3-green?style=for-the-badge&logo=flask)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9.5-blue?style=for-the-badge&logo=typescript)

## 🌟 Features

- **Interactive Map Selection**: Click anywhere on the world map to select your location of interest
- **Historical Weather Analysis**: Analyze 30+ years of NASA satellite data (1990-2023)
- **Multi-Parameter Analysis**: Temperature, precipitation, and wind speed analysis
- **Probability Calculations**: Get likelihood percentages for extreme weather conditions
- **Beautiful Visualizations**: Modern, responsive UI with statistical cards and charts
- **Real-time Data**: Direct integration with NASA POWER Project API
- **Mobile Responsive**: Works seamlessly on all devices

## 🎯 Challenge Overview

This application addresses the NASA Space Apps Challenge by creating a personalized interface that enables users to query the likelihood of adverse weather conditions ("very hot," "very cold," "very windy," "very wet") for specific locations and times. The tool helps users make informed decisions about outdoor activities by providing historical weather likelihood rather than forecasts.

## 🚀 Quick Start

### Prerequisites

Make sure you have the following installed:
- **Python 3.8+** 
- **Node.js 16+** 
- **npm** or **yarn**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/nasa-weather-analyzer.git
   cd nasa-weather-analyzer
   ```

2. **Set up the Backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Set up the Frontend**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

1. **Start the Backend Server**
   ```bash
   cd backend
   python app.py
   ```
   The Flask server will start on `http://127.0.0.1:5000`

2. **Start the Frontend (New Terminal)**
   ```bash
   cd frontend
   npm start
   ```
   The React app will open in your browser at `http://localhost:3000`

## 🛠️ Architecture

### Backend (Flask + Python)
- **NASA POWER API Integration**: Direct connection to NASA's satellite data
- **Statistical Analysis**: Percentile-based weather condition analysis
- **Multi-parameter Support**: Temperature, precipitation, and wind analysis
- **Error Handling**: Comprehensive validation and error responses
- **CORS Enabled**: Cross-origin requests support

### Frontend (React + TypeScript)
- **Interactive Map**: Leaflet.js integration for location selection
- **Modern UI**: Responsive design with CSS Grid and Flexbox
- **Real-time Updates**: Axios for API communication
- **Type Safety**: Full TypeScript implementation
- **Mobile First**: Responsive across all device sizes

## 📊 Data Analysis Methodology

Our application uses NASA POWER Project data with the following methodology:

1. **Data Collection**: Historical daily weather data from 1990-2023
2. **Percentile Analysis**: 
   - Very Hot/Cold: 90th/10th percentile thresholds
   - Hot/Cold: 75th/25th percentile thresholds
3. **Probability Calculation**: Percentage of historical occurrences above/below thresholds
4. **Statistical Validation**: Minimum 5 years of data required for analysis

### Weather Parameters Analyzed

| Parameter | Unit | Description |
|-----------|------|-------------|
| Temperature (T2M) | °C | 2-meter air temperature |
| Precipitation (PRECTOTCORR) | mm/day | Bias-corrected precipitation |
| Wind Speed (WS2M) | m/s | 2-meter wind speed |

## 🎨 User Interface

### Main Features
- **Location Selection**: Click-to-select on interactive world map
- **Date Picker**: Choose any date for historical analysis
- **Results Dashboard**: Statistical cards showing:
  - Average conditions
  - Extreme weather thresholds
  - Probability percentages
  - Historical data ranges

### Visual Design
- **Modern Glass-morphism**: Semi-transparent cards with blur effects
- **Gradient Backgrounds**: Beautiful color transitions
- **Responsive Grid**: Adaptive layout for all screen sizes
- **Interactive Elements**: Hover effects and smooth transitions
- **Accessible Colors**: High contrast for readability

## 📡 API Documentation

### Analyze Weather Endpoint
```
POST /api/analyze
```

**Request Body:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "month": 7,
  "day": 15
}
```

**Response:**
```json
{
  "temperature": {
    "average_temp": 25.3,
    "very_hot_threshold": 32.1,
    "very_hot_probability": 10.0,
    "unit": "°C"
  },
  "precipitation": {
    "average_precip": 3.2,
    "very_wet_threshold": 15.7,
    "very_wet_probability": 10.0,
    "unit": "mm/day"
  },
  "wind": {
    "average_wind": 4.1,
    "very_windy_threshold": 8.9,
    "very_windy_probability": 10.0,
    "unit": "m/s"
  },
  "metadata": {
    "data_source": "NASA POWER Project",
    "methodology": "Percentile-based analysis"
  }
}
```

## 🔧 Configuration

### Environment Variables (Optional)
Create a `.env` file in the backend directory:
```env
FLASK_ENV=development
FLASK_DEBUG=True
NASA_API_TIMEOUT=30
```

### Customization Options
- **Map Center**: Modify default coordinates in `App.tsx`
- **Date Range**: Adjust min/max dates in the date picker
- **Styling**: Customize colors and themes in `App.css`
- **API Timeout**: Configure request timeout in backend

## 🧪 Testing

### Backend Testing
```bash
cd backend
python -m pytest tests/
```

### Frontend Testing
```bash
cd frontend
npm test
```

### Manual Testing Checklist
- [ ] Map interaction works
- [ ] Date picker functions
- [ ] API calls successful
- [ ] Error handling works
- [ ] Responsive design
- [ ] Loading states display

## 📱 Browser Compatibility

| Browser | Minimum Version | Status |
|---------|----------------|--------|
| Chrome | 88+ | ✅ Fully Supported |
| Firefox | 85+ | ✅ Fully Supported |
| Safari | 14+ | ✅ Fully Supported |
| Edge | 88+ | ✅ Fully Supported |

## 🤝 Contributing

We welcome contributions to improve this NASA Space Apps Challenge project!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **NASA POWER Project** for providing comprehensive satellite data
- **NASA Space Apps Challenge** for the inspiring challenge
- **OpenStreetMap** contributors for map tiles
- **Leaflet.js** community for the mapping library
- **React** and **Flask** communities for excellent frameworks

## 📞 Support

For support and questions:
- Create an [Issue](https://github.com/yourusername/nasa-weather-analyzer/issues)
- Email: your.email@example.com
- NASA Space Apps Challenge Team: [Team Name]

## 🎉 Demo

Try the live application: [NASA Weather Analyzer Demo](https://your-demo-url.com)

---

**Built with ❤️ for the 2025 NASA Space Apps Challenge**

*This application provides historical weather likelihood analysis and is not intended for weather forecasting or critical decision-making.*
