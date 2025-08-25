// check-db.js - Verificar qué bases de datos existen
const mysql = require('mysql2/promise');

async function checkDatabases() {
    try {
        console.log('🔍 Conectando a MySQL para verificar bases de datos...\n');
        
        // Conectar sin especificar database
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: ''
        });
        
        console.log('✅ Conexión a MySQL exitosa\n');
        
        // Mostrar todas las bases de datos
        const [databases] = await connection.execute('SHOW DATABASES');
        
        console.log('📋 Bases de datos disponibles:');
        databases.forEach((db, index) => {
            console.log(`   ${index + 1}. ${db.Database}`);
        });
        
        console.log('\n🔍 Buscando bases de datos relacionadas con "catedra":');
        const catedraDBs = databases.filter(db => 
            db.Database.toLowerCase().includes('catedra') || 
            db.Database.toLowerCase().includes('manager')
        );
        
        if (catedraDBs.length > 0) {
            console.log('✅ Encontradas:');
            catedraDBs.forEach(db => {
                console.log(`   🎯 ${db.Database}`);
            });
        } else {
            console.log('❌ No se encontraron bases de datos relacionadas');
        }
        
        // Verificar si existe alguna tabla de configuración
        console.log('\n🔍 Verificando contenido de bases de datos...');
        
        for (const db of databases) {
            if (db.Database.toLowerCase().includes('catedra') || 
                db.Database.toLowerCase().includes('manager') ||
                db.Database === 'test' || 
                db.Database === 'proyecto') {
                
                try {
                    await connection.execute(`USE ${db.Database}`);
                    const [tables] = await connection.execute('SHOW TABLES');
                    
                    console.log(`\n📊 Tablas en "${db.Database}":`);
                    tables.forEach(table => {
                        const tableName = Object.values(table)[0];
                        console.log(`     - ${tableName}`);
                    });
                    
                    // Buscar tabla de configuración
                    const configTable = tables.find(table => {
                        const tableName = Object.values(table)[0].toLowerCase();
                        return tableName.includes('config') || tableName.includes('configuracion');
                    });
                    
                    if (configTable) {
                        const tableName = Object.values(configTable)[0];
                        console.log(`   🎯 ¡Tabla de configuración encontrada: ${tableName}!`);
                        
                        const [configs] = await connection.execute(`SELECT * FROM ${tableName} LIMIT 5`);
                        console.log(`   📋 Primeros 5 registros:`);
                        configs.forEach(config => {
                            console.log(`       ${JSON.stringify(config)}`);
                        });
                    }
                    
                } catch (error) {
                    console.log(`   ❌ Error accediendo a "${db.Database}": ${error.message}`);
                }
            }
        }
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkDatabases();