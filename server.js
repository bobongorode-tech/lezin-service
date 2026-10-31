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
    console.error('Erreur ouverture DB :', err.message);
  } else {
    console.log('Connecté à la base de données SQLite.');
  }
});

// Création garantie de la table users au démarrage
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`, (err) => {
    if (err) {
      console.error("Erreur création table users :", err.message);
    } else {
      console.log("Table 'users' vérifiée/créée avec succès.");
    }
  });
});

// Route racine
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Route Inscription (/api/register) avec logs de diagnostic
app.post('/api/register', (req, res) => {
  console.log("Données d'inscription reçues :", req.body);
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Nom d\'utilisateur et mot de passe requis', received: req.body });
  }

  db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, password], function(err) {
    if (err) {
      console.error("Erreur SQL insertion :", err.message);
      return res.status(400).json({ success: false, message: 'Ce nom d\'utilisateur existe déjà ou erreur SQL' });
    }
    res.json({ success: true, message: 'Compte créé avec succès' });
  });
});

// Route Connexion (/api/login) avec logs de diagnostic
app.post('/api/login', (req, res) => {
  console.log("Tentative de connexion reçue :", req.body);
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Champs manquants' });
  }

  db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
    if (err) {
      console.error("Erreur SQL SELECT :", err.message);
      return res.status(500).json({ success: false, message: 'Erreur interne base de données: ' + err.message });
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