// config/database.js
const mysql = require('mysql2/promise'); // <-- Usamos /promise directamente
require('dotenv').config();

// Pool de conexiones para mejor rendimiento y listo para async/await
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'catedra_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
});

// Verificamos la conexión al iniciar
pool.getConnection()
    .then(connection => {
        console.log('✅ Conexión a la base de datos establecida correctamente.');
        connection.release(); // Devolvemos la conexión al pool
    })
    .catch(err => {
        console.error('❌ Error de conexión con la base de datos:', err);
    });

module.exports = pool;