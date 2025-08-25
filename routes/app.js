// routes/app.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { requireAuth } = require('./auth');
const Materia = require('../models/materia');
const Unidad = require('../models/unidad');
const User = require('../models/user');
const Establecimiento = require('../models/establecimiento');
const Tema = require('../models/tema');
const aiServices = require('../services/ai-services');
const Contenido = require('../models/contenido');

// Aplica el middleware de autenticación a TODAS las rutas de este archivo
router.use(requireAuth);

// --- RUTA PRINCIPAL (DASHBOARD) ---
router.get('/', async (req, res) => {
    try {
        const userId = req.session.userId;
        const establecimientos = await Establecimiento.findByUserId(userId);
        const materiasGenerales = await Materia.getAll();

        for (const est of establecimientos) {
            const [materiasAsociadas] = await db.query(`
                SELECT m.id_materia, m.nombre_materia, um.id as id_relacion
                FROM Usuarios_Materias um
                JOIN Materias m ON um.id_materia_fk = m.id_materia
                WHERE um.id_usuario_fk = ? AND um.id_establecimiento_fk = ? AND um.id_materia_fk != 0
            `, [userId, est.id_establecimiento]);
            est.materiasAsociadas = materiasAsociadas;
        }
        
        res.render('app/dashboard', {
            establecimientos,
            materiasGenerales,
            title: 'Mis Establecimientos'
        });
    } catch (error) {
        console.error("Error al cargar el dashboard:", error);
        req.flash('error_msg', 'No se pudo cargar el panel de control.');
        res.redirect('/auth/login');
    }
});

// --- RUTAS DE GESTIÓN (formularios) ---

router.post('/asociar-materia', async (req, res) => {
    try {
        const { id_establecimiento, id_materia } = req.body;
        await db.query(
            `INSERT IGNORE INTO Usuarios_Materias (id_usuario_fk, id_establecimiento_fk, id_materia_fk) VALUES (?, ?, ?)`,
            [req.session.userId, id_establecimiento, id_materia]
        );
        req.flash('success_msg', 'Materia asociada correctamente.');
        res.redirect('/app');
    } catch (error) {
        req.flash('error_msg', 'No se pudo asociar la materia.');
        res.redirect('/app');
    }
});

router.post('/materias', async (req, res) => {
    try {
        const { nombre, codigo } = req.body;
        await Materia.create(nombre, codigo);
        req.flash('success_msg', '¡Materia creada exitosamente!');
        res.redirect('/app');
    } catch (error) {
        req.flash('error_msg', 'Error al crear la materia.');
        res.redirect('/app');
    }
});

// --- RUTA DE VISUALIZACIÓN DE CONTENIDO ---

router.get('/contenido/:id_relacion', async (req, res) => {
    try {
        const { id_relacion } = req.params;
        const [relacionData] = await db.query(`
            SELECT um.id, m.nombre_materia, e.nombre_establecimiento
            FROM Usuarios_Materias um
            JOIN Materias m ON um.id_materia_fk = m.id_materia
            JOIN Establecimientos e ON um.id_establecimiento_fk = e.id_establecimiento
            WHERE um.id = ? AND um.id_usuario_fk = ?
        `, [id_relacion, req.session.userId]);
        
        if (relacionData.length === 0) {
            req.flash('error_msg', 'No tienes permiso para ver este contenido.');
            return res.redirect('/app');
        }
        
        const materiaActual = relacionData[0];
        const unidadesRaw = await Unidad.findByRelacionIdWithTemas(id_relacion);
        const unidadesSidebar = {};
        unidadesRaw.forEach(row => {
            if (!unidadesSidebar[row.id_unidad]) {
                unidadesSidebar[row.id_unidad] = { id_unidad: row.id_unidad, nombre_unidad: row.nombre_unidad, temas: [] };
            }
            if (row.id_tema) {
                unidadesSidebar[row.id_unidad].temas.push({ id_tema: row.id_tema, numero_tema: row.numero_tema, titulo_tema: row.titulo_tema });
            }
        });

        res.render('app_view', {
            title: `${materiaActual.nombre_materia} en ${materiaActual.nombre_establecimiento}`,
            materiaActual,
            unidadesSidebar: Object.values(unidadesSidebar)
        });
    } catch (error) {
        console.error("Error al cargar el contenido:", error);
        req.flash('error_msg', 'Ocurrió un error al cargar el contenido.');
        res.redirect('/app');
    }
});

// =======================================================
// --- INICIO: RUTAS DE PERFIL Y CONFIGURACIÓN COMPLETAS ---
// =======================================================

// Muestra la página de perfil
router.get('/perfil', async (req, res) => {
    try {
        const [user, establecimientos] = await Promise.all([
            User.findById(req.session.userId),
            Establecimiento.findByUserId(req.session.userId)
        ]);

        if (!user) {
            req.flash('error_msg', 'Usuario no encontrado.');
            return res.redirect('/auth/logout');
        }

        res.render('app/perfil', {
            user,
            establecimientos,
            title: 'Mi Perfil'
        });
    } catch (error) {
        console.error("Error cargando perfil:", error);
        req.flash('error_msg', 'Error al cargar el perfil.');
        res.redirect('/app');
    }
});

// Guarda los cambios del perfil
router.post('/perfil', async (req, res) => {
    try {
        const { nombre, email } = req.body;
        await User.updateProfile(req.session.userId, nombre, email);
        req.flash('success_msg', 'Perfil actualizado correctamente.');
        res.redirect('/app/perfil');
    } catch (error) {
        console.error("Error actualizando perfil:", error);
        req.flash('error_msg', 'No se pudo actualizar el perfil.');
        res.redirect('/app/perfil');
    }
});

// Añade un nuevo establecimiento
router.post('/establecimientos', async (req, res) => {
    try {
        const { nombre_establecimiento } = req.body;
        if (nombre_establecimiento) {
            await Establecimiento.createForUser(nombre_establecimiento, req.session.userId);
            req.flash('success_msg', 'Establecimiento añadido.');
        } else {
            req.flash('error_msg', 'El nombre del establecimiento no puede estar vacío.');
        }
        res.redirect('/app/perfil');
    } catch (error) {
        console.error("Error añadiendo establecimiento:", error);
        req.flash('error_msg', 'No se pudo añadir el establecimiento.');
        res.redirect('/app/perfil');
    }
});

// Muestra la página de configuración
router.get('/configuracion', async (req, res) => {
    try {
        const [configRows] = await db.query('SELECT clave, valor FROM Configuracion');
        const config = {};
        configRows.forEach(row => { config[row.clave] = row.valor; });

        res.render('app/configuracion', {
            config,
            title: 'Configuración de API Keys'
        });
    } catch (error) {
        req.flash('error_msg', 'No se pudo cargar la página de configuración.');
        res.redirect('/app');
    }
});

// Guarda los cambios de la configuración
router.post('/configuracion', async (req, res) => {
    try {
        const { GOOGLE_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, DEEPSEEK_API_KEY } = req.body;
        const updates = [
            db.query(`INSERT INTO Configuracion (clave, valor) VALUES ('GOOGLE_API_KEY', ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)`, [GOOGLE_API_KEY]),
            db.query(`INSERT INTO Configuracion (clave, valor) VALUES ('ANTHROPIC_API_KEY', ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)`, [ANTHROPIC_API_KEY]),
            db.query(`INSERT INTO Configuracion (clave, valor) VALUES ('OPENAI_API_KEY', ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)`, [OPENAI_API_KEY]),
            db.query(`INSERT INTO Configuracion (clave, valor) VALUES ('DEEPSEEK_API_KEY', ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)`, [DEEPSEEK_API_KEY])
        ];
        await Promise.all(updates);

        req.flash('success_msg', '¡Configuración guardada correctamente!');
        res.redirect('/app/configuracion');
    } catch (error) {
        req.flash('error_msg', 'No se pudo guardar la configuración.');
        res.redirect('/app/configuracion');
    }
});

// --- Para desasociar una materia ---
router.post('/desasociar-materia/:id_relacion', async (req, res) => {
    try {
        const { id_relacion } = req.params;
        const userId = req.session.userId;

        // Borramos la relación específica, asegurándonos que pertenezca al usuario
        await db.query(
            'DELETE FROM Usuarios_Materias WHERE id = ? AND id_usuario_fk = ?',
            [id_relacion, userId]
        );

        req.flash('success_msg', 'Materia desasociada correctamente.');
        res.redirect('/app');
    } catch (error) {
        console.error("Error al desasociar materia:", error);
        req.flash('error_msg', 'No se pudo desasociar la materia.');
        res.redirect('/app');
    }
});

// --- RUTA Para crear una nueva unidad dentro de una materia ---
router.post('/contenido/:id_relacion/unidades', async (req, res) => {
    try {
        const { id_relacion } = req.params;
        const { nombre_unidad } = req.body;
        if (nombre_unidad) {
            await Unidad.create(nombre_unidad, id_relacion);
            req.flash('success_msg', 'Unidad creada correctamente.');
        } else {
            req.flash('error_msg', 'El nombre de la unidad no puede estar vacío.');
        }
        res.redirect(`/app/contenido/${id_relacion}`);
    } catch (error) {
        req.flash('error_msg', 'No se pudo crear la unidad.');
        res.redirect(`/app/contenido/${id_relacion}`);
    }
});

// --- RUTA Para crear un nuevo tema en una unidad ---
router.post('/api/unidad/:id_unidad/agregar_item', async (req, res) => {
    try {
        const { id_unidad } = req.params;
        const { titulo } = req.body;
        if (!titulo || !id_unidad) {
            return res.status(400).json({ status: 'error', message: 'Faltan datos.' });
        }
        const nuevoTemaId = await Tema.create(titulo, id_unidad);
        res.json({ status: 'success', message: 'Tema creado con éxito.', nuevoTemaId });
    } catch (error) {
        console.error("Error al agregar tema:", error);
        res.status(500).json({ status: 'error', message: 'Error en el servidor.' });
    }
});

// Verificar API Key
router.post('/api/verificar_apikey', requireAuth, async (req, res) => {
    try {
        const { servicio, api_key } = req.body;
        if (!api_key) {
            return res.json({ status: 'error', message: 'La clave está vacía.' });
        }
        
        const isValid = await aiServices.verifyApiKey(servicio, api_key);
        
        if (isValid) {
            res.json({ status: 'success', message: '¡Clave válida!' });
        } else {
            res.json({ status: 'error', message: 'Clave inválida o error.' });
        }
    } catch (error) {
        console.error('Error verificando API key:', error);
        res.json({ status: 'error', message: 'Error al verificar la clave.' });
    }
});

// Obtener contenido de un tema específico
router.get('/api/tema/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [contenidos] = await db.query(
            'SELECT * FROM Contenidos WHERE id_tema_fk = ? ORDER BY orden',
            [id]
        );
        res.json(contenidos);
    } catch (error) {
        console.error("Error al obtener contenido del tema:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// --- RUTA: Para eliminar un tema ---
router.post('/api/tema/eliminar/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM Temas WHERE id_tema = ?', [id]);
        res.json({ status: 'success', message: 'Tema eliminado correctamente.' });
    } catch (error) {
        console.error("Error al eliminar el tema:", error);
        res.status(500).json({ status: 'error', message: 'Error en el servidor.' });
    }
});

// --- RUTA Obtener todos los tipos de contenido ---
router.get('/api/tipos-contenido', async (req, res) => {
    try {
        const [tipos] = await db.query(`
            SELECT descripcion, aplicaIA FROM tipo_contenido 
            WHERE activo = 1 ORDER BY orden
        `);
        res.json(tipos.map(t => ({ descripcion: t.descripcion, aplicaIA: t.aplicaIA })));
    } catch (error) {
        console.error('Error obteniendo tipos de contenido:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// --- RUTA Obtener solo los tipos de contenido para IA ---
router.get('/api/tipos-contenido-ia', async (req, res) => {
    try {
        const [tipos] = await db.query(`
            SELECT descripcion FROM tipo_contenido 
            WHERE activo = 1 AND aplicaIA = 'SI' ORDER BY orden
        `);
        res.json(tipos.map(t => t.descripcion));
    } catch (error) {
        console.error('Error obteniendo tipos de contenido para IA:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// --- RUTA Para crear un nuevo bloque de contenido ---
router.post('/api/contenido/crear/:id_tema', requireAuth, async (req, res) => {
    try {
        const { id_tema } = req.params;
        const { tipo, cuerpo } = req.body;

        if (!id_tema || !tipo || !cuerpo) {
            return res.status(400).json({ status: 'error', message: 'Faltan datos.' });
        }

        const nuevoContenidoId = await Contenido.create(id_tema, tipo, cuerpo);

        res.json({ status: 'success', message: 'Contenido creado con éxito.', nuevoContenidoId });

    } catch (error) {
        console.error("Error al crear contenido:", error);
        res.status(500).json({ status: 'error', message: 'Error en el servidor.' });
    }
});

// --- RUTA  Para editar un bloque de contenido existente ---
router.post('/api/contenido/editar/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { tipo, cuerpo } = req.body;

        if (!id || !tipo || !cuerpo) {
            return res.status(400).json({ status: 'error', message: 'Faltan datos.' });
        }

        await Contenido.update(id, tipo, cuerpo);

        res.json({ status: 'success', message: 'Contenido actualizado con éxito.' });

    } catch (error) {
        console.error("Error al editar contenido:", error);
        res.status(500).json({ status: 'error', message: 'Error en el servidor.' });
    }
});

// --- RUTA Para eliminar un bloque de contenido ---
router.post('/api/contenido/eliminar/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ status: 'error', message: 'Falta el ID del contenido.' });
        }

        await Contenido.delete(id);

        res.json({ status: 'success', message: 'Contenido eliminado con éxito.' });

    } catch (error) {
        console.error("Error al eliminar contenido:", error);
        res.status(500).json({ status: 'error', message: 'Error en el servidor.' });
    }
});

// --- RUTA Obtener solo los tipos de contenido para IA ---
router.get('/api/tipos-contenido-ia', async (req, res) => {
    try {
        const [tipos] = await db.query(`
            SELECT descripcion FROM tipo_contenido 
            WHERE activo = 1 AND aplicaIA = 'SI' ORDER BY orden
        `);
        // Enviamos solo un array de strings con las descripciones
        res.json(tipos.map(t => t.descripcion));
    } catch (error) {
        console.error('Error obteniendo tipos de contenido para IA:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// --- RUTA Para obtener una API key específica ---
router.get('/api/obtener-apikey/:servicio', async (req, res) => {
    try {
        const { servicio } = req.params;
        const keyMap = {
            'Gemini': 'GOOGLE_API_KEY',
            'Claude': 'ANTHROPIC_API_KEY',
            'OpenAI': 'OPENAI_API_KEY',
            'DeepSeek': 'DEEPSEEK_API_KEY'
        };

        const apiKeyName = keyMap[servicio];
        if (!apiKeyName) {
            return res.status(400).json({ error: 'Servicio no válido' });
        }

        const [rows] = await db.query('SELECT valor FROM Configuracion WHERE clave = ?', [apiKeyName]);
        const apiKey = rows.length > 0 ? rows[0].valor : null;
        
        res.json({ apiKey: apiKey });

    } catch (error) {
        console.error('Error obteniendo API key:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// --- RUTA Para generar contenido con IA ---
router.post('/api/generar_paso_ia', requireAuth, async (req, res) => {
    try {
        const { id_tema, tipo_contenido, nombre_modelo, contexto } = req.body;

        // Mapeo de modelos a claves de configuración
        const keyMap = {
            'Gemini': 'GOOGLE_API_KEY',
            'Claude': 'ANTHROPIC_API_KEY',
            'OpenAI': 'OPENAI_API_KEY',
            'DeepSeek': 'DEEPSEEK_API_KEY'
        };
        const apiKeyName = keyMap[nombre_modelo];
        
        // Obtener la API key desde la base de datos
        const [keyRows] = await db.query('SELECT valor FROM Configuracion WHERE clave = ?', [apiKeyName]);
        if (keyRows.length === 0 || !keyRows[0].valor) {
            return res.json({ status: 'error', message: `API Key para ${nombre_modelo} no configurada.` });
        }
        const apiKey = keyRows[0].valor;

        // Crear el prompt y llamar al servicio de IA
        const prompt = `Para el tema '${contexto.titulo}', y específicamente para el tipo de contenido '${tipo_contenido}', agrega un aporte pedagógico y conciso. El contenido actual de este bloque es: '${contexto[tipo_contenido] || 'Vacío'}'. No repitas la información. Responde solo con el texto del nuevo aporte.`;
        const aporteIA = await aiServices.callAI(nombre_modelo, apiKey, prompt);

        if (!aporteIA || aporteIA.startsWith('Error en')) {
            return res.json({ status: 'error', message: aporteIA || `El modelo ${nombre_modelo} no devolvió respuesta.` });
        }

        // Actualizar la base de datos
        const [contenidoActual] = await db.query(
            'SELECT * FROM Contenidos WHERE id_tema_fk = ? AND tipo_contenido = ?',
            [id_tema, tipo_contenido]
        );

        if (contenidoActual.length > 0) {
            // Actualizar contenido existente
            const row = contenidoActual[0];
            const cuerpoNuevo = row.cuerpo ? `${row.cuerpo}\n\n---\n\n${aporteIA}` : aporteIA;
            await db.query('UPDATE Contenidos SET cuerpo = ? WHERE id_contenido = ?', [cuerpoNuevo, row.id_contenido]);
        } else {
            // Crear nuevo contenido
            await db.query(
                'INSERT INTO Contenidos (id_tema_fk, tipo_contenido, cuerpo, fuente_ia) VALUES (?, ?, ?, ?)',
                [id_tema, tipo_contenido, aporteIA, nombre_modelo]
            );
        }

        res.json({ status: 'success', aporte: aporteIA });

    } catch (error) {
        console.error('Error en /api/generar_paso_ia:', error);
        res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
});

module.exports = router;