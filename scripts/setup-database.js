// scripts/setup-database.js
const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
    let connection;
    try {
        console.log('Conectando a MySQL...');
        
        // Conectar directamente a la base de datos
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'catedra_db'
        };
        
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conexión establecida correctamente');
        
        console.log('Creando tablas...');

        // Crear tabla Usuarios (para login)
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Crear tabla Configuracion
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Configuracion (
                clave VARCHAR(100) PRIMARY KEY,
                valor TEXT
            )
        `);
        
        // Crear tabla Materias
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Materias (
                id_materia INT AUTO_INCREMENT PRIMARY KEY,
                nombre_materia VARCHAR(255) NOT NULL UNIQUE,
                codigo_materia VARCHAR(50)
            )
        `);
        
        // Crear tabla Unidades
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Unidades (
                id_unidad INT AUTO_INCREMENT PRIMARY KEY,
                id_materia_fk INT,
                nombre_unidad VARCHAR(255) NOT NULL,
                orden INT,
                activa TINYINT(1) NOT NULL DEFAULT 1,
                FOREIGN KEY (id_materia_fk) REFERENCES Materias(id_materia) ON DELETE CASCADE
            )
        `);
        
        // Crear tabla Temas
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Temas (
                id_tema INT AUTO_INCREMENT PRIMARY KEY,
                id_unidad_fk INT NOT NULL,
                id_tema_padre_fk INT,
                numero_tema VARCHAR(20),
                titulo_tema VARCHAR(255) NOT NULL UNIQUE,
                tipo_item VARCHAR(50) DEFAULT 'tema',
                version DECIMAL(3,1) DEFAULT 1.0,
                fecha_creacion DATE,
                FOREIGN KEY (id_unidad_fk) REFERENCES Unidades(id_unidad) ON DELETE CASCADE,
                FOREIGN KEY (id_tema_padre_fk) REFERENCES Temas(id_tema) ON DELETE SET NULL
            )
        `);
        
        // Crear tabla Contenidos
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Contenidos (
                id_contenido INT AUTO_INCREMENT PRIMARY KEY,
                id_tema_fk INT NOT NULL,
                tipo_contenido VARCHAR(100) NOT NULL,
                cuerpo TEXT NOT NULL,
                orden INT,
                fuente_ia TEXT,
                FOREIGN KEY (id_tema_fk) REFERENCES Temas(id_tema) ON DELETE CASCADE
            )
        `);
        
        // Crear tabla Evaluaciones
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Evaluaciones (
                id_evaluacion INT AUTO_INCREMENT PRIMARY KEY,
                id_materia_fk INT,
                nombre_evaluacion VARCHAR(255) NOT NULL,
                fecha_creacion DATE,
                FOREIGN KEY (id_materia_fk) REFERENCES Materias(id_materia) ON DELETE CASCADE
            )
        `);
        
        // Crear tabla Preguntas
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Preguntas (
                id_pregunta INT AUTO_INCREMENT PRIMARY KEY,
                id_evaluacion_fk INT,
                id_tema_fk INT,
                enunciado TEXT NOT NULL,
                tipo_pregunta VARCHAR(100),
                FOREIGN KEY (id_evaluacion_fk) REFERENCES Evaluaciones(id_evaluacion) ON DELETE CASCADE,
                FOREIGN KEY (id_tema_fk) REFERENCES Temas(id_tema) ON DELETE SET NULL
            )
        `);
        
        // Crear tabla Respuestas
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS Respuestas (
                id_respuesta INT AUTO_INCREMENT PRIMARY KEY,
                id_pregunta_fk INT NOT NULL,
                texto_respuesta TEXT NOT NULL,
                es_correcta TINYINT(1) NOT NULL DEFAULT 0,
                FOREIGN KEY (id_pregunta_fk) REFERENCES Preguntas(id_pregunta) ON DELETE CASCADE
            )
        `);
        
        // Insertar materia por defecto
        await connection.execute(`
            INSERT IGNORE INTO Materias (id_materia, nombre_materia, codigo_materia) 
            VALUES (1, 'Informática', 'INFO101')
        `);
        
        console.log('✅ Todas las tablas creadas correctamente!');
        console.log('✅ Materia por defecto agregada');
        console.log('📝 Ahora ejecuta: npm run seed-db');
        
    } catch (error) {
        console.error('❌ Error configurando la base de datos:', error);
        
        if (error.code === 'ER_BAD_DB_ERROR') {
            console.log('\n🔧 La base de datos no existe. Solución:');
            console.log('1. Abre phpMyAdmin (XAMPP → MySQL → Admin)');
            console.log('2. Crea una base de datos llamada: catedra_db');
            console.log('3. Ejecuta el script nuevamente');
        }
        
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

if (require.main === module) {
    setupDatabase();
}

module.exports = setupDatabase;