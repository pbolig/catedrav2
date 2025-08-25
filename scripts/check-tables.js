// check-tables.js - Verificar tablas de catedra_db
const mysql = require('mysql2/promise');

async function checkTables() {
    try {
        console.log('🔍 Conectando a catedra_db...\n');
        
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'catedra_db'
        });
        
        console.log('✅ Conexión a catedra_db exitosa\n');
        
        // Usar query normal en lugar de execute para SHOW TABLES
        const [tables] = await connection.query('SHOW TABLES');
        
        console.log('📋 Tablas en catedra_db:');
        tables.forEach((table, index) => {
            const tableName = Object.values(table)[0];
            console.log(`   ${index + 1}. ${tableName}`);
        });
        
        // Buscar tabla de configuración
        const configTable = tables.find(table => {
            const tableName = Object.values(table)[0].toLowerCase();
            return tableName.includes('config') || tableName.includes('configuracion');
        });
        
        if (configTable) {
            const tableName = Object.values(configTable)[0];
            console.log(`\n🎯 ¡Tabla de configuración encontrada: ${tableName}!\n`);
            
            // Ver estructura de la tabla
            const [structure] = await connection.query(`DESCRIBE ${tableName}`);
            console.log(`📊 Estructura de ${tableName}:`);
            structure.forEach(field => {
                console.log(`   - ${field.Field} (${field.Type})`);
            });
            
            // Ver contenido
            const [configs] = await connection.query(`SELECT * FROM ${tableName}`);
            console.log(`\n📋 Contenido de ${tableName} (${configs.length} registros):`);
            configs.forEach((config, index) => {
                console.log(`   ${index + 1}. ${JSON.stringify(config)}`);
            });
            
            // Buscar específicamente las API keys
            console.log(`\n🔑 Verificando API Keys específicas:`);
            const apiKeys = ['GOOGLE_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY'];
            
            for (const keyName of apiKeys) {
                const [keyResult] = await connection.query(
                    `SELECT * FROM ${tableName} WHERE clave = ?`, 
                    [keyName]
                );
                
                if (keyResult.length > 0) {
                    const keyData = keyResult[0];
                    console.log(`   ✅ ${keyName}:`);
                    console.log(`      📄 Valor: ${keyData.valor ? keyData.valor.substring(0, 10) + '...' : 'NULL'}`);
                    console.log(`      📏 Longitud: ${keyData.valor ? keyData.valor.length : 0}`);
                } else {
                    console.log(`   ❌ ${keyName}: No encontrada`);
                }
            }
            
        } else {
            console.log('\n❌ No se encontró tabla de configuración');
            
            // Buscar tablas que podrían contener configuración
            console.log('\n🔍 Buscando otras tablas relevantes...');
            const relevantTables = tables.filter(table => {
                const tableName = Object.values(table)[0].toLowerCase();
                return tableName.includes('settings') || 
                       tableName.includes('config') || 
                       tableName.includes('key') ||
                       tableName.includes('api');
            });
            
            if (relevantTables.length > 0) {
                console.log('📋 Tablas que podrían contener configuración:');
                relevantTables.forEach(table => {
                    console.log(`   - ${Object.values(table)[0]}`);
                });
            }
        }
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkTables();