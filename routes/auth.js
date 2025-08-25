// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/user');

const router = express.Router();

// --- Middlewares de Autenticación ---

const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    req.flash('error_msg', 'Debes iniciar sesión para acceder a esta página.');
    res.redirect('/auth/login');
};

const redirectIfAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        return res.redirect('/app');
    }
    return next();
};

// --- Rutas Públicas (accesibles sin iniciar sesión) ---

router.get('/', redirectIfAuth, (req, res) => res.redirect('/auth/login'));

router.get('/login', redirectIfAuth, (req, res) => res.render('auth_view'));

router.post('/register', redirectIfAuth, async (req, res) => {
    try {
        const { email, password, confirmPassword } = req.body;

        if (!email || !password || !confirmPassword) {
            req.flash('error_msg', 'Todos los campos son requeridos.');
            return res.redirect('/auth/login');
        }
        if (password !== confirmPassword) {
            req.flash('error_msg', 'Las contraseñas no coinciden.');
            return res.redirect('/auth/login');
        }
        if (password.length < 6) {
            req.flash('error_msg', 'La contraseña debe tener al menos 6 caracteres.');
            return res.redirect('/auth/login');
        }

        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            req.flash('error_msg', 'El correo electrónico ya está registrado.');
            return res.redirect('/auth/login');
        }

        const userId = await User.create(email, password);
        req.session.userId = userId;
        
        req.flash('success_msg', '¡Cuenta creada! Has iniciado sesión correctamente.');
        res.redirect('/app');
    } catch (error) {
        console.error('Error en el registro:', error);
        req.flash('error_msg', 'Error en el servidor durante el registro.');
        res.redirect('/auth/login');
    }
});

router.post('/login', redirectIfAuth, async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findByEmail(email);

        // CASO 1: El usuario NO existe
        if (!user) {
            req.flash('error_msg', 'No existe una cuenta con ese email. ¿Deseas registrarte?');
            return res.redirect('/auth/login');
        }

        const passwordValida = await bcrypt.compare(password, user.password);

        // CASO 2: La contraseña es INCORRECTA
        if (!passwordValida) {
            req.flash('error_msg', 'Contraseña incorrecta. Inténtalo de nuevo o recupera tu contraseña.');
            return res.redirect('/auth/login');
        }

        // CASO 3: Éxito
        req.session.userId = user.id;
        req.flash('success_msg', '¡Bienvenido de nuevo!');
        res.redirect('/app');

    } catch (error) {
        console.error('Error en el login:', error);
        req.flash('error_msg', 'Ocurrió un error en el servidor.');
        res.redirect('/auth/login');
    }
});

// --- Rutas Privadas (requieren iniciar sesión) ---

router.get('/logout', requireAuth, (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error cerrando sesión:', err);
            return next(err);
        }
        res.clearCookie('connect.sid');
        res.redirect('/auth/login');
    });
});

router.get('/perfil', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        if (!user) {
            req.flash('error_msg', 'Usuario no encontrado.');
            return res.redirect('/auth/logout');
        }
        res.render('auth/perfil', { user });
    } catch (error) {
        console.error('Error cargando perfil:', error);
        req.flash('error_msg', 'Error al cargar el perfil.');
        res.redirect('/app');
    }
});

router.post('/perfil', requireAuth, async (req, res) => {
    try {
        const { nombre, email } = req.body;
        if (!nombre || !email) {
            req.flash('error_msg', 'Nombre y email son requeridos.');
            return res.redirect('/auth/perfil');
        }
        
        await User.updateProfile(req.session.userId, nombre.trim(), email.toLowerCase());
        
        req.flash('success_msg', 'Perfil actualizado correctamente.');
        res.redirect('/auth/perfil');
    } catch (error) {
        console.error('Error actualizando perfil:', error);
        req.flash('error_msg', 'Error al actualizar el perfil.');
        res.redirect('/auth/perfil');
    }
});

router.post('/cambiar-password', requireAuth, async (req, res) => {
    try {
        const { passwordActual, passwordNueva, confirmarPassword } = req.body;

        if (!passwordActual || !passwordNueva || !confirmarPassword) {
            req.flash('error_msg', 'Todos los campos son requeridos.');
            return res.redirect('/auth/perfil');
        }
        if (passwordNueva !== confirmarPassword) {
            req.flash('error_msg', 'Las contraseñas nuevas no coinciden.');
            return res.redirect('/auth/perfil');
        }
        if (passwordNueva.length < 6) {
            req.flash('error_msg', 'La nueva contraseña debe tener al menos 6 caracteres.');
            return res.redirect('/auth/perfil');
        }

        const user = await User.findById(req.session.userId);
        if (!user) {
            req.flash('error_msg', 'Usuario no encontrado.');
            return res.redirect('/auth/logout');
        }

        const passwordValida = await bcrypt.compare(passwordActual, user.password);
        if (!passwordValida) {
            req.flash('error_msg', 'La contraseña actual es incorrecta.');
            return res.redirect('/auth/perfil');
        }

        const newPasswordHash = await bcrypt.hash(passwordNueva, 10);
        await User.updatePassword(req.session.userId, newPasswordHash);

        req.flash('success_msg', 'Contraseña cambiada correctamente.');
        res.redirect('/auth/perfil');
    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        req.flash('error_msg', 'Error al cambiar la contraseña.');
        res.redirect('/auth/perfil');
    }
});

module.exports = {
    router,
    requireAuth
};