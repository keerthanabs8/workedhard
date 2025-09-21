const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const app = express();
const port = process.env.PORT || 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
app.use(express.json());
app.use(cors());
app.use(express.static('public', {
  setHeaders: function (res, path) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/api/prices', async (req, res) => {
  const URL = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=579b464db66ec23bdd000001d8d182aef881492c579c9caa58ecd904&format=json&offset=0&limit=100";
  try {
    console.log('Fetching prices from data.gov...');
    const response = await axios.get(URL);
    console.log(`Fetched ${response.data.records?.length || 0} price records`);
    res.json(response.data);
  } catch (error) {
    console.error('Prices API error:', error.message);
    res.status(500).json({ error: "Failed to fetch prices from data.gov" });
  }
});
app.get('/api/geocode', async (req, res) => {
  const { location } = req.query;
  if (!location) {
    return res.status(400).json({ error: "Location parameter is required" });
  }

  // Multiple geocoding APIs for better coverage
  const APIs = [
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=5&language=en&format=json`,
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=5&countrycodes=in`
  ];
  
  try {
    console.log(`Geocoding location: ${location}`);
    
    // Try Open-Meteo first
    try {
      const response = await axios.get(APIs[0]);
      if (response.data.results && response.data.results.length > 0) {
        const result = response.data.results[0];
        return res.json({
          lat: result.latitude,
          lon: result.longitude,
          name: result.name,
          country: result.country || 'India'
        });
      }
    } catch (error) {
      console.log('Open-Meteo failed, trying Nominatim...');
    }
    
    // Try Nominatim as fallback
    try {
      const response = await axios.get(APIs[1], {
        headers: {
          'User-Agent': 'AgriPulse/1.0'
        }
      });
      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        return res.json({
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon),
          name: result.display_name.split(',')[0],
          country: 'India'
        });
      }
    } catch (error) {
      console.log('Nominatim also failed');
    }
    
    // Fallback to major Indian cities if exact location not found
    const indianCities = {
      'mumbai': { lat: 19.0760, lon: 72.8777, name: 'Mumbai' },
      'delhi': { lat: 28.7041, lon: 77.1025, name: 'Delhi' },
      'bangalore': { lat: 12.9716, lon: 77.5946, name: 'Bangalore' },
      'chennai': { lat: 13.0827, lon: 80.2707, name: 'Chennai' },
      'kolkata': { lat: 22.5726, lon: 88.3639, name: 'Kolkata' },
      'hyderabad': { lat: 17.3850, lon: 78.4867, name: 'Hyderabad' },
      'pune': { lat: 18.5204, lon: 73.8567, name: 'Pune' },
      'ahmedabad': { lat: 23.0225, lon: 72.5714, name: 'Ahmedabad' },
      'jaipur': { lat: 26.9124, lon: 75.7873, name: 'Jaipur' },
      'lucknow': { lat: 26.8467, lon: 80.9462, name: 'Lucknow' }
    };
    
    const searchLower = location.toLowerCase();
    for (const [city, coords] of Object.entries(indianCities)) {
      if (searchLower.includes(city) || city.includes(searchLower)) {
        return res.json({
          lat: coords.lat,
          lon: coords.lon,
          name: coords.name,
          country: 'India'
        });
      }
    }
    
    res.status(404).json({ error: "Location not found. Try major city names like Mumbai, Delhi, Bangalore, etc." });
  } catch (error) {
    console.error('Geocoding API error:', error.message);
    res.status(500).json({ error: "Failed to geocode location" });
  }
});

app.get('/api/weather', async (req, res) => {
  const { lat = 28.7041, lon = 77.1025 } = req.query;
  const URL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=7`;
  try {
    const response = await axios.get(URL);
    res.json(response.data);
  } catch (error) {
    console.error('Weather API error:', error.message);
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
});
app.post('/api/chat', async (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage || userMessage.trim() === '') {
    return res.status(400).json({ error: "Message is required" });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "Gemini API key not configured" });
  }

  try {
    console.log('Processing chat message:', userMessage);
    
    // Enhanced prompt to make AI more helpful for all topics
    const enhancedPrompt = `You are a helpful AI assistant. Please provide a comprehensive and accurate response to this question: \