// models/user.js

const db = require('../config/database');
const bcrypt = require('bcrypt');

const User = {
    create: async (email, password) => {
        const hash = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO usuarios (email, password) VALUES (?, ?)',
            [email, hash]
        );
        return result.insertId;
    },

    findByEmail: async (email) => {
        const [rows] = await db.query(
            'SELECT * FROM usuarios WHERE email = ?',
            [email]
        );
        return rows[0];
    },

    findById: async (id) => {
        const [rows] = await db.query(
            'SELECT * FROM usuarios WHERE id = ?',
            [id]
        );
        return rows[0];
    },

    // NUEVA FUNCIÓN: Actualizar nombre y email del perfil
    updateProfile: async (id, nombre, email) => {
        const [result] = await db.query(
            'UPDATE usuarios SET nombre = ?, email = ? WHERE id = ?',
            [nombre, email, id]
        );
        return result.affectedRows > 0;
    },

    // NUEVA FUNCIÓN: Cambiar la contraseña
    updatePassword: async (id, newPasswordHash) => {
        const [result] = await db.query(
            'UPDATE usuarios SET password = ? WHERE id = ?',
            [newPasswordHash, id]
        );
        return result.affectedRows > 0;
    }
};

module.exports = User;