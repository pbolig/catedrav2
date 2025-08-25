// scripts/agregar-pregunta.js
const mysql = require('mysql2/promise');
const readline = require('readline');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'catedra_db'
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function pregunta(texto) {
    return new Promise(resolve => {
        rl.question(texto, resolve);
    });
}

async function seleccionarMateria(connection) {
    console.log('\n--- Elige la Materia para Agregar la Pregunta ---');
    
    const [materias] = await connection.execute(
        'SELECT id_materia, nombre_materia FROM Materias ORDER BY nombre_materia'
    );
    
    if (materias.length === 0) {
        console.log('No hay materias en la base de datos.');
        return null;
    }
    
    materias.forEach(materia => {
        console.log(`ID: ${materia.id_materia} | ${materia.nombre_materia}`);
    });
    console.log('-------------------------------------------------');
    
    while (true) {
        const respuesta = await pregunta('Introduce el ID de la materia: ');
        const id = parseInt(respuesta);
        
        if (isNaN(id)) {
            console.log('Error: Introduce un número válido.');
            continue;
        }
        
        const materiaValida = materias.find(m => m.id_materia === id);
        if (!materiaValida) {
            console.log('Error: ID de materia no válido.');
            continue;
        }
        
        return id;
    }
}

async function obtenerTemasPorMateria(connection, idMateria) {
    const [temas] = await connection.execute(`
        SELECT t.id_tema, t.numero_tema, t.titulo_tema 
        FROM Temas t
        JOIN Unidades u ON t.id_unidad_fk = u.id_unidad
        WHERE u.id_materia_fk = ?
        ORDER BY t.numero_tema
    `, [idMateria]);
    
    console.log('\n--- Temas Disponibles en la Materia ---');
    temas.forEach(tema => {
        console.log(`ID: ${tema.id_tema} | ${tema.numero_tema} - ${tema.titulo_tema}`);
    });
    console.log('---------------------------------------');
    
    return temas;
}

async function main() {
    let connection;
    
    try {
        console.log('Conectando a la base de datos...');
        connection = await mysql.createConnection(dbConfig);
        
        // 1. Seleccionar materia
        const idMateriaSeleccionada = await seleccionarMateria(connection);
        if (!idMateriaSeleccionada) {
            return;
        }
        
        console.log('\n--- Agregar Nueva Pregunta ---');
        
        // 2. Asociar a un tema de esa materia
        await obtenerTemasPorMateria(connection, idMateriaSeleccionada);
        const idTemaElegido = await pregunta('Introduce el ID del tema al que pertenece la pregunta (o deja en blanco): ');
        
        // 3. Pedir el enunciado
        let enunciado;
        while (!enunciado) {
            enunciado = await pregunta('Escribe el enunciado de la pregunta: ');
            if (!enunciado) {
                console.log('El enunciado no puede estar vacío.');
            }
        }
        
        // 4. Insertar la pregunta
        const [result] = await connection.execute(`
            INSERT INTO Preguntas (id_tema_fk, enunciado, tipo_pregunta) 
            VALUES (?, ?, ?)
        `, [idTemaElegido || null, enunciado, 'Multiple Choice']);
        
        const idPreguntaNueva = result.insertId;
        
        // 5. Pedir las respuestas
        console.log('\n--- Ahora introduce las respuestas ---');
        const respuestas = [];
        
        while (true) {
            const textoResp = await pregunta(`Texto de la respuesta ${respuestas.length + 1} (o presiona Enter para terminar): `);
            
            if (!textoResp) {
                if (respuestas.length > 1) {
                    break;
                } else {
                    console.log('Debes introducir al menos 2 respuestas.');
                    continue;
                }
            }
            
            respuestas.push(textoResp);
        }
        
        // 6. Preguntar cuál es la correcta
        console.log('\n--- Respuestas Ingresadas ---');
        respuestas.forEach((resp, i) => {
            console.log(`${i + 1}: ${resp}`);
        });
        
        let indiceCorrecta = 0;
        while (indiceCorrecta < 1 || indiceCorrecta > respuestas.length) {
            const respuesta = await pregunta(`Introduce el número (1-${respuestas.length}) de la respuesta CORRECTA: `);
            indiceCorrecta = parseInt(respuesta);
            
            if (isNaN(indiceCorrecta) || indiceCorrecta < 1 || indiceCorrecta > respuestas.length) {
                console.log('Por favor, introduce un número válido.');
                indiceCorrecta = 0;
            }
        }
        
        // 7. Insertar respuestas
        for (let i = 0; i < respuestas.length; i++) {
            const esCorrecta = (i + 1) === indiceCorrecta ? 1 : 0;
            await connection.execute(`
                INSERT INTO Respuestas (id_pregunta_fk, texto_respuesta, es_correcta) 
                VALUES (?, ?, ?)
            `, [idPreguntaNueva, respuestas[i], esCorrecta]);
        }
        
        console.log('\n✅ ¡Éxito! La pregunta y sus respuestas han sido guardadas.');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
        rl.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = main;