// models/unidad.js
const db = require('../config/database');

const Unidad = {
    // FUNCIÓN Crear una nueva unidad para una relación específica
    create: async (nombre, id_relacion) => {
        const [result] = await db.query(
            'INSERT INTO Unidades (nombre_unidad, id_relacion_fk) VALUES (?, ?)',
            [nombre, id_relacion]
        );
        return result.insertId;
    },
    
    // FUNCIÓN CORREGIDA: Busca unidades por el ID de la relación, no por el de la materia
    findByRelacionIdWithTemas: async (relacionId) => {
        const [rows] = await db.query(`
            SELECT u.id_unidad, u.nombre_unidad, t.id_tema, t.numero_tema, t.titulo_tema 
            FROM Unidades u 
            LEFT JOIN Temas t ON u.id_unidad = t.id_unidad_fk 
            WHERE u.id_relacion_fk = ? 
            ORDER BY u.orden, t.numero_tema`,
            [relacionId]
        );
        return rows;
    }
};

module.exports = Unidad;