// routes/index.js
const express = require('express');
const { marked } = require('marked');
const path = require('path');
const fs = require('fs').promises;
const { executeQuery } = require('../config/database');

const router = express.Router();

// Ruta principal de la aplicación, ahora protegida
router.get('/app', isLoggedIn, (req, res) => {
    // Esta vista solo será accesible para usuarios con sesión iniciada
    res.render('app_view', {
        // Puedes pasar datos del usuario a la vista si los necesitas
        user: req.session.userId 
    });
});

// Página principal - redirige a primera materia o configuración
router.get('/', async (req, res) => {
    try {
        const materias = await executeQuery(
            'SELECT id_materia FROM Materias ORDER BY id_materia LIMIT 1'
        );
        
        if (materias.length > 0) {
            return res.redirect(`/materia/${materias[0].id_materia}`);
        }
        return res.redirect('/configuracion');
    } catch (error) {
        console.error('Error en ruta principal:', error);
        res.redirect('/configuracion');
    }
});

// Vista de materia específica
router.get('/materia/:id', async (req, res) => {
    try {
        const materiaId = req.params.id;
        
        // Obtener todas las materias para el selector
        const materias = await executeQuery(
            'SELECT id_materia, nombre_materia FROM Materias ORDER BY nombre_materia'
        );
        
        // Obtener materia actual
        const materiaActual = await executeQuery(
            'SELECT * FROM Materias WHERE id_materia = ?', 
            [materiaId]
        );
        
        if (materiaActual.length === 0) {
            return res.status(404).send('Materia no encontrada');
        }
        
        // Obtener unidades y temas organizados
        const unidadesRaw = await executeQuery(`
            SELECT u.id_unidad, u.nombre_unidad, u.orden,
                   t.id_tema, t.numero_tema, t.titulo_tema 
            FROM Unidades u 
            LEFT JOIN Temas t ON u.id_unidad = t.id_unidad_fk 
            WHERE u.id_materia_fk = ? 
            ORDER BY u.orden, t.numero_tema
        `, [materiaId]);
        
        // Organizar datos para sidebar
        const unidadesSidebar = {};
        unidadesRaw.forEach(row => {
            if (!unidadesSidebar[row.id_unidad]) {
                unidadesSidebar[row.id_unidad] = {
                    id: row.id_unidad,
                    nombre: row.nombre_unidad,
                    orden: row.orden,
                    temas: []
                };
            }
            if (row.id_tema) {
                unidadesSidebar[row.id_unidad].temas.push({
                    id_tema: row.id_tema,
                    numero_tema: row.numero_tema,
                    titulo_tema: row.titulo_tema
                });
            }
        });
        
        // Convertir a array y ordenar por orden
        const unidadesSidebarArray = Object.values(unidadesSidebar)
            .sort((a, b) => (a.orden || 0) - (b.orden || 0));
        
        res.render('app_view', {
            title: materiaActual[0].nombre_materia,
            materias,
            materiaActual: materiaActual[0],
            unidadesSidebar: unidadesSidebarArray,
            showSidebar: true
        });
    } catch (error) {
        console.error('Error cargando materia:', error);
        res.status(500).send('Error interno del servidor');
    }
});

// Página de configuración
router.get('/configuracion', async (req, res) => {
    try {
        const configRows = await executeQuery('SELECT clave, valor FROM Configuracion');
        
        const config = {};
        configRows.forEach(row => {
            config[row.clave] = row.valor;
        });
        
        const finalConfig = {
            google_api_key: config.GOOGLE_API_KEY || '',
            anthropic_api_key: config.ANTHROPIC_API_KEY || '',
            openai_api_key: config.OPENAI_API_KEY || '',
            deepseek_api_key: config.DEEPSEEK_API_KEY || ''
        };
        
        res.render('configuracion', { 
            title: 'Configuración - Gestor de Cátedras',
            config: finalConfig,
            showSidebar: false,
            messages: req.flash()
        });
    } catch (error) {
        console.error('Error cargando configuración:', error);
        res.status(500).send('Error interno del servidor');
    }
});

// Guardar configuración
router.post('/configuracion', async (req, res) => {
    try {
        const { google_api_key, anthropic_api_key, openai_api_key, deepseek_api_key } = req.body;
        
        // Insertar o actualizar cada configuración
        const configs = [
            ['GOOGLE_API_KEY', google_api_key],
            ['ANTHROPIC_API_KEY', anthropic_api_key],
            ['OPENAI_API_KEY', openai_api_key],
            ['DEEPSEEK_API_KEY', deepseek_api_key]
        ];
        
        for (const [clave, valor] of configs) {
            await executeQuery(`
                INSERT INTO Configuracion (clave, valor) VALUES (?, ?)
                ON DUPLICATE KEY UPDATE valor = VALUES(valor)
            `, [clave, valor || '']);
        }
        
        req.flash('success', 'Configuración guardada correctamente!');
        res.redirect('/configuracion');
    } catch (error) {
        console.error('Error guardando configuración:', error);
        req.flash('error', 'Error al guardar la configuración');
        res.redirect('/configuracion');
    }
});

// Página de instrucciones de IA
router.get('/instrucciones_ia', async (req, res) => {
    try {
        const docsPath = path.join(__dirname, '..', 'docs', 'configIA.md');
        const contenido = await fs.readFile(docsPath, 'utf-8');
        const contenidoHtml = marked(contenido);
        
        res.render('instrucciones', { 
            title: 'Instrucciones de IA - Gestor de Cátedras',
            contenidoHtml,
            showSidebar: true
        });
    } catch (error) {
        console.error('Error cargando instrucciones:', error);
        res.status(404).send('El archivo de instrucciones no fue encontrado.');
    }
});

// Ruta para listar todas las materias (opcional)
router.get('/materias', async (req, res) => {
    try {
        const materias = await executeQuery(`
            SELECT m.*, COUNT(u.id_unidad) as total_unidades
            FROM Materias m
            LEFT JOIN Unidades u ON m.id_materia = u.id_materia_fk
            GROUP BY m.id_materia
            ORDER BY m.nombre_materia
        `);
        
        res.render('materias', {
            title: 'Todas las Materias - Gestor de Cátedras',
            materias,
            showSidebar: false
        });
    } catch (error) {
        console.error('Error cargando lista de materias:', error);
        res.status(500).send('Error interno del servidor');
    }
});

// Middleware "guardián"
function isLoggedIn(req, res, next) {
    if (req.session.userId) {
        // Si el usuario está en sesión, continúa
        return next();
    }
    // Si no, redirige a la página de login
    req.flash('error_msg', 'Por favor, inicia sesión para ver esta página.');
    res.redirect('/auth/login');
}

// Manejo de errores 404
router.use('*', (req, res) => {
    res.status(404).render('error', {
        title: 'Página no encontrada',
        error: {
            status: 404,
            message: 'La página que buscas no existe'
        },
        showSidebar: false
    });
});

module.exports = router;