// models/establecimiento.js
const db = require('../config/database');

const Establecimiento = {
    createForUser: async (nombre, userId) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            // 1. Insertar el establecimiento si no existe
            await connection.query('INSERT IGNORE INTO Establecimientos (nombre_establecimiento) VALUES (?)', [nombre]);

            // 2. Obtener su ID
            const [rows] = await connection.query('SELECT id_establecimiento FROM Establecimientos WHERE nombre_establecimiento = ?', [nombre]);
            const establecimientoId = rows[0].id_establecimiento;

            // 3. Crear la asociación en la NUEVA tabla Usuarios_Establecimientos
            await connection.query(
                'INSERT IGNORE INTO Usuarios_Establecimientos (id_usuario_fk, id_establecimiento_fk) VALUES (?, ?)',
                [userId, establecimientoId]
            );
            
            await connection.commit();
            //console.log(`[DEBUG] Asociación creada en Usuarios_Establecimientos: Usuario ID=${userId}, Establecimiento ID=${establecimientoId}`);
            return establecimientoId;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },
    
    findByUserId: async (userId) => {
        const [rows] = await db.query(`
            SELECT e.id_establecimiento, e.nombre_establecimiento
            FROM Establecimientos e
            JOIN Usuarios_Establecimientos ue ON e.id_establecimiento = ue.id_establecimiento_fk
            WHERE ue.id_usuario_fk = ?`,
            [userId]
        );
        return rows;
    }
};

module.exports = Establecimiento;