// server.js
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
require('dotenv').config();

// Importar los routers
const { router: authRoutes } = require('./routes/auth'); // Importamos solo el objeto router
const appRoutes = require('./routes/app');              // <-- Ahora sí lo importamos

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Motor de plantillas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configuración de Sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'tu_clave_secreta_aqui',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Poner en 'true' si usas HTTPS
}));

app.use(flash()); // Inicializa connect-flash

// Middleware para pasar mensajes flash a todas las vistas
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    next();
});

// --- Montaje de Rutas ---
app.use('/auth', authRoutes);
app.use('/app', appRoutes);  // <-- Esta línea ahora funcionará

// Ruta raíz que redirige según el estado de la sesión
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/app');
    } else {
        res.redirect('/auth/login');
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});