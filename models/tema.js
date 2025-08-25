// models/tema.js
const db = require('../config/database');

const Tema = {
    // Versión simplificada que coincide con tu tabla actual
    create: async (titulo, idUnidad) => {
        const [result] = await db.query(
            'INSERT INTO Temas (titulo_tema, id_unidad_fk) VALUES (?, ?)',
            [titulo, idUnidad]
        );
        return result.insertId;
    }
};

module.exports = Tema;