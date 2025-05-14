let currentUser = null;
let petState = null;
const API_BASE = "/api";

async function register() {
    const username = prompt("Enter username:");
    const password = prompt("Enter password:");
    const petName = prompt("Name your pet:", "Pixel");

    if (!username || !password) return;

    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password, petName }),
        });

        if (response.ok) {
            alert("Registration successful! Please login.");
            login();
        } else {
            const error = await response.json();
            alert(error.error || "Registration failed");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Connection error");
    }
}

async function login() {
    const username = prompt("Enter username:");
    const password = prompt("Enter password:");
    if (!username || !password) return;

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
            const { token, pet } = await response.json();
            localStorage.setItem("token", token);
            currentUser = username;
            petState = pet;
            updateUI();
        } else {
            const error = await response.json();
            alert(error.error || "Login failed");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Connection error");
    }
}

function logout() {
    localStorage.removeItem("token");
    currentUser = null;
    petState = null;
    updateUI();
}

async function updateStatus() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE}/pet`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });

        if (response.ok) {
            petState = await response.json();
            updateUI();
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

async function sendAction(action) {
    if (!currentUser) return;
    if (petState && !petState.isAlive && action !== "reset") return;

    try {
        const response = await fetch(`${API_BASE}/${action}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });

        if (response.ok) {
            petState = await response.json();
            updateUI();
        }
    } catch (error) {
        console.error("Error:", error);
    }
}

function updateUI() {
    const authSection = document.getElementById("auth-section");
    const petSection = document.getElementById("pet-section");
    const logoutButton = document.getElementById("logout-button");

    if (currentUser && petState) {
        authSection.style.display = "none";
        petSection.style.display = "block";
        logoutButton.style.display = "block";

        document.getElementById("user-title").textContent =
            `${currentUser}'s Pet`;
        document.getElementById("pet-name").textContent = petState.name;
        document.getElementById("hunger").textContent = petState.hunger;
        document.getElementById("happiness").textContent = petState.happiness;
        document.getElementById("energy").textContent = petState.energy;

        const statusMessage = document.getElementById("status-message");
        statusMessage.textContent = petState.isAlive
            ? getMoodMessage(petState)
            : "Your pet has passed away 💔";
        statusMessage.style.color = petState.isAlive ? "#666" : "red";

        document.getElementById("achievements-list").innerHTML =
            petState.achievements.unlocked.map((a) => `<li>${a}</li>`).join("");

        document
            .querySelectorAll(".controls button:not(#reset-button)")
            .forEach((button) => {
                button.disabled = !petState.isAlive;
            });
    } else {
        authSection.style.display = "flex";
        petSection.style.display = "none";
        logoutButton.style.display = "none";
    }
}

function getMoodMessage(pet) {
    if (pet.hunger > 80) return "I'm starving!";
    if (pet.happiness < 20) return "I'm so lonely...";
    if (pet.energy < 20) return "I need to sleep...";
    if (pet.happiness > 80) return "I love you!";
    return "I'm feeling okay!";
}

const feed = () => sendAction("feed");
const play = () => sendAction("play");
const sleep = () => sendAction("sleep");
const resetPet = () => sendAction("reset");

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    if (token) {
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            currentUser = payload.username;
            updateStatus();
        } catch (error) {
            localStorage.removeItem("token");
        }
    }

    setInterval(() => {
        if (document.visibilityState === "visible" && currentUser) {
            updateStatus();
        }
    }, 5000);
});
