document.addEventListener("DOMContentLoaded", () => {
  const marketPrices = [
    { crop: 'Rice', price: '₹24,000' },
    { crop: 'Wheat', price: '₹20,500' },
    { crop: 'Maize', price: '₹16,700' }
  ];

  const diseaseMessage = {
    low: 'Low disease risk expected for current soil and weather conditions.',
    moderate: 'Moderate risk; monitor humidity and rain during the next few days.',
    high: 'High risk; consider preventive crop protection and close field checks.'
  };

  function logResponse(context, payload) {
    console.debug(`[Dashboard] ${context}:`, payload);
  }

  async function fetchLiveWeather(location = "Salem, Tamil Nadu") {
    try {
      const response = await fetch(`http://localhost:5000/weather?location=${encodeURIComponent(location)}`);
      const weather = await response.json();
      logResponse('Weather API response', weather);
      return weather;
    } catch (err) {
      console.error("Weather fetch error:", err);
      return {
        temperature: 32,
        humidity: 71,
        rainfall: 115,
        condition: "Cloudy",
        rainChance: 40,
        windSpeed: 12,
        location: location,
        source: "default"
      };
    }
  }

  function renderMarketPrices() {
    const tbody = document.getElementById('marketPricesBody');
    tbody.innerHTML = marketPrices.map(item => `
      <tr><td>${item.crop}</td><td>${item.price}</td></tr>
    `).join('');
  }

  function setDiseaseRisk(score) {
    const badge = document.getElementById('diseaseBadge');
    const riskLabel = document.getElementById('diseaseRisk');
    const message = document.getElementById('diseaseMessage');

    if (score > 70) {
      badge.textContent = 'High';
      badge.classList.remove('safe');
      badge.style.background = '#f8d7da';
      badge.style.color = '#842029';
      riskLabel.textContent = 'High';
      message.textContent = diseaseMessage.high;
    } else if (score > 40) {
      badge.textContent = 'Moderate';
      badge.classList.remove('safe');
      badge.style.background = '#fff3cd';
      badge.style.color = '#664d03';
      riskLabel.textContent = 'Moderate';
      message.textContent = diseaseMessage.moderate;
    } else {
      badge.textContent = 'Low';
      badge.classList.add('safe');
      badge.style.background = 'rgba(46,125,50,0.14)';
      badge.style.color = '#2e7d32';
      riskLabel.textContent = 'Low';
      message.textContent = diseaseMessage.low;
    }
  }

  function updateSoilBars(n, p, k) {
    document.getElementById('soilN').style.width = `${Math.min(n, 100)}%`;
    document.getElementById('soilP').style.width = `${Math.min(p, 100)}%`;
    document.getElementById('soilK').style.width = `${Math.min(k, 100)}%`;
    document.getElementById('soilNLabel').innerText = `${Math.min(n, 100)}%`;
    document.getElementById('soilPLabel').innerText = `${Math.min(p, 100)}%`;
    document.getElementById('soilKLabel').innerText = `${Math.min(k, 100)}%`;
  }

  function setProgressWidth(id, value) {
    const el = document.getElementById(id);
    if (el) {
      el.style.width = `${Math.min(Math.max(value || 0, 0), 100)}%`;
    }
  }

  function setStatusLabel(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  }

  function applyMetricValues(data, weatherData = null) {
    const latest = data[data.length - 1] || {};
    const totalRain = data.reduce((sum, item) => sum + (item.rainfall || 0), 0);
    const avgRain = data.length ? (totalRain / data.length).toFixed(2) : 0;
    const cropCount = {};
    const totalYield = data.reduce((sum, item) => sum + (item.yield || 0), 0);

    data.forEach(item => {
      if (item.crop) {
        cropCount[item.crop] = (cropCount[item.crop] || 0) + 1;
      }
    });

    const topCrop = Object.keys(cropCount).length
      ? Object.keys(cropCount).reduce((a, b) => cropCount[a] > cropCount[b] ? a : b)
      : '';

    const recommendedCrop = latest.crop || topCrop || 'Rice';
    const fertilizer = latest.fertilizer || 'NPK 15-15-15';
    const confidence = Math.min(95, Math.max(65, Math.round(Math.random() * 20 + 75)));
    const n = latest.nitrogen != null ? latest.nitrogen : 60;
    const p = latest.phosphorus != null ? latest.phosphorus : 50;
    const k = latest.potassium != null ? latest.potassium : 55;
    const soilScore = Math.round((n + p + k) / 3);
    const riskScore = Math.round((100 - soilScore) * 0.7 + (avgRain > 70 ? 15 : 0));
    const yieldForecast = Math.min(100, Math.max(72, Math.round(Math.random() * 18 + 80)));
    const rainfallValue = latest.rainfall != null ? latest.rainfall : (weatherData?.rainfall ?? 0);

    if (weatherData) {
      document.getElementById('weatherTemp').innerText = `${weatherData.temperature ?? 32}°C`;
      document.getElementById('weatherHumidity').innerText = `${weatherData.humidity ?? 71}%`;
      document.getElementById('weatherRain').innerText = `${weatherData.rainfall ?? rainfallValue} mm`;
      setStatusLabel('weatherStatus', weatherData.condition || 'Stable');
      document.getElementById('weatherCondition').innerText = weatherData.condition || 'Stable';
      document.getElementById('weatherRainChance').innerText = `${weatherData.rainChance ?? 40}%`;
      document.getElementById('weatherWind').innerText = `${weatherData.windSpeed ?? 12} km/h`;
      document.getElementById('weatherLocation').innerText = `📍 ${weatherData.location || 'Salem, Tamil Nadu'}`;
    } else {
      document.getElementById('weatherTemp').innerText = `${latest.temperature ?? 29}°C`;
      document.getElementById('weatherHumidity').innerText = `${latest.humidity ?? 72}%`;
      document.getElementById('weatherRain').innerText = `${rainfallValue} mm`;
      setStatusLabel('weatherStatus', latest.condition || 'Partly Cloudy');
      document.getElementById('weatherCondition').innerText = latest.condition || 'Partly Cloudy';
      document.getElementById('weatherRainChance').innerText = `${latest.rainChance ?? 35}%`;
      document.getElementById('weatherWind').innerText = `${latest.windSpeed ?? 10} km/h`;
      document.getElementById('weatherLocation').innerText = latest.location ? `📍 ${latest.location}` : '📍 Salem, Tamil Nadu';
    }

    document.getElementById('predictedCrop').innerText = recommendedCrop;
    document.getElementById('cropConfidence').innerText = `${confidence}%`;
    document.getElementById('recommendation').innerText = fertilizer;
    document.getElementById('yieldTotal').innerText = `${totalYield || 4200} kg`;
    document.getElementById('yieldForecast').innerText = `${yieldForecast}%`;
    updateSoilBars(n, p, k);
    setProgressWidth('humidityStabilityFill', weatherData?.humidity ?? latest.humidity ?? 0);
    setProgressWidth('forecastConfidenceFill', confidence);
    setProgressWidth('riskLevelFill', riskScore);
    setDiseaseRisk(riskScore);
  }

  function setFallbackData(weatherData = null) {
    if (weatherData) {
      document.getElementById('weatherTemp').innerText = `${weatherData.temperature ?? 32}°C`;
      document.getElementById('weatherHumidity').innerText = `${weatherData.humidity ?? 71}%`;
      document.getElementById('weatherRain').innerText = `${weatherData.rainfall ?? 115} mm`;
      setStatusLabel('weatherStatus', weatherData.condition || 'Cloudy');
      document.getElementById('weatherCondition').innerText = weatherData.condition || 'Cloudy';
      document.getElementById('weatherRainChance').innerText = `${weatherData.rainChance ?? 40}%`;
      document.getElementById('weatherWind').innerText = `${weatherData.windSpeed ?? 12} km/h`;
      document.getElementById('weatherLocation').innerText = `📍 ${weatherData.location || 'Salem, Tamil Nadu'}`;
    } else {
      document.getElementById('weatherTemp').innerText = '29°C';
      document.getElementById('weatherHumidity').innerText = '70%';
      document.getElementById('weatherRain').innerText = '115 mm';
      setStatusLabel('weatherStatus', 'Partly Cloudy');
      document.getElementById('weatherCondition').innerText = 'Partly Cloudy';
      document.getElementById('weatherRainChance').innerText = '35%';
      document.getElementById('weatherWind').innerText = '10 km/h';
      document.getElementById('weatherLocation').innerText = '📍 Salem, Tamil Nadu';
    }

    document.getElementById('predictedCrop').innerText = 'Maize';
    document.getElementById('cropConfidence').innerText = '88%';
    document.getElementById('recommendation').innerText = 'Balanced NPK';
    document.getElementById('yieldTotal').innerText = '4,100 kg';
    document.getElementById('yieldForecast').innerText = '86%';
    updateSoilBars(62, 54, 58);
    setProgressWidth('humidityStabilityFill', weatherData?.humidity ?? 70);
    setProgressWidth('forecastConfidenceFill', 86);
    setProgressWidth('riskLevelFill', 48);
    setDiseaseRisk(48);
  }

  renderMarketPrices();

  async function loadDashboardData() {
    try {
      const weatherData = await fetchLiveWeather("Salem, Tamil Nadu");
      const historyResponse = await fetch('http://localhost:5000/history');
      const historyData = await historyResponse.json();
      logResponse('History API response', historyData);

      if (!Array.isArray(historyData) || historyData.length === 0) {
        setFallbackData(weatherData);
        return;
      }

      applyMetricValues(historyData, weatherData);
    } catch (err) {
      console.error("Dashboard load error:", err);
      const weatherData = await fetchLiveWeather("Salem, Tamil Nadu");
      setFallbackData(weatherData);
    }
  }

  loadDashboardData();
});
