const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const app = express();
// Middleware
app.use(cors());
app.use(express.json());
// For HTTP requests
const https = require("https");
const http = require("http");

// Helper function to fetch from URL
const fetchURL = (url) => {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch(e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
};
// Gemini AI
if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY is not set. AI requests will fail.");
}
const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
);
// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/cropDB")
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log(err));
// Schema
const cropSchema = new mongoose.Schema({
    nitrogen: Number,
    phosphorus: Number,
    potassium: Number,
    temperature: Number,
    humidity: Number,
    rainfall: Number,
    crop: String,
    fertilizer: String,
    date: {
        type: Date,
        default: Date.now
    }
});
const Crop = mongoose.model("CropData", cropSchema);
// ==========================
// HISTORY API
// ==========================
app.get("/history", async (req, res) => {
    try {
        const data = await Crop.find().sort({ date: -1 });
        res.json(data);
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});

// ==========================
// WEATHER API (Live Weather Using AI)
// ==========================
app.get("/weather", async (req, res) => {
    try {
        const { location = "Salem, Tamil Nadu", lat, lon } = req.query;
        
        // Use Open-Meteo free weather API (no key required)
        let weatherData;
        
        const weatherUrlBase = (latitude, longitude) =>
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&daily=rain_sum&hourly=relativehumidity_2m&timezone=auto`;
        
        if (lat && lon) {
            const url = weatherUrlBase(lat, lon);
            weatherData = await fetchURL(url);
        } else {
            const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
            const geoData = await fetchURL(geoUrl);
            
            if (!geoData.results || geoData.results.length === 0) {
                return res.json({
                    temperature: 32,
                    humidity: 71,
                    rainfall: 115,
                    condition: "Cloudy",
                    rainChance: 40,
                    windSpeed: 12,
                    location: location,
                    source: "default"
                });
            }
            
            const { latitude, longitude } = geoData.results[0];
            const weatherUrl = weatherUrlBase(latitude, longitude);
            weatherData = await fetchURL(weatherUrl);
        }
        
        if (!weatherData.current) {
            throw new Error("Invalid weather data");
        }
        
        const temperature_2m = weatherData.current?.temperature ?? null;
        const wind_speed_10m = weatherData.current?.windspeed ?? null;
        const weather_code = weatherData.current?.weathercode ?? 0;
        const humidity = weatherData.current?.relativehumidity_2m ?? weatherData.hourly?.relativehumidity_2m?.[0] ?? 71;
        const rainfallValue = weatherData.daily?.rain_sum?.[0] ?? 0;
        
        // Map WMO weather code to condition
        const getCondition = (code) => {
            if (code === 0) return "Clear";
            if (code === 1) return "Mostly Clear";
            if (code === 2) return "Partly Cloudy";
            if (code === 3) return "Cloudy";
            if (code === 45 || code === 48) return "Foggy";
            if (code === 51 || code === 53 || code === 55) return "Light Rain";
            if (code === 61 || code === 63 || code === 65) return "Rainy";
            if (code === 71 || code === 73 || code === 75) return "Snowy";
            if (code === 80 || code === 81 || code === 82) return "Shower";
            if (code === 85 || code === 86) return "Snow Shower";
            return "Cloudy";
        };
        
        const condition = getCondition(weather_code);
        
        let rainChance = 0;
        if (weather_code >= 51 && weather_code <= 82) rainChance = 70;
        else if (weather_code >= 45 && weather_code <= 48) rainChance = 30;
        else if (weather_code === 3) rainChance = 40;
        else if (weather_code === 2) rainChance = 20;
        else rainChance = 5;
        
        const response = {
            temperature: temperature_2m != null ? Math.round(temperature_2m) : 32,
            humidity: humidity != null ? Math.round(humidity) : 71,
            rainfall: rainfallValue != null ? Math.round(rainfallValue) : 0,
            condition: condition,
            rainChance: rainChance,
            windSpeed: wind_speed_10m != null ? Math.round(wind_speed_10m) : 12,
            location: location,
            source: "live"
        };
        
        res.json(response);
    } catch (err) {
        console.log("Weather API Error:", err.message);
        // Return default weather on error
        res.json({
            temperature: 32,
            humidity: 71,
            condition: "Cloudy",
            rainChance: 40,
            windSpeed: 12,
            location: "Salem, Tamil Nadu",
            source: "default"
        });
    }
});
// ==========================
// SAVE API
// ==========================
app.post("/save", async (req, res) => {
    try {
        const sanitize = (value) => {
            const text = String(value || "").replace(/^[*\s]+|[*\s]+$/g, "").trim();
            return text || "Unknown";
        };

        const data = new Crop({
            ...req.body,
            crop: sanitize(req.body.crop),
            fertilizer: sanitize(req.body.fertilizer)
        });

        await data.save();
        res.json({
            message: "✅ Saved successfully"
        });
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});
// ==========================
// DELETE API
// ==========================
app.delete("/delete/:id", async (req, res) => {
    try {
        const id = req.params.id;
        await Crop.findByIdAndDelete(id);
        res.json({
            message: "✅ Deleted successfully"
        });
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});
// ==========================
// AI PREDICTION API
// ==========================
// Reusable generator helper
async function generateAIResponse({ nitrogen, phosphorus, potassium, temperature, humidity, rainfall }) {
    const prompt = `
You are an expert agricultural recommendation assistant.
Analyze the following farm conditions and provide a concise but detailed recommendation.
Farm Data:
- Nitrogen: ${nitrogen}
- Phosphorus: ${phosphorus}
- Potassium: ${potassium}
- Temperature: ${temperature}°C
- Humidity: ${humidity}%
- Rainfall: ${rainfall} mm

Return your response using only plain text and this exact structure:

Farm Condition Analysis:
- Nutrients (N: ${nitrogen}, P: ${phosphorus}, K: ${potassium}): <analysis>
- Temperature (${temperature}°C): <analysis>
- Humidity (${humidity}%): <analysis>
- Rainfall (${rainfall} mm): <analysis>

---

1. Best Crop:

Suggested Crop: <best crop name>
- Explanation: <why this crop is best>

---

2. Best Fertilizer:

Suggested Fertilizer: <best fertilizer name>
- Explanation: <why this fertilizer is best>

---

3. Short Explanation:

<one-paragraph summary of the recommendation and key risk factors>
`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);

    const text = result?.response?.text?.() ??
        result?.response?.candidates?.[0]?.content?.text ??
        (Array.isArray(result?.response?.candidates?.[0]?.content?.parts)
            ? result.response.candidates[0].content.parts.join("")
            : "");

    return text;
}

// New route: full AI explanation (for AI Demo)
app.post("/ai", async (req, res) => {
    console.log("🤖 /ai HIT");
    try {
        const text = await generateAIResponse(req.body || {});
        if (!text) throw new Error("AI returned no text");
        res.json({ success: true, result: text });
    } catch (err) {
        console.error("AI /ai error:", err);
        res.status(500).json({ success: false, message: err.message || "AI failed" });
    }
});

// New route: prediction (concise structured response)
app.post("/predict", async (req, res) => {
    console.log("🔍 /predict HIT");
    try {
        const text = await generateAIResponse(req.body || {});

        // Extract Farm Condition Analysis block
        const conditionMatch = text.match(/Farm Condition Analysis:\s*([\s\S]*?)---/i);
        const conditionSummary = conditionMatch ? conditionMatch[1].trim() : "";

        const cropMatch = text.match(/Suggested Crop:\s*([^\r\n]+)/i);
        const fertilizerMatch = text.match(/Suggested Fertilizer:\s*([^\r\n]+)/i);

        const sanitize = (v) => (v || "").toString().replace(/^[*\s]+|[*\s]+$/g, "").trim();

        const crop = cropMatch ? sanitize(cropMatch[1]) : "Unknown";
        const fertilizer = fertilizerMatch ? sanitize(fertilizerMatch[1]) : "Unknown";

        res.json({ success: true, crop, fertilizer, conditionSummary });
    } catch (err) {
        console.error("PREDICT ERROR:", err);
        res.status(500).json({ success: false, message: err.message || "Prediction failed" });
    }
});
// ==========================
// SERVER
// ==========================
app.listen(5000, () => {
    console.log("🚀 Server running on port 5000");
});
