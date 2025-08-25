// scripts/test-insert.js
const db = require('../config/database');

async function testInsert() {
    console.log('--- Iniciando prueba de inserción directa ---');
    try {
        // Usa los IDs que sabemos que existen de tus pruebas anteriores
        const userId = 5; 
        const establecimientoId = 7; // El ID de uno de tus establecimientos
        const materiaIdPlaceholder = 0;

        console.log(`Intentando insertar en Usuarios_Materias: Usuario=${userId}, Establecimiento=${establecimientoId}`);

        // Hacemos una inserción directa, sin transacciones
        const [result] = await db.query(
            'INSERT INTO Usuarios_Materias (id_usuario_fk, id_establecimiento_fk, id_materia_fk) VALUES (?, ?, ?)',
            [userId, establecimientoId, materiaIdPlaceholder]
        );

        console.log('✅ Inserción directa completada. Resultado:', result);

    } catch (error) {
        console.error('❌ ERROR en la inserción directa:', error);
    } finally {
        await db.end(); // Cerramos la conexión para que el script termine
        console.log('--- Prueba finalizada. Conexión cerrada. ---');
    }
}

testInsert();