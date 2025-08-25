// scripts/update-database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

// Función helper para verificar si una columna ya existe en una tabla
async function columnExists(connection, tableName, columnName) {
    const [columns] = await connection.execute(`
        SHOW COLUMNS FROM \`${tableName}\` LIKE '${columnName}'
    `);
    return columns.length > 0;
}

async function indexExists(connection, tableName, indexName) {
    const [indexes] = await connection.execute(`
        SHOW INDEX FROM \`${tableName}\` WHERE Key_name = '${indexName}'
    `);
    return indexes.length > 0;
}

// NUEVA FUNCIÓN HELPER: para verificar si una Foreign Key ya existe
async function foreignKeyExists(connection, tableName, constraintName) {
    const [keys] = await connection.execute(`
        SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND TABLE_SCHEMA = DATABASE()
    `, [tableName, constraintName]);
    return keys.length > 0;
}

async function updateDatabase() {
    let connection;
    try {
        console.log('🔄 Verificando y actualizando estructura de la base de datos...');
        
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'catedra_db'
        };
        
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conexión a la base de datos establecida.');
        
        // --- 1. GESTIÓN DE LA TABLA tipo_contenido ---
        console.log('--- Sección: Tipos de Contenido ---');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS tipo_contenido (
                id_tipo_contenido INT AUTO_INCREMENT PRIMARY KEY,
                descripcion VARCHAR(100) NOT NULL UNIQUE,
                aplicaIA ENUM('SI', 'NO') DEFAULT 'SI',
                orden INT DEFAULT 0,
                activo TINYINT(1) DEFAULT 1
            )
        `);
        console.log('   -> Tabla "tipo_contenido" asegurada.');

        const tiposContenido = [
            ['definicion', 'SI', 1], ['narración', 'SI', 2], ['subtítulo', 'SI', 3],
            ['info', 'SI', 4], ['tip', 'SI', 5], ['guion', 'SI', 6],
            ['alerta', 'SI', 7], ['desafio', 'SI', 8], ['código', 'NO', 9],
            ['ejemplo', 'SI', 10], ['resumen', 'SI', 11], ['conclusión', 'SI', 12]
        ];
        
        for (const [desc, aplica, orden] of tiposContenido) {
            await connection.execute(`INSERT IGNORE INTO tipo_contenido (descripcion, aplicaIA, orden) VALUES (?, ?, ?)`, [desc, aplica, orden]);
        }
        console.log('   -> Tipos de contenido por defecto insertados/verificados.');
        
        // --- 2. MIGRACIÓN DE DATOS DE LA TABLA Contenidos (SOLO SI ES NECESARIO) ---
        console.log('\n--- Sección: Migración de Contenidos ---');
        if (!await columnExists(connection, 'Contenidos', 'id_tipo_contenido_fk')) {
            console.log('   -> Realizando migración de la tabla "Contenidos"...');
            await connection.execute(`ALTER TABLE Contenidos ADD COLUMN id_tipo_contenido_fk INT NULL`);
            await connection.execute(`
                UPDATE Contenidos c JOIN tipo_contenido tc ON c.tipo_contenido = tc.descripcion
                SET c.id_tipo_contenido_fk = tc.id_tipo_contenido
            `);
            // Aquí podrías añadir la FOREIGN KEY si lo deseas
            console.log('   -> Migración completada.');
        } else {
            console.log('   -> La tabla "Contenidos" ya está migrada. No se requieren acciones.');
        }

        // --- 3. GESTIÓN DE NUEVAS TABLAS Y ACTUALIZACIONES ---
        console.log('\n--- Sección: Estructura de Usuarios y Establecimientos ---');
        if (!await columnExists(connection, 'usuarios', 'nombre')) {
            await connection.execute(`ALTER TABLE usuarios ADD COLUMN nombre VARCHAR(255)`);
            console.log('   -> Columna "nombre" añadida a la tabla "usuarios".');
        } else {
            console.log('   -> La columna "nombre" ya existe en "usuarios".');
        }

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Establecimientos (
                id_establecimiento INT AUTO_INCREMENT PRIMARY KEY,
                nombre_establecimiento VARCHAR(255) NOT NULL UNIQUE
            )
        `);
        console.log('   -> Tabla "Establecimientos" asegurada.');

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Usuarios_Materias (
                id INT AUTO_INCREMENT PRIMARY KEY,
                id_usuario_fk INT NOT NULL,
                id_materia_fk INT NOT NULL,
                id_establecimiento_fk INT NOT NULL,
                FOREIGN KEY (id_usuario_fk) REFERENCES usuarios(id) ON DELETE CASCADE,
                FOREIGN KEY (id_materia_fk) REFERENCES Materias(id_materia) ON DELETE CASCADE,
                FOREIGN KEY (id_establecimiento_fk) REFERENCES Establecimientos(id_establecimiento) ON DELETE CASCADE,
                UNIQUE KEY relacion_unica (id_usuario_fk, id_materia_fk, id_establecimiento_fk)
            )
        `);
        console.log('   -> Tabla "Usuarios_Materias" asegurada.');

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Usuarios_Establecimientos (
                id_usuario_fk INT NOT NULL,
                id_establecimiento_fk INT NOT NULL,
                PRIMARY KEY (id_usuario_fk, id_establecimiento_fk),
                FOREIGN KEY (id_usuario_fk) REFERENCES usuarios(id) ON DELETE CASCADE,
                FOREIGN KEY (id_establecimiento_fk) REFERENCES Establecimientos(id_establecimiento) ON DELETE CASCADE
            );
        `);
        console.log('   -> Tabla "Usuarios_Establecimientos" asegurada.');

        // ====================================================================
        // ===== INICIO: CÓDIGO AÑADIDO PARA ACTUALIZAR LA TABLA UNIDADES =====
        // ====================================================================
        
        console.log('\n--- Sección: Re-estructuración de Unidades ---');

        if (await columnExists(connection, 'Unidades', 'id_materia_fk')) {
            console.log('   -> Modificando "Unidades" para vincular con la nueva tabla pivote...');
            try {
                await connection.execute(`ALTER TABLE Unidades DROP FOREIGN KEY unidades_ibfk_1`);
            } catch (error) {
                console.log('      -> (Advertencia) No se pudo eliminar la Foreign Key (puede que no exista o tenga otro nombre).');
            }
            await connection.execute(`ALTER TABLE Unidades DROP COLUMN id_materia_fk`);
            console.log('      -> Columna "id_materia_fk" eliminada.');
        } else {
            console.log('   -> La columna "id_materia_fk" ya fue eliminada.');
        }

        if (!await columnExists(connection, 'Unidades', 'id_relacion_fk')) {
            await connection.execute(`ALTER TABLE Unidades ADD COLUMN id_relacion_fk INT NULL`);
            console.log('      -> Columna "id_relacion_fk" añadida.');
            
            // --- LÓGICA CLAVE AÑADIDA ---
            // 1. Crear una relación "por defecto" si no existe, para asociar las unidades huérfanas.
            // Asumimos que el usuario con id=1 y la materia con id=1 en el establecimiento con id=1 es una buena relación por defecto.
            await connection.execute(`
                INSERT IGNORE INTO Usuarios_Materias (id_usuario_fk, id_materia_fk, id_establecimiento_fk)
                VALUES (1, 1, 1)
            `);
            
            // 2. Obtener el ID de esa relación por defecto.
            const [defaultRelacion] = await connection.execute(
                `SELECT id FROM Usuarios_Materias WHERE id_usuario_fk=1 AND id_materia_fk=1 AND id_establecimiento_fk=1`
            );
            const defaultRelacionId = defaultRelacion[0].id;
            console.log(`      -> Usando relación por defecto con ID: ${defaultRelacionId}`);

            // 3. Poblar la nueva columna en TODAS las unidades existentes con este ID por defecto.
            await connection.execute(`UPDATE Unidades SET id_relacion_fk = ? WHERE id_relacion_fk IS NULL`, [defaultRelacionId]);
            console.log('      -> Unidades existentes asociadas a la relación por defecto.');
            // --- FIN DE LA LÓGICA CLAVE ---

            await connection.execute(`ALTER TABLE Unidades MODIFY COLUMN id_relacion_fk INT NOT NULL`);
            
            // Intentamos añadir la FK. Si ya existe, no hará nada.
            try {
                await connection.execute(`
                    ALTER TABLE Unidades ADD CONSTRAINT fk_unidad_relacion
                    FOREIGN KEY (id_relacion_fk) REFERENCES Usuarios_Materias(id) ON DELETE CASCADE
                `);
                console.log('      -> Foreign key "fk_unidad_relacion" creada.');
            } catch (error) {
                if (error.code === 'ER_FK_DUP_NAME') {
                    console.log('      -> La Foreign key "fk_unidad_relacion" ya existe.');
                } else { throw error; }
            }
            } else {
                console.log('   -> La columna y relación "id_relacion_fk" ya existen.');
            }

            console.log('\n--- Sección: Mejoras en la Tabla Temas ---');
            if (!await columnExists(connection, 'Temas', 'orden')) {
                await connection.execute(`ALTER TABLE Temas ADD COLUMN orden INT DEFAULT 0`);
                console.log('   -> Columna "orden" añadida a la tabla "Temas".');
            } else {
                console.log('   -> La columna "orden" ya existe en "Temas".');
            }

            console.log('\n--- Sección: Ajuste de la Clave Única en Temas ---');
        
        // Primero, verificamos si la clave antigua 'titulo_tema' existe antes de borrarla
        if (await indexExists(connection, 'Temas', 'titulo_tema')) {
            await connection.execute(`ALTER TABLE Temas DROP KEY titulo_tema`);
            console.log('   -> Clave única antigua "titulo_tema" eliminada.');
        }

        // Segundo, verificamos que la nueva clave no exista antes de crearla
        if (!await indexExists(connection, 'Temas', 'idx_unidad_titulo')) {
            await connection.execute(`ALTER TABLE Temas ADD UNIQUE KEY idx_unidad_titulo (id_unidad_fk, titulo_tema)`);
            console.log('   -> Nueva clave única compuesta "idx_unidad_titulo" creada.');
        } else {
            console.log('   -> La nueva clave única ya existe. No se requieren acciones.');
        }

        // --- Sección: Refactorización de Tipos de Contenido ---
        console.log('\n--- Sección: Refactorización de Tipos de Contenido ---');

        // 1. Crear la nueva tabla
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Tipos_Contenido (
                id INT AUTO_INCREMENT PRIMARY KEY,
                descripcion VARCHAR(100) NOT NULL UNIQUE,
                color_identificador VARCHAR(7) DEFAULT '#cccccc',
                tamano_letra ENUM('pequeño', 'normal', 'grande') DEFAULT 'normal',
                tipo_letra VARCHAR(100) DEFAULT 'Arial, sans-serif',
                requiere_cita BOOLEAN DEFAULT FALSE
            )
        `);
        console.log('   -> Tabla "Tipos_Contenido" asegurada.');

        // 2. Modificar la tabla Contenidos (si es necesario)
        if (!await columnExists(connection, 'Contenidos', 'id_tipo_fk')) {
            await connection.execute(`ALTER TABLE Contenidos ADD COLUMN id_tipo_fk INT`);
            console.log('   -> Columna "id_tipo_fk" añadida a "Contenidos".');
        }

        // 3. Añadir la Foreign Key (si es necesario)
        if (!await foreignKeyExists(connection, 'Contenidos', 'fk_contenido_tipo')) {
            await connection.execute(`
                ALTER TABLE Contenidos ADD CONSTRAINT fk_contenido_tipo
                FOREIGN KEY (id_tipo_fk) REFERENCES Tipos_Contenido(id)
            `);
            console.log('   -> Relación "fk_contenido_tipo" creada.');
        } else {
            console.log('   -> La tabla "Contenidos" y su relación ya están actualizadas.');
        }

        console.log('\n🎉 ¡Actualización de la base de datos completada exitosamente!');
        // ====================================================================
        // ===== FIN: CÓDIGO AÑADIDO ==========================================
        // ====================================================================

        console.log('\n🎉 ¡Actualización de la base de datos completada exitosamente!');
        
    } catch (error) {
        console.error('❌ Error fatal durante la actualización de la base de datos:', error.sqlMessage || error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión a la base de datos cerrada.');
        }
    }
}

updateDatabase();