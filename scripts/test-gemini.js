const db = require('../config/database');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiFromDB() {
    console.log('--- Iniciando prueba de Gemini con clave desde la BD ---');
    try {
        const [rows] = await db.query("SELECT valor FROM Configuracion WHERE clave = 'GOOGLE_API_KEY'");
        if (!rows.length || !rows[0].valor) {
            console.error('❌ ERROR: No se encontró la GOOGLE_API_KEY en la tabla "Configuracion".');
            return;
        }
        const apiKey = rows[0].valor;
        console.log('✅ API Key encontrada en la base de datos.');

        const genAI = new GoogleGenerativeAI(apiKey);
        
        // Usamos el modelo gratuito más reciente y forzamos la API v1beta
        const model = genAI.getGenerativeModel(
            { model: "gemini-1.5-flash-latest" },
            { apiVersion: 'v1beta' } 
        );
        console.log('🤖 Modelo "gemini-1.5-flash-latest" con apiVersion "v1beta" seleccionado. Enviando petición...');

        const prompt = "Explica qué es una API REST en una oración.";
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        console.log('\n✅ ¡ÉXITO! La API de Gemini respondió:');
        console.log('------------------------------------------');
        console.log(text);
        console.log('------------------------------------------');
    } catch (error) {
        console.error('\n❌ FALLÓ LA PRUEBA. Error detallado:');
        console.error(error);
    } finally {
        await db.end();
        console.log('🔌 Conexión a la base de datos cerrada.');
    }
}
testGeminiFromDB();