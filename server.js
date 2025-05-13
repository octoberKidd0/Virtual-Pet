const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");

const app = express();

// Enhanced CORS configuration
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(bodyParser.json());
app.use(express.static("public"));

// Pet management functions
function createNewPet() {
  return {
    name: "Pixel",
    hunger: 50,
    happiness: 50,
    energy: 50,
    isAlive: true,
  };
}

function savePetData(petData) {
  petData.isAlive =
    petData.hunger < 100 && petData.happiness > 0 && petData.energy > 0;
  fs.writeFileSync("pet.json", JSON.stringify(petData));
}

// Initialize pet data
let petData = createNewPet();

if (fs.existsSync("pet.json")) {
  try {
    const savedData = JSON.parse(fs.readFileSync("pet.json"));
    petData = savedData.isAlive ? savedData : createNewPet();
  } catch (e) {
    console.error("Invalid pet data, creating new pet");
    petData = createNewPet();
  }
} else {
  savePetData(petData);
}

// API Routes
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: Date.now() });
});

app.get("/api/pet", (req, res) => {
  res.json(petData);
});

const handlePetAction = (action) => {
  if (!petData.isAlive) return;

  switch (action) {
    case "feed":
      petData.hunger = Math.max(0, petData.hunger - 15);
      petData.energy = Math.min(100, petData.energy + 5);
      break;
    case "play":
      petData.happiness = Math.min(100, petData.happiness + 15);
      petData.energy = Math.max(0, petData.energy - 10);
      petData.hunger = Math.min(100, petData.hunger + 5);
      break;
    case "sleep":
      petData.energy = Math.min(100, petData.energy + 30);
      petData.hunger = Math.min(100, petData.hunger + 10);
      break;
    case "reset":
      petData = createNewPet();
      break;
  }

  savePetData(petData);
};

["feed", "play", "sleep", "reset"].forEach((action) => {
  app.post(`/api/${action}`, (req, res) => {
    handlePetAction(action);
    res.json(petData);
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  savePetData(petData); // Ensure initial file exists
});
