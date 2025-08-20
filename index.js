// State
let currentWeatherData = null;
let isCelsius = true;
let isDarkMode = localStorage.getItem('darkMode') === 'true';

// API Config
const API_KEY = '5488401f926327aa1217407a2c7d1243';
const API_BASE = 'https://api.openweathermap.org/data/2.5';

// Favorites
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

// Weather Icons
const ICONS = {
    'Clear': '☀️', 'Clouds': '☁️', 'Rain': '🌧️', 'Drizzle': '🌦️',
    'Thunderstorm': '⛈️', 'Snow': '❄️', 'Mist': '🌫️', 'Fog': '🌫️', 'Haze': '🌫️'
};

// Fallback Data
const FALLBACK_DATA = {
    'bangkok': { name: 'กรุงเทพฯ', weather: 'ท้องฟ้าแจ่มใส', main: 'Clear', temp: 34, humidity: 68, windSpeed: 8, feelsLike: 39 },
    'london': { name: 'ลอนดอน', weather: 'มีเมฆมาก', main: 'Clouds', temp: 15, humidity: 78, windSpeed: 14, feelsLike: 12 },
    'tokyo': { name: 'โตเกียว', weather: 'ฝนตกปานกลาง', main: 'Rain', temp: 22, humidity: 88, windSpeed: 13, feelsLike: 25 },
    'paris': { name: 'ปารีส', weather: 'ฝนตกเล็กน้อย', main: 'Rain', temp: 18, humidity: 82, windSpeed: 9, feelsLike: 16 },
    'new york': { name: 'นิวยอร์ก', weather: 'มีเมฆบางส่วน', main: 'Clouds', temp: 8, humidity: 62, windSpeed: 16, feelsLike: 4 }
};

const getIcon = (main) => ICONS[main] || '🌤️';
// Get Weather Data
async function getWeatherData(city) {
    try {
        const [weatherRes, forecastRes] = await Promise.all([
            fetch(`${API_BASE}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=th`),
            fetch(`${API_BASE}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=th`)
        ]);

        if (!weatherRes.ok) throw new Error(`ไม่พบเมือง "${city}" กรุณาตรวจสอบการสะกด`);

        const weather = await weatherRes.json();
        const forecast = forecastRes.ok ? await forecastRes.json() : null;

        // แปลคำอธิบายสภาพอากาศ
        const weatherDesc = translateWeather(weather.weather[0].description, weather.weather[0].main);

        return {
            name: weather.name,
            weather: weatherDesc,
            icon: getIcon(weather.weather[0].main),
            temp: Math.round(weather.main.temp),
            humidity: weather.main.humidity,
            windSpeed: Math.round(weather.wind?.speed * 3.6 || 0),
            feelsLike: Math.round(weather.main.feels_like),
            forecast: forecast ? processForecast(forecast) : generateForecast(weather.weather[0].main, Math.round(weather.main.temp))
        };
    } catch (error) {
        console.error('API Error:', error);
        throw new Error(`ไม่สามารถดึงข้อมูลสภาพอากาศของ "${city}" ได้\nกรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต`);
    }
}

// แปลคำอธิบายสภาพอากาศ
function translateWeather(desc, main) {
    const translations = {
        'clear sky': 'ท้องฟ้าแจ่มใส',
        'few clouds': 'มีเมฆเล็กน้อย',
        'scattered clouds': 'มีเมฆกระจาย',
        'broken clouds': 'มีเมฆมาก',
        'overcast clouds': 'ท้องฟ้าครึ้ม',
        'light rain': 'ฝนตกเล็กน้อย',
        'moderate rain': 'ฝนตกปานกลาง',
        'heavy rain': 'ฝนตกหนัก',
        'thunderstorm': 'ฝนฟ้าคะนอง',
        'snow': 'หิมะตก',
        'mist': 'หมอกบาง',
        'fog': 'หมอกหนา'
    };

    return translations[desc.toLowerCase()] || desc;
}

// Search Weather
async function searchWeather() {
    const city = document.getElementById('cityInput').value.trim();
    if (!city) return alert('กรุณาใส่ชื่อเมือง');

    const btn = document.querySelector('button[onclick="searchWeather()"]');
    const original = btn.innerHTML;
    btn.innerHTML = '<span>⏳</span> กำลังค้นหา...';
    btn.disabled = true;

    try {
        const data = await getWeatherData(city);
        displayWeather(data);
        document.getElementById('cityInput').value = '';
    } catch (error) {
        alert(error.message);
    } finally {
        btn.innerHTML = original;
        btn.disabled = false;
    }
}

// Display Weather
function displayWeather(data) {
    currentWeatherData = data;

    document.getElementById('cityName').textContent = data.name;
    document.getElementById('weatherIcon').textContent = data.icon;
    document.getElementById('weatherDescription').textContent = data.weather;
    document.getElementById('temperature').textContent = `${data.temp}°C`;
    document.getElementById('humidity').textContent = `${data.humidity}%`;
    document.getElementById('windSpeed').textContent = `${data.windSpeed} km/h`;
    document.getElementById('feelsLike').textContent = `${data.feelsLike}°C`;

    document.getElementById('weatherDisplay').classList.remove('hidden');
    displayForecast(data.forecast);
}

// Display Forecast
function displayForecast(forecast) {
    const container = document.getElementById('forecastContainer');
    container.innerHTML = forecast.map(day => `
                <div class="glass rounded-2xl p-6 text-center transition-transform hover:scale-105">
                    <p class="text-white/70 text-sm mb-3">${day.day}</p>
                    <div class="text-4xl mb-4">${day.icon}</div>
                    <p class="text-white font-semibold">${day.high}°</p>
                    <p class="text-white/60 text-sm">${day.low}°</p>
                </div>
            `).join('');

    document.getElementById('forecastDisplay').classList.remove('hidden');
}

// Process Forecast
function processForecast(data) {
    const days = ['วันนี้', 'พรุ่งนี้', 'วันพุธ', 'วันพฤหัส', 'วันศุกร์'];
    const daily = {};

    data.list.forEach(item => {
        const date = new Date(item.dt * 1000).toDateString();
        if (!daily[date]) daily[date] = { temps: [], weather: item.weather[0] };
        daily[date].temps.push(item.main.temp);
    });

    return Object.keys(daily).slice(0, 5).map((date, i) => ({
        day: days[i],
        icon: getIcon(daily[date].weather.main),
        high: Math.round(Math.max(...daily[date].temps)),
        low: Math.round(Math.min(...daily[date].temps))
    }));
}

// Generate Forecast
function generateForecast(type, temp) {
    const days = ['วันนี้', 'พรุ่งนี้', 'วันพุธ', 'วันพฤหัส', 'วันศุกร์'];
    const patterns = {
        'Clear': ['☀️', '🌤️', '☀️', '🌤️', '☀️'],
        'Clouds': ['☁️', '⛅', '☁️', '🌤️', '⛅'],
        'Rain': ['🌧️', '🌦️', '☁️', '🌤️', '☀️']
    };

    return days.map((day, i) => ({
        day,
        icon: (patterns[type] || patterns['Clear'])[i],
        high: temp + Math.floor(Math.random() * 6) - 3,
        low: temp - 8 + Math.floor(Math.random() * 4)
    }));
}

// Share Weather
function shareWeather() {
    if (!currentWeatherData) return;
    const text = `${currentWeatherData.name}: ${currentWeatherData.weather} ${currentWeatherData.temp}°C`;

    if (navigator.share) {
        navigator.share({ title: 'สภาพอากาศ', text });
    } else {
        navigator.clipboard.writeText(text).then(() => alert('คัดลอกแล้ว!'));
    }
}

// Toggle Unit
function toggleUnit() {
    if (!currentWeatherData) return;
    isCelsius = !isCelsius;

    const temp = isCelsius ? currentWeatherData.temp : Math.round(currentWeatherData.temp * 9 / 5 + 32);
    const feels = isCelsius ? currentWeatherData.feelsLike : Math.round(currentWeatherData.feelsLike * 9 / 5 + 32);
    const unit = isCelsius ? 'C' : 'F';

    document.getElementById('temperature').textContent = `${temp}°${unit}`;
    document.getElementById('feelsLike').textContent = `${feels}°${unit}`;
}

// Toggle Theme
function toggleTheme() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('darkMode', isDarkMode);
    document.body.className = `${isDarkMode ? 'dark' : 'light'}-mode min-h-screen`;
    document.getElementById('themeIcon').textContent = isDarkMode ? '☀️' : '🌙';
}

// Favorites Functions
function addToFavorites() {
    if (!currentWeatherData) return;

    const cityName = currentWeatherData.name;
    if (favorites.includes(cityName)) {
        alert('เมืองนี้อยู่ในรายการโปรดแล้ว');
        return;
    }

    favorites.push(cityName);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateFavoritesList();
    alert(`เพิ่ม ${cityName} ในรายการโปรดแล้ว!`);
}

function removeFavorite(city) {
    favorites = favorites.filter(f => f !== city);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateFavoritesList();
}

function clearFavorites() {
    if (favorites.length === 0) return;
    if (confirm('ต้องการลบเมืองโปรดทั้งหมดหรือไม่?')) {
        favorites = [];
        localStorage.setItem('favorites', JSON.stringify(favorites));
        updateFavoritesList();
    }
}

function updateFavoritesList() {
    const container = document.getElementById('favoritesList');
    if (favorites.length === 0) {
        container.innerHTML = '<p class="text-white/60 text-sm">ยังไม่มีเมืองโปรด</p>';
        return;
    }

    container.innerHTML = favorites.map(city => `
                <div class="glass rounded-xl px-4 py-2 flex items-center gap-2">
                    <button onclick="searchFavorite('${city}')" class="text-white hover:text-blue-200 text-sm">
                        ${city}
                    </button>
                    <button onclick="removeFavorite('${city}')" class="text-white/60 hover:text-red-300 text-xs">
                        ✕
                    </button>
                </div>
            `).join('');
}

async function searchFavorite(city) {
    document.getElementById('cityInput').value = city;
    await searchWeather();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.body.className = `${isDarkMode ? 'dark' : 'light'}-mode min-h-screen`;
    document.getElementById('themeIcon').textContent = isDarkMode ? '☀️' : '🌙';
    const input = document.getElementById('cityInput');
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); searchWeather(); } });
    input.addEventListener('focus', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    updateFavoritesList();
});
