// models/contenido.js
const db = require('../config/database');

const Contenido = {
    create: async (idTema, tipo, cuerpo) => {
        const [result] = await db.query(
            'INSERT INTO Contenidos (id_tema_fk, tipo_contenido, cuerpo) VALUES (?, ?, ?)',
            [idTema, tipo, cuerpo]
        );
        return result.insertId;
    },

    update: async (idContenido, tipo, cuerpo) => {
        const [result] = await db.query(
            'UPDATE Contenidos SET tipo_contenido = ?, cuerpo = ? WHERE id_contenido = ?',
            [tipo, cuerpo, idContenido]
        );
        return result.affectedRows; // Devuelve 1 si la actualización fue exitosa
    },

    delete: async (idContenido) => {
        const [result] = await db.query(
            'DELETE FROM Contenidos WHERE id_contenido = ?',
            [idContenido]
        );
        return result.affectedRows; // Devuelve 1 si la eliminación fue exitosa
    }
};

module.exports = Contenido;