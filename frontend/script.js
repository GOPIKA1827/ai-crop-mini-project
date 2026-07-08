console.log("✅ JS Connected");
// ==========================
// SCROLL ANIMATION
// ==========================
const cards = document.querySelectorAll(".step-card");
function showOnScroll() {
    const trigger = window.innerHeight - 100;
    cards.forEach((card, index) => {
        const top = card.getBoundingClientRect().top;
        if (top < trigger) {
            setTimeout(() => {
                card.classList.add("show");
            }, index * 150);

        }
    });
}
window.addEventListener("scroll", showOnScroll);
showOnScroll();
// ==========================
// OPTIONAL AI DEMO FUNCTION
// ==========================
async function getAIRecommendation() {
    try {
        const response = await fetch(
            "http://localhost:5000/predict-ai",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    nitrogen: 90,
                    phosphorus: 40,
                    potassium: 40,
                    temperature: 28,
                    humidity: 70,
                    rainfall: 120
                })
            }
        );

        const data = await response.json();

        console.log(data);

    } catch (error) {

        console.log("❌ AI Error:", error);

    }
}