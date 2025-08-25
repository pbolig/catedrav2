// update-key.js - Script para actualizar API key de Gemini
const mysql = require('mysql2/promise');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function updateGeminiKey() {
    try {
        console.log('🔧 Script para actualizar API Key de Gemini\n');
        
        // Conectar a la BD
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'catedra_db'
        });
        
        console.log('✅ Conectado a la base de datos\n');
        
        // Mostrar key actual
        const [current] = await connection.query(
            'SELECT valor FROM configuracion WHERE clave = ?',
            ['GOOGLE_API_KEY']
        );
        
        if (current.length > 0) {
            const currentKey = current[0].valor;
            console.log(`🔑 API Key actual: ${currentKey.substring(0, 10)}...${currentKey.substring(-5)}`);
            console.log(`📏 Longitud actual: ${currentKey.length} caracteres\n`);
        }
        
        // Solicitar nueva key
        rl.question('📝 Ingresa la nueva API Key de Gemini: ', async (newKey) => {
            try {
                // Validar formato
                if (!newKey || !newKey.startsWith('AIza')) {
                    console.log('❌ Error: La API key debe empezar con "AIza"');
                    rl.close();
                    await connection.end();
                    return;
                }
                
                if (newKey.length < 30) {
                    console.log('❌ Error: La API key parece muy corta');
                    rl.close();
                    await connection.end();
                    return;
                }
                
                console.log('\n🔄 Actualizando API key...');
                
                // Actualizar en la BD
                await connection.query(
                    'UPDATE configuracion SET valor = ? WHERE clave = ?',
                    [newKey, 'GOOGLE_API_KEY']
                );
                
                console.log('✅ API key actualizada exitosamente');
                
                // Verificar actualización
                const [updated] = await connection.query(
                    'SELECT valor FROM configuracion WHERE clave = ?',
                    ['GOOGLE_API_KEY']
                );
                
                const updatedKey = updated[0].valor;
                console.log(`🔑 Nueva key: ${updatedKey.substring(0, 10)}...${updatedKey.substring(-5)}`);
                console.log(`📏 Nueva longitud: ${updatedKey.length} caracteres`);
                
                console.log('\n🧪 Probando nueva API key...');
                
                // Test rápido de la nueva key
                const { GoogleGenerativeAI } = require('@google/generative-ai');
                const genAI = new GoogleGenerativeAI(newKey);
                const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
                
                const result = await model.generateContent('Di solo "NUEVA KEY OK"');
                const response = await result.response;
                const text = response.text();
                
                console.log(`🎉 Test exitoso: ${text.trim()}`);
                console.log('\n✅ ¡API key funcionando correctamente!');
                console.log('🚀 Ahora puedes probar tu aplicación');
                
            } catch (error) {
                console.log(`❌ Error probando nueva key: ${error.message.split('\n')[0]}`);
                console.log('⚠️  La key se guardó pero puede tener problemas');
            } finally {
                rl.close();
                await connection.end();
            }
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        rl.close();
    }
}

updateGeminiKey();