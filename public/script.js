const API_BASE = "/api";
let isOnline = true;
let retryCount = 0;

async function checkConnection() {
    try {
        const response = await fetch("/health");
        return response.ok;
    } catch {
        return false;
    }
}

async function networkRetry(fn, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            isOnline = await checkConnection();
            if (!isOnline) throw new Error("Offline");
            return await fn();
        } catch (error) {
            if (attempt === maxRetries) throw error;
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
            console.log(`Retry attempt ${attempt}`);
        }
    }
}

async function updateStatus() {
    try {
        await networkRetry(async () => {
            const response = await fetch(`${API_BASE}/pet`);
            if (!response.ok) throw new Error("Server error");

            const newState = await response.json();
            petState = { ...newState };

            updateDisplay();
            return true;
        });

        retryCount = 0;
    } catch (error) {
        handleNetworkError(error);
    }
}

function updateDisplay() {
    document.getElementById("pet-name").textContent = petState.name;
    document.getElementById("hunger").textContent = petState.hunger;
    document.getElementById("happiness").textContent = petState.happiness;
    document.getElementById("energy").textContent = petState.energy;

    const statusMessage = document.getElementById("status-message");
    statusMessage.textContent = petState.isAlive
        ? getMoodMessage()
        : "Your pet has passed away 💔";
    statusMessage.style.color = petState.isAlive ? "#666" : "red";

    disableButtons(!petState.isAlive);
}

function getMoodMessage() {
    if (petState.hunger > 80) return "I'm starving!";
    if (petState.happiness < 20) return "I'm so lonely...";
    if (petState.energy < 20) return "I need to sleep...";
    if (petState.happiness > 80) return "I love you!";
    return "I'm feeling okay!";
}

async function sendAction(action) {
    try {
        showMessage("Processing...", "blue");
        disableButtons(true);

        await networkRetry(async () => {
            const response = await fetch(`${API_BASE}/${action}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) throw new Error("Action failed");
            await updateStatus();
            showMessage("Action successful!", "green", 2000);
        });
    } catch (error) {
        showMessage(`Failed: ${error.message}`, "orange");
    } finally {
        disableButtons(false);
    }
}

function showMessage(text, color, duration = 3000) {
    const statusMessage = document.getElementById("status-message");
    statusMessage.textContent = text;
    statusMessage.style.color = color;
    if (duration) setTimeout(() => (statusMessage.textContent = ""), duration);
}

function disableButtons(disabled) {
    document.querySelectorAll("button").forEach((button) => {
        button.disabled = disabled || !petState.isAlive;
    });
}

function handleNetworkError(error) {
    console.error("Network error:", error);
    retryCount++;

    if (retryCount > 3) {
        showMessage("Severe connection issues - please refresh", "red");
        disableButtons(true);
    } else {
        showMessage(`Connection problem (retry ${retryCount}/3)...`, "orange");
        setTimeout(updateStatus, 2000 * retryCount);
    }
}

// Action bindings
const feed = () => sendAction("feed");
const play = () => sendAction("play");
const sleep = () => sendAction("sleep");
const resetPet = () => sendAction("reset");

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    updateStatus();
    setInterval(() => {
        if (document.visibilityState === "visible") updateStatus();
    }, 5000);
});
