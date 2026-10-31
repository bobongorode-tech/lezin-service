const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Base de données SQLite
const dbPath = path.resolve(__dirname, 'cremerie.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur DB :', err.message);
  } else {
    console.log('Connecté à la base de données SQLite.');
  }
});

// Création de la table users si elle n'existe pas
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`, (err) => {
    if (err) console.error("Erreur création table :", err.message);
  });
});

// Route racine
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Route Inscription (/api/register)
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Nom d\'utilisateur et mot de passe requis' });
  }

  db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, password], function(err) {
    if (err) {
      return res.status(400).json({ success: false, message: 'Ce nom d\'utilisateur existe déjà' });
    }
    res.json({ success: true, message: 'Compte créé avec succès' });
  });
});

// Route Connexion (/api/login)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
    
    if (row) {
      res.json({ success: true, redirect: '/dashboard.html' });
    } else {
      res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }
  });
});

// Démarrage
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});