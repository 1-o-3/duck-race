const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const app = express();
const PORT = 3000;

// Database Setup
const adapter = new FileSync('db.json');
const db = low(adapter);

// Set defaults
db.defaults({ profiles: {} }).write();

app.use(cors());
app.use(bodyParser.json());

// Serve static files from the current directory (for frontend)
app.use(express.static(__dirname));

// API Routes
app.get('/api/profiles', (req, res) => {
    const profiles = db.get('profiles').value();
    res.json(profiles);
});

app.post('/api/profiles', (req, res) => {
    const { name, balance } = req.body;
    if (!name) return res.status(400).send("Name required");

    db.get('profiles').set(name, { balance: balance || 1000 }).write();
    res.json(db.get('profiles').get(name).value());
});

app.listen(PORT, () => {
    console.log(`Duck Race Server running at http://localhost:${PORT}`);
});
