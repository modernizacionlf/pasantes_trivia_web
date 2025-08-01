const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const pool = require('./db');
const app = express();

app.use(session({
    secret: 'trivia_fiscalizadores_secret_key_2024', 
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, 
        httpOnly: true, 
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../uploads/preguntas')));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));


const registerRoutes = require('./routes/register');
const { router: authRoutes } = require('./routes/auth'); 
const pagesRoutes = require('./routes/pages');
const fiscalizadoresRoutes = require('./routes/fiscalizadores');
const categoriesRoutes = require('./routes/categories');
const gameRoutes = require('./routes/game');
const preguntasRoutes = require('./routes/preguntas');

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error al conectarse a la DB', err);
    } else {
        console.log('Conexión exitosa. Fecha actual desde PostgreSQL:', res.rows[0]);
    }
});


app.use('/register', registerRoutes);
app.use('/auth', authRoutes); 
app.use('/pages', pagesRoutes);
app.use('/fiscalizadores', fiscalizadoresRoutes);
app.use('/categories', categoriesRoutes);
app.use('/api/game', gameRoutes);
app.use('/preguntas', preguntasRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/login', (req, res) => {
    res.redirect('/pages/login');
});
app.get('/dashboard', (req, res) => {
    res.redirect('/pages/dashboard');
});
app.get('/', (req, res) => {
    if (req.session && req.session.fiscalizador) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});