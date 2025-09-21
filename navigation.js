// Global variables
let currentPage = 'dashboard';

// Navigation functions
function openPage(pageId) {
    // Hide current page
    const currentPageEl = document.getElementById(currentPage);
    if (currentPageEl) {
        currentPageEl.classList.remove('active');
    }

    // Show new page
    const newPageEl = document.getElementById(pageId);
    if (newPageEl) {
        newPageEl.classList.add('active');
        currentPage = pageId;

        // Show/hide back button
        const backBtn = document.getElementById('backBtn');
        if (pageId === 'dashboard') {
            backBtn.style.display = 'none';
        } else {
            backBtn.style.display = 'block';
        }

        // Load page-specific data
        if (pageId === 'market-prices') {
            loadPrices();
        } else if (pageId === 'weather-forecast') {
            loadWeather();
        }
    }
}

function goBack() {
    openPage('dashboard');
}

// API functions
async function loadPrices() {
    const pricesTable = document.getElementById('pricesTable');
    pricesTable.innerHTML = '<div class="loading-spinner"></div><p>Loading prices...</p>';

    try {
        const response = await fetch('/api/prices');
        const data = await response.json();

        if (data.records && data.records.length > 0) {
            let tableHTML = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>Commodity</th>
                            <th>Market</th>
                            <th>Price (₹/Quintal)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            data.records.slice(0, 10).forEach(record => {
                tableHTML += `
                    <tr>
                        <td>${record.commodity || 'N/A'}</td>
                        <td>${record.market || 'N/A'}</td>
                        <td>₹${record.modal_price || 'N/A'}</td>
                    </tr>
                `;
            });

            tableHTML += '</tbody></table>';
            pricesTable.innerHTML = tableHTML;
        } else {
            pricesTable.innerHTML = '<p>No price data available.</p>';
        }
    } catch (error) {
        console.error('Error loading prices:', error);
        pricesTable.innerHTML = '<p class="status-error">Failed to load price data. Please try again.</p>';
    }
}

// Global variable to store current location
let currentLocation = { name: 'Delhi', lat: 28.7041, lon: 77.1025 };

async function searchAndLoadWeather() {
    const locationInput = document.getElementById('locationInput');
    const location = locationInput.value.trim();
    
    if (!location) {
        alert('Please enter a city name');
        return;
    }

    await loadWeatherForLocation(location);
}

async function loadWeatherForCurrentLocation() {
    await loadWeatherForLocation(currentLocation.name);
}

async function loadWeatherForLocation(locationName) {
    const weatherDisplay = document.getElementById('weatherDisplay');
    const weatherLocationTitle = document.getElementById('weatherLocationTitle');
    
    weatherDisplay.innerHTML = '<div class="loading-spinner"></div><p>Loading weather data...</p>';

    try {
        // First get coordinates for the location
        const coordsResponse = await fetch(`/api/geocode?location=${encodeURIComponent(locationName)}`);
        const coordsData = await coordsResponse.json();

        if (!coordsData.lat || !coordsData.lon) {
            weatherDisplay.innerHTML = '<p class="status-error">Location not found. Please try a different city name.</p>';
            return;
        }

        // Update current location
        currentLocation = { name: locationName, lat: coordsData.lat, lon: coordsData.lon };
        weatherLocationTitle.textContent = `7-Day Forecast - ${locationName}`;

        // Get weather data for the location
        const response = await fetch(`/api/weather?lat=${coordsData.lat}&lon=${coordsData.lon}`);
        const data = await response.json();

        if (data.daily) {
            let weatherHTML = '<div class="weather-cards">';

            for (let i = 0; i < 7; i++) {
                const date = new Date(data.daily.time[i]);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const maxTemp = Math.round(data.daily.temperature_2m_max[i]);
                const minTemp = Math.round(data.daily.temperature_2m_min[i]);
                const precipitation = data.daily.precipitation_sum[i] || 0;

                weatherHTML += `
                    <div class="card" style="margin-bottom: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h4>${dayName}</h4>
                                <p style="color: #94a3b8; font-size: 0.9rem;">${date.toLocaleDateString()}</p>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 1.2rem; font-weight: 600;">${maxTemp}°C / ${minTemp}°C</div>
                                <div style="color: #60a5fa; font-size: 0.9rem;">
                                    <i class="fas fa-cloud-rain"></i> ${precipitation}mm
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            weatherHTML += '</div>';
            weatherDisplay.innerHTML = weatherHTML;
        } else {
            weatherDisplay.innerHTML = '<p>No weather data available.</p>';
        }
    } catch (error) {
        console.error('Error loading weather:', error);
        weatherDisplay.innerHTML = '<p class="status-error">Failed to load weather data. Please try again.</p>';
    }
}

// Keep the old function for backward compatibility
async function loadWeather() {
    await loadWeatherForLocation('Delhi');
}

// Chat functions
async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const chatDisplay = document.getElementById('chatDisplay');
    const message = chatInput.value.trim();

    if (!message) return;

    // Add user message
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'chat-message user-message';
    userMessageDiv.textContent = message;
    chatDisplay.appendChild(userMessageDiv);

    // Clear input
    chatInput.value = '';

    // Add loading message
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-message bot-message';
    loadingDiv.innerHTML = '<div class="loading-spinner"></div> Thinking...';
    chatDisplay.appendChild(loadingDiv);

    // Scroll to bottom
    chatDisplay.scrollTop = chatDisplay.scrollHeight;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        });

        const data = await response.json();

        // Remove loading message
        chatDisplay.removeChild(loadingDiv);

        // Add bot response
        const botMessageDiv = document.createElement('div');
        botMessageDiv.className = 'chat-message bot-message';
        botMessageDiv.textContent = data.text || 'Sorry, I could not process your request.';
        chatDisplay.appendChild(botMessageDiv);

    } catch (error) {
        console.error('Error sending message:', error);

        // Remove loading message
        chatDisplay.removeChild(loadingDiv);

        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chat-message bot-message';
        errorDiv.textContent = 'Sorry, there was an error processing your message. Please try again.';
        chatDisplay.appendChild(errorDiv);
    }

    // Scroll to bottom
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// Event listeners
document.getElementById('chatInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Add event listener for weather location search
document.addEventListener('DOMContentLoaded', function() {
    const locationInput = document.getElementById('locationInput');
    if (locationInput) {
        locationInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchAndLoadWeather();
            }
        });
    }
});

// ... (the rest of your code continues here unchanged, including cropData, translations, all functions, etc.)