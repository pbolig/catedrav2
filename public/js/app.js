// public/js/app.js

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.app-container')) {
        initAppView();
    }
    if (document.querySelector('.configuracion-form')) { // Asigna esta clase a tu form de config
        initConfigView();
    }
});

// ===================================================================================
// LÓGICA PARA LA VISTA PRINCIPAL DE LA APLICACIÓN (PANEL)
// ===================================================================================
function initAppView() {
    const contentArea = document.getElementById('contenido-tema');
    const sidebar = document.querySelector('.app-sidebar');
    if (!contentArea || !sidebar) return;

    let temaIdActual = null;
    let temaTituloActual = null;

    // --- MANEJO DE EVENTOS CENTRALIZADO ---

    sidebar.addEventListener('click', async (event) => {
        const target = event.target;
        const btnGuardarTema = target.closest('.btn-guardar-item');
        if (btnGuardarTema) {
            const form = btnGuardarTema.closest('.sidebar-form');
            const input = form.querySelector('input[name="titulo"]');
            const unidadId = form.dataset.unidadId;
            await guardarNuevoTema(unidadId, input.value);
            return;
        }
        const btnCancelarTema = target.closest('.btn-cancelar-item');
        if (btnCancelarTema) {
            btnCancelarTema.closest('.sidebar-form').remove();
            return;
        }
        const header = target.closest('.sidebar-item-header');
        const temaLink = target.closest('.tema-link');
        const btnEditar = target.closest('.btn-accion[data-accion="editar"]');
        const btnAgregar = target.closest('.btn-agregar-item');
        const btnEliminar = target.closest('.btn-eliminar-item');

        if (header && !btnEditar && !btnAgregar && !btnEliminar) toggleUnidad(header);
        else if (temaLink) {
            event.preventDefault();
            seleccionarTema(temaLink);
        } else if (btnEditar) {
            hacerEditable(btnEditar.closest('.editable'));
        } else if (btnAgregar) {
            agregarItemUnidad(btnAgregar.closest('.unidad-item'));
        } else if (btnEliminar) {
            if (confirm('¿Seguro que quieres eliminar este tema?')) await eliminarItemTema(btnEliminar.dataset.id);
        }
    });

    contentArea.addEventListener('click', (event) => {
        const btnCrear = event.target.closest('.btn-crear');
        const btnEditar = event.target.closest('.btn-editar');
        const btnEliminar = event.target.closest('.btn-eliminar');
        const btnIA = event.target.closest('.btn-ia');

        if (btnCrear) mostrarFormularioCreacion(btnCrear.dataset.temaId);
        else if (btnEditar) mostrarFormularioEdicion(btnEditar.closest('.contenido-wrapper').querySelector('.contenido'));
        else if (btnEliminar) {
            if (confirm('¿Estás seguro?')) eliminarContenido(btnEliminar.dataset.contenidoId);
        }
        else if (btnIA) autocompletarConIA(btnIA.dataset.temaId, btnIA);
    });

    // --- DEFINICIÓN DE TODAS LAS FUNCIONES ---

    const seleccionarTema = (link) => {
        document.querySelectorAll('.tema-link.active').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        temaIdActual = link.dataset.temaId;
        temaTituloActual = link.textContent.trim();
        cargarContenido(temaIdActual, temaTituloActual);
    };

    const cargarContenido = async (temaId, temaTitulo) => {
        try {
            const response = await fetch(`/app/api/tema/${temaId}`);
            if (!response.ok) throw new Error('La respuesta de la red no fue correcta');
            const data = await response.json();
            renderizarContenido(temaId, temaTitulo, data);
        } catch (error) {
            console.error('Error cargando contenido:', error);
            contentArea.innerHTML = `<p style="color: red;">Error al cargar el contenido del tema.</p>`;
        }
    };
    
    const renderizarContenido = (temaId, temaTitulo, contenidos) => {
        contentArea.innerHTML = `
            <div class="main-content-header">
                <h1>${temaTitulo.replace(/.*-\s/, '')}</h1>
                <button class="btn-ia" data-tema-id="${temaId}" title="Autocompletar contenido con IA">✨ Autocompletar con IA</button>
            </div>`;
        if (contenidos.length) {
            contenidos.forEach(c => contentArea.appendChild(crearBloqueContenido(c)));
        } else {
            contentArea.insertAdjacentHTML('beforeend', '<p>Este tema aún no tiene contenido.</p>');
        }
        const botonCrear = document.createElement('button');
        botonCrear.className = 'btn-crear';
        botonCrear.textContent = 'Agregar Nuevo Contenido';
        botonCrear.dataset.temaId = temaId;
        contentArea.appendChild(botonCrear);
    };

    const crearBloqueContenido = (contenido) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'contenido-wrapper';
        const tipo = contenido.tipo_contenido || 'default';
        const cuerpoHtml = tipo.toLowerCase() === 'código'
            ? `<pre><code>${escapeHtml(contenido.cuerpo || '')}</code></pre>`
            : `<div class="cuerpo-contenido"><p>${(contenido.cuerpo || '').replace(/\n/g, '<br>')}</p></div>`;
        let fuenteHtml = '';
        if (contenido.fuente_ia) {
            const fuentes = [...new Set(contenido.fuente_ia.split(',').map(f => f.trim()).filter(Boolean))];
            fuenteHtml = `<div class="contenido-fuente">Fuentes: ${fuentes.map(f => `<span class="fuente-badge">${f}</span>`).join(' ')}</div>`;
        }
        wrapper.innerHTML = `
            <div class="contenido contenido-${tipo.toLowerCase()}" data-contenido-id="${contenido.id_contenido}" data-tipo="${tipo}">
                <div class="contenido-header"><span class="contenido-tipo">${tipo.toUpperCase()}</span>${fuenteHtml}</div>
                ${cuerpoHtml}
            </div>
            <div class="contenido-acciones">
                <button class="btn-editar" title="Editar">✏️</button>
                <button class="btn-eliminar" data-contenido-id="${contenido.id_contenido}" title="Eliminar">❌</button>
            </div>`;
        return wrapper;
    };
    
    const hacerEditable = (elemento) => {
        if (document.querySelector('.inline-edit-input')) return;
        const id = elemento.dataset.id;
        const tipo = elemento.dataset.tipo;
        const valorActual = elemento.textContent.trim().replace(/.*-\s/, '');
        const input = document.createElement('input');
        input.type = 'text';
        input.value = valorActual;
        input.className = 'inline-edit-input';
        elemento.style.display = 'none';
        elemento.parentNode.insertBefore(input, elemento);
        input.focus();
        const guardar = async () => {
            const nuevoValor = input.value.trim();
            if (nuevoValor && nuevoValor !== valorActual) {
                const body = { [tipo === 'unidad' ? 'nombre' : 'titulo']: nuevoValor };
                await fetchApi(`/app/api/${tipo}/${id}/editar`, body);
            }
            location.reload();
        };
        input.addEventListener('blur', guardar);
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') input.blur();
            if (e.key === 'Escape') location.reload();
        });
    };

    const agregarItemUnidad = (unidadItem) => {
        if (document.querySelector('.sidebar-form')) return;
        const unidadId = unidadItem.dataset.unidadId;
        const formHtml = `
            <div class="sidebar-form" data-unidad-id="${unidadId}">
                <input type="text" name="titulo" placeholder="Título del nuevo tema">
                <div>
                    <button type="button" class="btn-guardar-item">Guardar</button>
                    <button type="button" class="btn-cancelar-item">Cancelar</button>
                </div>
            </div>`;
        unidadItem.querySelector('.tema-menu').insertAdjacentHTML('beforeend', formHtml);
        unidadItem.querySelector('.sidebar-form input').focus();
    };

    const guardarNuevoTema = async (unidadId, titulo) => {
        if (!titulo.trim()) return alert('El título no puede estar vacío.');
        const response = await fetchApi(`/app/api/unidad/${unidadId}/agregar_item`, { titulo: titulo.trim() });
        if (response && response.status === 'success') location.reload();
    };
    
    const eliminarItemTema = async (temaId) => {
        const response = await fetchApi(`/app/api/tema/eliminar/${temaId}`);
        if (response && response.status === 'success') location.reload();
    };
    
    const mostrarFormulario = async (config) => {
        const formWrapper = document.createElement('div');
        formWrapper.className = 'contenido-form';
        const fieldsHtml = await getFormFields(config.tipo, config.cuerpo);
        formWrapper.innerHTML = `
            <h3>${config.titulo}</h3>
            ${fieldsHtml}
            <div class="form-actions">
                <button type="button" class="btn-guardar">${config.botonTexto}</button>
                <button type="button" class="btn-cancelar">Cancelar</button>
            </div>`;
        config.contenedor.appendChild(formWrapper);
        if (config.ocultar) config.ocultar.style.display = 'none';
        formWrapper.querySelector('.btn-guardar').addEventListener('click', () => config.onSave(formWrapper));
        formWrapper.querySelector('.btn-cancelar').addEventListener('click', () => {
            formWrapper.remove();
            if (config.ocultar) config.ocultar.style.display = 'inline-block';
            if (config.onCancel) config.onCancel();
        });
    };

    const mostrarFormularioCreacion = (temaId) => {
        mostrarFormulario({
            titulo: 'Nuevo Contenido',
            botonTexto: 'Guardar Contenido',
            contenedor: contentArea,
            ocultar: contentArea.querySelector('.btn-crear'),
            onSave: (form) => {
                const tipo = form.querySelector('select[name="tipo"]').value;
                const cuerpo = form.querySelector('textarea[name="cuerpo"]').value;
                crearNuevoContenido(temaId, tipo, cuerpo);
            }
        });
    };

    const mostrarFormularioEdicion = (contenidoDiv) => {
        const id = contenidoDiv.dataset.contenidoId;
        const tipoActual = contenidoDiv.dataset.tipo;
        const cuerpoActual = contenidoDiv.querySelector('.cuerpo-contenido').textContent;
        const wrapper = contenidoDiv.closest('.contenido-wrapper');
        wrapper.querySelector('.contenido-acciones').style.display = 'none';
        contenidoDiv.style.display = 'none';
        mostrarFormulario({
            titulo: 'Editando Contenido',
            botonTexto: 'Guardar Cambios',
            tipo: tipoActual,
            cuerpo: cuerpoActual,
            contenedor: wrapper,
            onSave: (form) => {
                const tipo = form.querySelector('select[name="tipo"]').value;
                const cuerpo = form.querySelector('textarea[name="cuerpo"]').value;
                guardarCambiosContenido(id, tipo, cuerpo);
            },
            onCancel: () => cargarContenido(temaIdActual, temaTituloActual)
        });
    };

    const getFormFields = async (tipo = 'definicion', cuerpo = '') => {
        try {
            const response = await fetch('/app/api/tipos-contenido');
            const tipos = await response.json();
            let options = tipos.map(t =>
                `<option value="${t.descripcion}" ${t.descripcion === tipo ? 'selected' : ''}>
                    ${t.descripcion.charAt(0).toUpperCase() + t.descripcion.slice(1)}
                    ${t.aplicaIA === 'NO' ? ' (Sin IA)' : ''}
                </option>`
            ).join('');
            return `
                <div class="form-group"><label>Tipo de Contenido:</label><select name="tipo">${options}</select></div>
                <div class="form-group"><label>Contenido:</label><textarea name="cuerpo" rows="8">${escapeHtml(cuerpo)}</textarea></div>`;
        } catch (error) {
            console.error('Error cargando tipos de contenido:', error);
            return '<p>Error al cargar el formulario.</p>';
        }
    };
    
    const autocompletarConIA = async (temaId, boton) => {
        const modal = document.getElementById('ia-progress-modal');
        const log = document.getElementById('ia-progress-log');
        const modalFooter = document.getElementById('ia-modal-footer');
        const btnCerrarModal = document.getElementById('btn-cerrar-modal');
        const progressBar = document.getElementById('ia-progress-bar');
        const progressText = document.getElementById('ia-progress-text');
        if (!modal) return console.error("Modal de IA no encontrado");

        modal.style.display = 'flex';
        log.innerHTML = '';
        modalFooter.style.display = 'none';
        progressBar.style.width = '0%';
        progressText.textContent = 'Iniciando...';
        const textoOriginal = boton.innerHTML;
        boton.innerHTML = '✨ Generando...';
        boton.disabled = true;

        btnCerrarModal.onclick = () => {
            modal.style.display = 'none';
            boton.innerHTML = textoOriginal;
            boton.disabled = false;
            if (temaIdActual) cargarContenido(temaIdActual, temaTituloActual);
        };
        
        const addLog = (message, type) => {
            const item = document.createElement('div');
            item.className = `log-item ${type}`;
            item.innerHTML = message;
            log.appendChild(item);
            log.scrollTop = log.scrollHeight;
        };

        try {
            addLog(`🕐 [${new Date().toLocaleTimeString()}] Iniciando proceso...`, 'info');
            const tiposResponse = await fetch('/app/api/tipos-contenido-ia');
            if (!tiposResponse.ok) throw new Error('No se pudieron obtener los tipos de IA');
            const tiposIA = await tiposResponse.json();
            if (tiposIA.length === 0) throw new Error('No hay tipos de contenido habilitados para IA.');
            addLog(`✅ ${tiposIA.length} tipos habilitados: <strong>${tiposIA.join(', ')}</strong>`, 'success');

            addLog('🔍 Verificando modelos de IA disponibles...', 'info');
            const modelosDisponibles = ['Gemini', 'Claude', 'OpenAI', 'DeepSeek'];
            let modelosActivos = [];
            for (const modelo of modelosDisponibles) {
                try {
                    const keyResponse = await fetch(`/app/api/obtener-apikey/${modelo}`);
                    const keyData = await keyResponse.json();
                    if (keyData.apiKey) modelosActivos.push(modelo);
                } catch (e) { console.warn(`No se pudo verificar ${modelo}`); }
            }
            if (modelosActivos.length === 0) throw new Error('No hay APIs configuradas.');
            addLog(`✅ Modelos activos: ${modelosActivos.join(', ')}`, 'success');
            
            const contextResponse = await fetch(`/app/api/tema/${temaId}`);
            const contenidoActual = await contextResponse.json();
            const contexto = { titulo: temaTituloActual.replace(/.*-\s/, '') };
            contenidoActual.forEach(c => { contexto[c.tipo_contenido] = c.cuerpo; });
            addLog(`✅ Analizados ${contenidoActual.length} bloques de contenido existentes.`, 'success');

            const totalProcesos = tiposIA.length * modelosActivos.length;
            let procesosCompletados = 0;
            const actualizarProgreso = () => {
                procesosCompletados++;
                const porcentaje = Math.round((procesosCompletados / totalProcesos) * 100);
                progressBar.style.width = `${porcentaje}%`;
                progressText.textContent = `Procesando ${procesosCompletados} de ${totalProcesos}... (${porcentaje}%)`;
            };

            addLog(`🚀 <strong>Iniciando generación:</strong> ${totalProcesos} consultas en total.`, 'info');
            let contenidosGenerados = 0, errores = 0;

            for (const tipoContenido of tiposIA) {
                for (const modelo of modelosActivos) {
                    addLog(`🤖 ${modelo} generando para "${tipoContenido}"...`, 'info');
                    try {
                        const pasoResponse = await fetch('/app/api/generar_paso_ia', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({ id_tema: temaId, tipo_contenido: tipoContenido, nombre_modelo: modelo, contexto: contexto })
                        });
                        const pasoData = await pasoResponse.json();
                        if (pasoResponse.ok && pasoData.status === 'success') {
                            addLog(`✅ ${modelo} completó "${tipoContenido}"`, 'success');
                            contenidosGenerados++;
                        } else {
                            addLog(`❌ ${modelo} falló: ${pasoData.message || 'Error desconocido'}`, 'error');
                            errores++;
                        }
                    } catch (err) {
                        addLog(`❌ Error de red con ${modelo}`, 'error');
                        errores++;
                    }
                    actualizarProgreso();
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            progressText.textContent = '¡Proceso finalizado!';
            addLog(`<strong>🎉 PROCESO FINALIZADO</strong><br>Éxitos: ${contenidosGenerados} | Errores: ${errores}`, 'success');
            if (contenidosGenerados === 0 && errores > 0) {
                addLog(`💡 <strong>Sugerencia:</strong> Todos los modelos fallaron. Puedes configurar la API gratuita de <strong>Google Gemini</strong> en la página de Configuración.`, 'info');
            }
        } catch (error) {
            console.error('❌ Error general en autocompletarConIA:', error);
            addLog(`<strong>❌ Error crítico:</strong> ${error.message}`, 'error');
            progressText.textContent = 'Proceso finalizado con errores.';
        } finally {
            modalFooter.style.display = 'block';
        }
    };
    
    const crearNuevoContenido = async (temaId, tipo, cuerpo) => {
        if (!cuerpo.trim()) return alert('El contenido no puede estar vacío');
    
        // La URL debe tener el prefijo /app
        const response = await fetchApi(`/app/api/contenido/crear/${temaId}`, { tipo, cuerpo });

        if (response && response.status === 'success') {
            // Recargamos el contenido del tema para ver el nuevo bloque
            cargarContenido(temaId, temaTituloActual); 
        }
    };

    const guardarCambiosContenido = async (id, tipo, cuerpo) => {
        if (!cuerpo.trim()) return alert('El contenido no puede estar vacío');
        await fetchApi(`/app/api/contenido/editar/${id}`, { tipo, cuerpo });
        cargarContenido(temaIdActual, temaTituloActual);
    };
    
    const eliminarContenido = async (id) => {
        await fetchApi(`/app/api/contenido/eliminar/${id}`);
        cargarContenido(temaIdActual, temaTituloActual);
    };

    const escapeHtml = (text) => {
        if (typeof text !== 'string') return '';
        return text.replace(/[&<>"']/g, m => ({'&': '&amp;','<': '&lt;','>': '&gt;','"': '&quot;',"'": '&#039;'})[m]);
    };

    const toggleUnidad = (header) => {
        const temaMenu = header.nextElementSibling;
        header.classList.toggle('collapsed');
        if (temaMenu) temaMenu.classList.toggle('collapsed');
        const sidebarState = JSON.parse(sessionStorage.getItem('sidebarState')) || {};
        const unidadId = header.closest('.unidad-item').dataset.unidadId;
        sidebarState[unidadId] = header.classList.contains('collapsed') ? 'collapsed' : 'expanded';
        sessionStorage.setItem('sidebarState', JSON.stringify(sidebarState));
    };

    // Restaurar estado del sidebar
    const sidebarState = JSON.parse(sessionStorage.getItem('sidebarState')) || {};
    document.querySelectorAll('.sidebar-item-header').forEach(header => {
        const unidadId = header.closest('.unidad-item').dataset.unidadId;
        if (sidebarState[unidadId] === 'collapsed') {
            header.classList.add('collapsed');
            const menu = header.nextElementSibling;
            if (menu) menu.classList.add('collapsed');
        }
    });
}

// ===================================================================================
// LÓGICA PARA LA PÁGINA DE CONFIGURACIÓN
// ===================================================================================
function initConfigView() {
    document.querySelectorAll('.btn-verificar').forEach(button => {
        button.addEventListener('click', async function() {            
            const servicio = this.dataset.servicio;
            const apiKey = document.getElementById(this.dataset.input).value;
            const statusIndicator = document.getElementById(`status-${servicio}`);
            statusIndicator.textContent = 'Verificando...';
            statusIndicator.className = 'status-indicator loading';
            try {
                const response = await fetch('/app/api/verificar_apikey', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ servicio, api_key: apiKey }),
                });
                const data = await response.json();
                statusIndicator.textContent = data.message;
                statusIndicator.className = `status-indicator ${data.status === 'success' ? 'success' : 'error'}`;
            } catch (err) {
                statusIndicator.textContent = 'Error de red.';
                statusIndicator.className = 'status-indicator error';
            }
        });
    });

    // --- CÓDIGO PARA MOSTRAR/OCULTAR API KEY ---
    document.querySelectorAll('.toggle-password').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const targetId = this.dataset.target;
            const input = document.getElementById(targetId);

            if (input && input.type === 'password') {
                input.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else if (input) {
                input.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    });
}

// ===================================================================================
// FUNCIÓN HELPER GLOBAL PARA LLAMADAS API
// ===================================================================================
async function fetchApi(url, body) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: body ? JSON.stringify(body) : null
        });
        if (!response.ok) throw new Error(`Error en la petición: ${response.statusText}`);
        return response.json();
    } catch (error) {
        console.error(`Error en fetch a ${url}:`, error);
        alert('Ocurrió un error. Revisa la consola del navegador.');
    }
}