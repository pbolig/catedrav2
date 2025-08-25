// scripts/seed-database.js
const db = require('../config/database'); // <-- Importamos nuestro pool ya configurado
const bcrypt = require('bcrypt');

async function seedDatabase() {
    try {
        console.log('🌱 Comenzando el sembrado de la base de datos...');

        // --- Sembrado de la tabla de Usuarios ---
        console.log('   - Sembrando usuarios...');
        const usuariosParaSeed = [
            { email: 'admin@catedra.com', password: 'adminpassword' },
            { email: 'profesor@catedra.com', password: 'profesorpassword' }
        ];

        for (const userData of usuariosParaSeed) {
            const hashedPassword = await bcrypt.hash(userData.password, 10);
            const query = 'INSERT IGNORE INTO usuarios (email, password) VALUES (?, ?)';
            // Ahora 'db' es el pool con promesas, no necesitamos db.promise()
            await db.query(query, [userData.email, hashedPassword]);
        }
        console.log('   ✅ Usuarios sembrados con éxito.');

        // --- Sembrado de Unidades ---
        console.log('   - Sembrando unidades...');
        await db.query(`INSERT IGNORE INTO Unidades (id_unidad, id_materia_fk, nombre_unidad, orden) VALUES (1, 1, 'Unidad 1: Recursos instrumentales', 1)`);
        await db.query(`INSERT IGNORE INTO Unidades (id_unidad, id_materia_fk, nombre_unidad, orden) VALUES (2, 1, 'Unidad 2: Procesamiento de textos', 2)`);
        await db.query(`INSERT IGNORE INTO Unidades (id_unidad, id_materia_fk, nombre_unidad, orden) VALUES (3, 1, 'Unidad 3: Hardware y Software', 3)`);
        await db.query(`INSERT IGNORE INTO Unidades (id_unidad, id_materia_fk, nombre_unidad, orden) VALUES (4, 1, 'Unidad 4: Antecedentes e historia de la computadora', 4)`);
        console.log('   ✅ Unidades sembradas con éxito.');
        
        // --- Sembrado de Temas ---
        console.log('   - Sembrando temas...');
        const temasBasicos = [
            [1, '1.1', 'Equipamiento de las aulas y de la red del Dpto. TIC. Reglamento de las aulas'],
            [1, '1.2', 'Cuenta de correo'],
            [1, '1.3', 'Campus Virtual UNR Comunidades'],
            [2, '2.1', 'Documento de texto con formato'],
            [2, '2.2', 'Hipertexto e hiperenlace'],
            [3, '3.1', 'Componentes del sistema informático'],
            [3, '3.2', 'Hardware y Software'],
            [4, '4.1', 'Historia de la computadora']
        ];
        
        for (const [unidad, numero, titulo] of temasBasicos) {
            await db.query('INSERT IGNORE INTO Temas (id_unidad_fk, numero_tema, titulo_tema) VALUES (?, ?, ?)', [unidad, numero, titulo]);
        }
        console.log('   ✅ Temas básicos sembrados con éxito.');

        console.log('\n🎉 Sembrado de la base de datos completado.');

    } catch (error) {
        console.error('❌ Error durante el sembrado:', error);
    } finally {
        // Cierra todas las conexiones en el pool para que el script termine
        await db.end();
    }
}

seedDatabase();