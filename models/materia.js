// models/materia.js
const db = require('../config/database');

const Materia = {
    // Obtener todas las materias (eventualmente será por usuario)
    getAll: async () => {
        const [rows] = await db.query('SELECT * FROM Materias ORDER BY nombre_materia');
        return rows;
    },

    // Encontrar una materia por su ID
    findById: async (id) => {
        const [rows] = await db.query('SELECT * FROM Materias WHERE id_materia = ?', [id]);
        return rows[0];
    },

    // Crear una nueva materia
    create: async (nombre, codigo) => {
        const [result] = await db.query(
            'INSERT INTO Materias (nombre_materia, codigo_materia) VALUES (?, ?)',
            [nombre, codigo]
        );
        return result.insertId;
    }
    
    // Aquí podrías añadir funciones para update() y delete() en el futuro
};

module.exports = Materia;