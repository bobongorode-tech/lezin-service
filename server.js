const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Middleware pour analyser les requêtes JSON et les formulaires
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Servir les fichiers statiques (HTML, CSS, JS, images, PWA) depuis le dossier 'public'
app.use(express.static(path.join(__dirname, 'public')));

// 3. Connexion et initialisation de la base de données SQLite (cremerie.db)
const dbPath = path.resolve(__dirname, 'cremerie.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur d\'ouverture de la base de données :', err.message);
  } else {
    console.log('Connecté à la base de données SQLite (cremerie.db).');
  }
});

// Création automatique de la table users et d'un compte admin par défaut si la table est vide
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`, (err) => {
    if (!err) {
      db.get(`SELECT COUNT(*) as count FROM users`, (err, row) => {
        if (row && row.count === 0) {
          db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, ['admin', '1234'], (err) => {
            if (!err) console.log('Utilisateur administrateur par défaut créé (admin / 1234).');
          });
        }
      });
    }
  });
});

// 4. Routes de l'application

// Route racine : sert la page de connexion
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Route API de Connexion (/api/login)
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
    }
    
    if (row) {
      // Connexion réussie, renvoie l'URL de redirection vers le dashboard
      res.json({ success: true, redirect: '/dashboard.html' });
    } else {
      // Identifiants incorrects
      res.status(401).json({ success: false, message: 'Nom d\'utilisateur ou mot de passe incorrect' });
    }
  });
});

// Route API d'Inscription (/api/register)
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Nom d\'utilisateur et mot de passe requis' });
  }

  db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, password], function(err) {
    if (err) {
      console.error(err);
      return res.status(400).json({ success: false, message: 'Ce nom d\'utilisateur existe déjà ou une erreur est survenue' });
    }
    res.json({ success: true, message: 'Utilisateur créé avec succès' });
  });
});

// 5. Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});