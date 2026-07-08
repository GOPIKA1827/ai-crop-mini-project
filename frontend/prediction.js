console.log("✅ Prediction Page Loaded");

const form = document.getElementById("cropForm");
const cropResult = document.getElementById("cropResult");
const aiResult = document.getElementById("aiResult");
const aiDemoBtn = document.getElementById("aiDemoBtn");

function getInputValues() {
    return {
        nitrogen: Number(document.getElementById("nitrogen").value || 0),
        phosphorus: Number(document.getElementById("phosphorus").value || 0),
        potassium: Number(document.getElementById("potassium").value || 0),
        temperature: Number(document.getElementById("temperature").value || 0),
        humidity: Number(document.getElementById("humidity").value || 0),
        rainfall: Number(document.getElementById("rainfall").value || 0)
    };
}

function renderLoading(target) {
    target.innerHTML = `
        <div class="placeholder-box">
            <div class="loader"></div>
            <p>🤖 AI is analyzing your farm data...</p>
        </div>
    `;
}

function renderError(target, message) {
    target.innerHTML = `
        <div class="placeholder-box error">
            <p>❌ ${message}</p>
        </div>
    `;
}

function escapeHtml(text = "") {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function renderCropResult(data) {
    const crop = escapeHtml(data.crop || "-" );
    const fertilizer = escapeHtml(data.fertilizer || "-" );
    const condition = escapeHtml(data.conditionSummary || "No condition summary available.");

    cropResult.innerHTML = `
        <div class="prediction-summary">
            <div class="metric-list">
                <div>
                    <strong>Suggested Crop</strong>
                    <span>${crop}</span>
                </div>
                <div>
                    <strong>Suggested Fertilizer</strong>
                    <span>${fertilizer}</span>
                </div>
            </div>
            <div class="farm-condition">
                <h4>Farm Condition Analysis</h4>
                <pre class="ai-brief">${condition}</pre>
            </div>
        </div>
    `;
}

function renderAIResult(aiText) {
    aiResult.innerHTML = `
        <div class="ai-recommendation">
            <div class="ai-card-header">🤖 Smart AI Reasoning</div>
            <div class="ai-card-body">
                <pre>${escapeHtml(aiText)}</pre>
            </div>
        </div>
    `;
}

async function predictCrop(payload) {
    renderLoading(cropResult);
    try {
        const res = await fetch("http://localhost:5000/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            renderError(cropResult, data.message || "Prediction failed");
            return;
        }

        renderCropResult(data);

        // Save concise record
        await fetch("http://localhost:5000/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, crop: data.crop, fertilizer: data.fertilizer })
        });
    } catch (err) {
        console.error(err);
        renderError(cropResult, err.message || "Unable to reach server");
    }
}

async function showAIDemo(payload) {
    renderLoading(aiResult);
    try {
        const res = await fetch("http://localhost:5000/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            renderError(aiResult, data.message || "AI demo failed");
            return;
        }

        renderAIResult(data.result);
    } catch (err) {
        console.error(err);
        renderError(aiResult, err.message || "Unable to reach AI server");
    }
}

form.addEventListener("submit", (e) => {
    e.preventDefault();
    predictCrop(getInputValues());
});

aiDemoBtn.addEventListener("click", (e) => {
    // Use current form values as context if available, otherwise demo values
    const input = getInputValues();
    const isEmpty = Object.values(input).every(v => v === 0);
    const payload = isEmpty ? { nitrogen:65, phosphorus:40, potassium:45, temperature:28, humidity:78, rainfall:115 } : input;
    showAIDemo(payload);
});

window.predictCrop = predictCrop;
window.showAIDemo = showAIDemo;