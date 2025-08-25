// routes/api.js
const express = require('express');
const { executeQuery, getConfigValue } = require('../config/database');
const aiServices = require('../services/ai-services');

const router = express.Router();

// Middleware para parsear JSON
router.use(express.json());

// Verificar API Key de servicios de IA
router.post('/verificar_apikey', async (req, res) => {
    try {
        const { servicio, api_key } = req.body;
        
        if (!api_key || api_key.trim() === '') {
            return res.json({ 
                status: 'error', 
                message: 'La clave está vacía.' 
            });
        }
        
        const isValid = await aiServices.verifyApiKey(servicio, api_key.trim());
        
        if (isValid) {
            res.json({ 
                status: 'success', 
                message: '¡Clave válida!' 
            });
        } else {
            res.json({ 
                status: 'error', 
                message: 'Clave inválida o error de conexión.' 
            });
        }
    } catch (error) {
        console.error('Error verificando API key:', error);
        res.json({ 
            status: 'error', 
            message: 'Error interno al verificar la clave.' 
        });
    }
});

// Obtener contenido de un tema específico
router.get('/tema/:id', async (req, res) => {
    try {
        const temaId = parseInt(req.params.id);
        
        if (isNaN(temaId)) {
            return res.status(400).json({ error: 'ID de tema inválido' });
        }
        
        const contenidos = await executeQuery(`
            SELECT id_contenido, tipo_contenido, cuerpo, fuente_ia, orden
            FROM Contenidos 
            WHERE id_tema_fk = ? 
            ORDER BY orden ASC, id_contenido ASC
        `, [temaId]);
        
        res.json(contenidos);
    } catch (error) {
        console.error('Error obteniendo contenido del tema:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Generar contenido con IA paso a paso
router.post('/generar_paso_ia', async (req, res) => {
    try {
        const { id_tema, tipo_contenido, nombre_modelo, contexto } = req.body;
        
        if (!id_tema || !tipo_contenido || !nombre_modelo) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Parámetros faltantes' 
            });
        }
        
        const keyMap = {
            'Gemini': 'GOOGLE_API_KEY',
            'Claude': 'ANTHROPIC_API_KEY',
            'OpenAI': 'OPENAI_API_KEY',
            'DeepSeek': 'DEEPSEEK_API_KEY'
        };
        
        const apiKeyName = keyMap[nombre_modelo];
        const apiKey = await getConfigValue(apiKeyName);
        
        if (!apiKey) {
            return res.json({ 
                status: 'error', 
                message: `API Key para ${nombre_modelo} no configurada.` 
            });
        }
        
        // Obtener información completa del tema y unidad
        const [temaInfo] = await executeQuery(`
            SELECT t.*, u.nombre_unidad, u.id_unidad, m.nombre_materia
            FROM Temas t
            JOIN Unidades u ON t.id_unidad_fk = u.id_unidad
            JOIN Materias m ON u.id_materia_fk = m.id_materia
            WHERE t.id_tema = ?
        `, [id_tema]);
        
        if (temaInfo.length === 0) {
            return res.json({ 
                status: 'error', 
                message: 'Tema no encontrado' 
            });
        }
        
        const tema = temaInfo[0];
        const unidad = {
            nombre_unidad: tema.nombre_unidad,
            id_unidad: tema.id_unidad
        };
        
        // Obtener todos los contenidos existentes del tema con información de tipo
        const todosLosContenidos = await executeQuery(`
            SELECT c.*, tc.descripcion as tipo_descripcion, tc.aplicaIA
            FROM Contenidos c
            LEFT JOIN tipo_contenido tc ON c.id_tipo_contenido_fk = tc.id_tipo_contenido
            WHERE c.id_tema_fk = ?
            ORDER BY c.orden ASC, c.id_contenido ASC
        `, [id_tema]);
        
        // Verificar si el tipo de contenido permite IA
        const [tipoInfo] = await executeQuery(`
            SELECT * FROM tipo_contenido WHERE descripcion = ?
        `, [tipo_contenido]);
        
        if (tipoInfo.length > 0 && tipoInfo[0].aplicaIA === 'NO') {
            return res.json({ 
                status: 'error', 
                message: `El tipo de contenido "${tipo_contenido}" no permite generación con IA` 
            });
        }
        
        // Construir prompt contextualizado usando el nuevo método
        const prompt = aiServices.buildContextualPrompt(
            tema, 
            unidad, 
            todosLosContenidos, 
            tipo_contenido
        );
        
        console.log(`🤖 Generando ${tipo_contenido} para tema "${tema.titulo_tema}" con ${nombre_modelo}`);
        
        // Llamar al servicio de IA
        const aporteIA = await aiServices.callAI(nombre_modelo, apiKey, prompt);
        
        if (!aporteIA || aporteIA.startsWith('Error en')) {
            return res.json({ 
                status: 'error', 
                message: aporteIA || `El modelo ${nombre_modelo} no devolvió respuesta.` 
            });
        }
        
        // Obtener ID del tipo de contenido
        let idTipoContenido = null;
        if (tipoInfo.length > 0) {
            idTipoContenido = tipoInfo[0].id_tipo_contenido;
        } else {
            // Crear nuevo tipo si no existe
            const [nuevoTipo] = await executeQuery(`
                INSERT INTO tipo_contenido (descripcion, aplicaIA) 
                VALUES (?, 'SI')
            `, [tipo_contenido]);
            idTipoContenido = nuevoTipo.insertId;
        }
        
        // Buscar contenido existente del mismo tipo
        const contenidoExistente = await executeQuery(`
            SELECT c.*, tc.descripcion 
            FROM Contenidos c
            JOIN tipo_contenido tc ON c.id_tipo_contenido_fk = tc.id_tipo_contenido
            WHERE c.id_tema_fk = ? AND tc.descripcion = ?
        `, [id_tema, tipo_contenido]);
        
        if (contenidoExistente.length > 0) {
            // Actualizar contenido existente
            const row = contenidoExistente[0];
            const cuerpoOriginal = row.cuerpo.split('(Fuentes de IA:')[0].trim();
            const fuentesActuales = row.fuente_ia ? row.fuente_ia.split(', ') : [];
            
            if (!fuentesActuales.includes(nombre_modelo)) {
                fuentesActuales.push(nombre_modelo);
            }
            
            const cuerpoNuevo = cuerpoOriginal ? 
                `${cuerpoOriginal}\n\n---\n\n${aporteIA}` : 
                aporteIA;
            
            const fuentesStr = [...new Set(fuentesActuales)].sort().join(', ');
            const cuerpoFinal = `${cuerpoNuevo.trim()}\n\n(Fuentes de IA: ${fuentesStr})`;
            
            await executeQuery(`
                UPDATE Contenidos 
                SET cuerpo = ?, fuente_ia = ? 
                WHERE id_contenido = ?
            `, [cuerpoFinal, fuentesStr, row.id_contenido]);
        } else {
            // Crear nuevo contenido
            const fuentesStr = nombre_modelo;
            const cuerpoFinal = `${aporteIA}\n\n(Fuentes de IA: ${fuentesStr})`;
            
            await executeQuery(`
                INSERT INTO Contenidos (id_tema_fk, id_tipo_contenido_fk, cuerpo, fuente_ia) 
                VALUES (?, ?, ?, ?)
            `, [id_tema, idTipoContenido, cuerpoFinal, fuentesStr]);
        }
        
        res.json({ 
            status: 'success', 
            aporte: aporteIA,
            contexto_usado: {
                tema: tema.titulo_tema,
                unidad: unidad.nombre_unidad,
                contenidos_previos: todosLosContenidos.length
            }
        });
        
    } catch (error) {
        console.error('Error generando contenido con IA:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Error interno del servidor' 
        });
    }
});

// Nueva ruta para obtener tipos de contenido disponibles
router.get('/tipos-contenido', async (req, res) => {
    try {
        const tipos = await executeQuery(`
            SELECT id_tipo_contenido, descripcion, aplicaIA, orden
            FROM tipo_contenido 
            WHERE activo = 1
            ORDER BY orden ASC, descripcion ASC
        `);
        
        res.json(tipos);
    } catch (error) {
        console.error('Error obteniendo tipos de contenido:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

router.post('/tipo-contenido/:id/toggle-ia', async (req, res) => {
    try {
        const idTipo = req.params.id;
        const { aplicaIA } = req.body;
        
        if (!['SI', 'NO'].includes(aplicaIA)) {
            return res.status(400).json({ 
                error: 'Valor inválido para aplicaIA. Debe ser SI o NO' 
            });
        }
        
        await executeQuery(`
            UPDATE tipo_contenido 
            SET aplicaIA = ? 
            WHERE id_tipo_contenido = ?
        `, [aplicaIA, idTipo]);
        
        res.json({ 
            status: 'success', 
            message: `Tipo de contenido actualizado: aplicaIA = ${aplicaIA}` 
        });
    } catch (error) {
        console.error('Error actualizando tipo de contenido:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Nueva ruta para obtener tipos que permiten IA
router.get('/tipos-contenido-ia', async (req, res) => {
    try {
        console.log('🔍 Consultando tipos de contenido con IA habilitada...');
        
        const tipos = await executeQuery(`
            SELECT descripcion, aplicaIA, orden
            FROM tipo_contenido 
            WHERE aplicaIA = 'SI' AND activo = 1
            ORDER BY orden ASC, descripcion ASC
        `);
        
        const tiposDescripcion = tipos.map(t => t.descripcion);
        
        console.log(`✅ Encontrados ${tiposDescripcion.length} tipos con IA: ${tiposDescripcion.join(', ')}`);
        
        res.json(tiposDescripcion);
    } catch (error) {
        console.error('❌ Error obteniendo tipos IA:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            message: error.message 
        });
    }
});

// CRUD de contenidos
router.post('/contenido/crear/:id_tema', async (req, res) => {
    try {
        const idTema = parseInt(req.params.id_tema);
        const { tipo, cuerpo } = req.body;
        
        if (isNaN(idTema) || !tipo || !cuerpo) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Parámetros inválidos' 
            });
        }
        
        await executeQuery(`
            INSERT INTO Contenidos (id_tema_fk, tipo_contenido, cuerpo) 
            VALUES (?, ?, ?)
        `, [idTema, tipo, cuerpo]);
        
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Error creando contenido:', error);
        res.status(500).json({ status: 'error' });
    }
});

router.post('/contenido/editar/:id_contenido', async (req, res) => {
    try {
        const idContenido = parseInt(req.params.id_contenido);
        const { tipo, cuerpo } = req.body;
        
        if (isNaN(idContenido) || !tipo || !cuerpo) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Parámetros inválidos' 
            });
        }
        
        await executeQuery(`
            UPDATE Contenidos 
            SET tipo_contenido = ?, cuerpo = ? 
            WHERE id_contenido = ?
        `, [tipo, cuerpo, idContenido]);
        
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Error editando contenido:', error);
        res.status(500).json({ status: 'error' });
    }
});

router.post('/contenido/eliminar/:id_contenido', async (req, res) => {
    try {
        const idContenido = parseInt(req.params.id_contenido);
        
        if (isNaN(idContenido)) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'ID de contenido inválido' 
            });
        }
        
        await executeQuery(
            'DELETE FROM Contenidos WHERE id_contenido = ?', 
            [idContenido]
        );
        
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Error eliminando contenido:', error);
        res.status(500).json({ status: 'error' });
    }
});

// Editar unidad
router.post('/unidad/:id_unidad/editar', async (req, res) => {
    try {
        const idUnidad = parseInt(req.params.id_unidad);
        const { nombre } = req.body;
        
        if (isNaN(idUnidad) || !nombre) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Parámetros inválidos' 
            });
        }
        
        await executeQuery(`
            UPDATE Unidades 
            SET nombre_unidad = ? 
            WHERE id_unidad = ?
        `, [nombre, idUnidad]);
        
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Error editando unidad:', error);
        res.status(500).json({ status: 'error' });
    }
});

// Editar tema
router.post('/tema/:id_tema/editar', async (req, res) => {
    try {
        const idTema = parseInt(req.params.id_tema);
        const { titulo } = req.body;
        
        if (isNaN(idTema) || !titulo) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Parámetros inválidos' 
            });
        }
        
        await executeQuery(`
            UPDATE Temas 
            SET titulo_tema = ? 
            WHERE id_tema = ?
        `, [titulo, idTema]);
        
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Error editando tema:', error);
        res.status(500).json({ status: 'error' });
    }
});

// Eliminar tema
router.post('/tema/eliminar/:id_tema', async (req, res) => {
    try {
        const idTema = parseInt(req.params.id_tema);
        
        if (isNaN(idTema)) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'ID de tema inválido' 
            });
        }
        
        // Eliminar contenidos primero (por foreign key)
        await executeQuery(
            'DELETE FROM Contenidos WHERE id_tema_fk = ?', 
            [idTema]
        );
        
        // Eliminar tema
        await executeQuery(
            'DELETE FROM Temas WHERE id_tema = ?', 
            [idTema]
        );
        
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Error eliminando tema:', error);
        res.status(500).json({ status: 'error' });
    }
});

// Agregar nuevo tema a unidad
router.post('/unidad/:id_unidad/agregar_item', async (req, res) => {
    try {
        const idUnidad = parseInt(req.params.id_unidad);
        const { titulo } = req.body;
        
        if (isNaN(idUnidad) || !titulo) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Parámetros inválidos' 
            });
        }
        
        // Obtener el siguiente número de tema
        const ultimoTema = await executeQuery(`
            SELECT numero_tema FROM Temas 
            WHERE id_unidad_fk = ? 
            ORDER BY numero_tema DESC 
            LIMIT 1
        `, [idUnidad]);
        
        let nuevoNumero = '1';
        if (ultimoTema.length > 0) {
            const ultimo = ultimoTema[0].numero_tema;
            // Lógica simple para incrementar número
            const match = ultimo.match(/(\d+)$/);
            if (match) {
                const num = parseInt(match[1]) + 1;
                nuevoNumero = ultimo.replace(/\d+$/, num.toString());
            }
        }
        
        await executeQuery(`
            INSERT INTO Temas (id_unidad_fk, numero_tema, titulo_tema) 
            VALUES (?, ?, ?)
        `, [idUnidad, nuevoNumero, titulo]);
        
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Error agregando tema:', error);
        res.status(500).json({ status: 'error' });
    }
});

// Obtener estadísticas del sistema
router.get('/estadisticas', async (req, res) => {
    try {
        const [materias] = await Promise.all([
            executeQuery('SELECT COUNT(*) as count FROM Materias'),
            executeQuery('SELECT COUNT(*) as count FROM Unidades'),
            executeQuery('SELECT COUNT(*) as count FROM Temas'),
            executeQuery('SELECT COUNT(*) as count FROM Contenidos')
        ]);
        
        res.json({
            materias: materias[0].count,
            unidades: materias[1].count,
            temas: materias[2].count,
            contenidos: materias[3].count
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;