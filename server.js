const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const SECRET_KEY = "your-secure-key-123";
const USERS_DIR = path.join(__dirname, "users");

app.use(cors({ origin: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

// Initialize users directory
if (!fs.existsSync(USERS_DIR)) {
  fs.mkdirSync(USERS_DIR);
}

function createNewPet(petName = "Pixel") {
  return {
    name: petName,
    hunger: 50,
    happiness: 50,
    energy: 50,
    isAlive: true,
    achievements: {
      feedCount: 0,
      playCount: 0,
      sleepCount: 0,
      unlocked: [],
    },
  };
}

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    req.user = jwt.verify(token, SECRET_KEY);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

app.post("/api/register", async (req, res) => {
  const { username, password, petName } = req.body;
  const userPath = path.join(USERS_DIR, `${username}.json`);

  if (fs.existsSync(userPath)) {
    return res.status(400).json({ error: "Username exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const userData = {
    username,
    password: hashedPassword,
    pet: createNewPet(petName),
  };

  fs.writeFileSync(userPath, JSON.stringify(userData));
  res.status(201).json({ message: "User created" });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const userPath = path.join(USERS_DIR, `${username}.json`);

  if (!fs.existsSync(userPath)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const userData = JSON.parse(fs.readFileSync(userPath));
  const valid = await bcrypt.compare(password, userData.password);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "1h" });
  res.json({ token, pet: userData.pet });
});

app.get("/api/pet", authenticate, (req, res) => {
  const userPath = path.join(USERS_DIR, `${req.user.username}.json`);
  const userData = JSON.parse(fs.readFileSync(userPath));
  res.json(userData.pet);
});

const handlePetAction = (username, action) => {
  const userPath = path.join(USERS_DIR, `${username}.json`);
  const userData = JSON.parse(fs.readFileSync(userPath));
  const { pet } = userData;

  if (action === "reset") {
    if (!pet.isAlive && !pet.achievements.unlocked.includes("Grim Reaper")) {
      pet.achievements.unlocked.push("Grim Reaper");
    }
    userData.pet = createNewPet(pet.name);
  } else if (pet.isAlive) {
    switch (action) {
      case "feed":
        pet.hunger = Math.max(0, pet.hunger - 15);
        pet.energy = Math.min(100, pet.energy + 5);
        pet.achievements.feedCount++;
        break;
      case "play":
        pet.happiness = Math.min(100, pet.happiness + 15);
        pet.energy = Math.max(0, pet.energy - 10);
        pet.hunger = Math.min(100, pet.hunger + 5);
        pet.achievements.playCount++;
        break;
      case "sleep":
        pet.energy = Math.min(100, pet.energy + 30);
        pet.hunger = Math.min(100, pet.hunger + 10);
        pet.achievements.sleepCount++;
        break;
    }
  }

  pet.isAlive = pet.hunger < 100 && pet.happiness > 0 && pet.energy > 0;

  const achievements = [
    { condition: pet.achievements.feedCount >= 5, name: "Feeder Novice" },
    { condition: pet.achievements.playCount >= 5, name: "Playtime Pro" },
    { condition: pet.achievements.sleepCount >= 5, name: "Sleep Expert" },
    { condition: !pet.isAlive, name: "Grim Reaper" },
  ];

  achievements.forEach(({ condition, name }) => {
    if (condition && !pet.achievements.unlocked.includes(name)) {
      pet.achievements.unlocked.push(name);
    }
  });

  fs.writeFileSync(userPath, JSON.stringify(userData));
  return userData.pet;
};

["feed", "play", "sleep", "reset"].forEach((action) => {
  app.post(`/api/${action}`, authenticate, (req, res) => {
    const pet = handlePetAction(req.user.username, action);
    res.json(pet);
  });
});

setInterval(() => {
  fs.readdirSync(USERS_DIR).forEach((file) => {
    const userPath = path.join(USERS_DIR, file);
    const userData = JSON.parse(fs.readFileSync(userPath));
    if (userData.pet.isAlive) {
      userData.pet.hunger = Math.min(100, userData.pet.hunger + 2);
      userData.pet.happiness = Math.max(0, userData.pet.happiness - 1);
      userData.pet.energy = Math.max(0, userData.pet.energy - 1);
      handlePetAction(userData.username, "auto-update");
    }
  });
}, 300000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
