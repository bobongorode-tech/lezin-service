const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de base
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuration des sessions
app.use(session({
    secret: 'lezin-service-secret-key-2026',
    resave: false,
    saveUninitialized: false
}));

// Connexion et initialisation de la base de données SQLite
const dbFile = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('Erreur d\'ouverture de la base de données', err.message);
    } else {
        console.log('Connecté à la base de données SQLite.');
    }
});

// Création des tables si elles n'existent pas
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE,
        password TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_phone TEXT,
        type TEXT,
        amount REAL,
        description TEXT,
        date TEXT
    )`);
});

// ==========================================
// ROUTES API - AUTHENTIFICATION
// ==========================================

// Inscription
app.post('/api/register', (req, res) => {
    const { phone, password } = req.body;
    if (!phone || !password) {
        return res.json({ success: false, error: 'Téléphone et mot de passe requis' });
    }

    db.run('INSERT INTO users (phone, password) VALUES (?, ?)', [phone, password], function(err) {
        if (err) {
            return res.json({ success: false, error: 'Ce numéro de téléphone est déjà enregistré.' });
        }
        res.json({ success: true });
    });
});

// Connexion
app.post('/api/login', (req, res) => {
    const { phone, password } = req.body;
    db.get('SELECT * FROM users WHERE phone = ? AND password = ?', [phone, password], (err, row) => {
        if (err) return res.json({ success: false, error: 'Erreur serveur' });
        if (!row) return res.json({ success: false, error: 'Identifiants incorrects' });

        // Enregistrement de l'utilisateur dans la session
        req.session.user = { phone: row.phone };
        res.json({ success: true, phone: row.phone });
    });
});

// Déconnexion (gère à la fois GET et POST pour éviter l'erreur Cannot GET)
app.all('/api/logout', (req, res) => {
    req.session.destroy(() => {
        if (req.method === 'POST') {
            res.json({ success: true });
        } else {
            res.redirect('/login.html');
        }
    });
});

// ==========================================
// ROUTES API - TRANSACTIONS
// ==========================================

// Récupérer les transactions (Admin voit tout, Vendeur voit uniquement les siennes)
app.get('/api/transactions', (req, res) => {
    const userPhone = req.session?.user?.phone;

    let query = 'SELECT * FROM transactions ORDER BY id DESC';
    let params = [];

    // Si ce n'est pas l'admin (065116534), on filtre par le numéro du vendeur
    if (userPhone && userPhone !== '065116534') {
        query = 'SELECT * FROM transactions WHERE user_phone = ? ORDER BY id DESC';
        params = [userPhone];
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.json({ success: false, error: err.message });
        res.json({ success: true, transactions: rows });
    });
});

// Ajouter une transaction
app.post('/api/transactions', (req, res) => {
    const userPhone = req.session?.user?.phone;
    if (!userPhone) {
        return res.status(401).json({ success: false, error: 'Non autorisé. Veuillez vous reconnecter.' });
    }

    const { type, amount, description, date } = req.body;
    const txDate = date || new Date().toISOString().slice(0, 10);

    db.run('INSERT INTO transactions (user_phone, type, amount, description, date) VALUES (?, ?, ?, ?, ?)',
        [userPhone, type, amount, description, txDate],
        function(err) {
            if (err) return res.json({ success: false, error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Supprimer une transaction (Admin ou propriétaire de la ligne)
app.delete('/api/transactions/:id', (req, res) => {
    const { id } = req.params;
    const userPhone = req.session?.user?.phone;

    if (!userPhone) {
        return res.status(401).json({ success: false, error: 'Non autorisé' });
    }

    const query = userPhone === '065116534' 
        ? 'DELETE FROM transactions WHERE id = ?' 
        : 'DELETE FROM transactions WHERE id = ? AND user_phone = ?';
    
    const params = userPhone === '065116534' ? [id] : [id, userPhone];

    db.run(query, params, function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (this.changes === 0) {
            return res.status(403).json({ success: false, error: 'Action non autorisée ou transaction introuvable' });
        }
        
        res.json({ success: true, message: 'Transaction supprimée avec succès' });
    });
});

// Lancement du serveur
app.listen(PORT, () => {
    console.log(`Serveur Lezin Service en écoute sur http://localhost:${PORT}`);
});