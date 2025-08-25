# Configuración de APIs de Inteligencia Artificial

Esta guía te ayudará a configurar las API keys necesarias para utilizar las funciones de autocompletado con IA en el sistema de gestión de cátedras.

## 🤖 APIs Soportadas

El sistema integra cuatro servicios de IA principales:

1. **Google Gemini** - Modelo de Google
2. **Anthropic Claude** - Asistente de IA conversacional
3. **OpenAI GPT** - Modelo de OpenAI
4. **DeepSeek** - Modelo de código abierto

## 🔑 Obtener API Keys

### Google Gemini

1. **Accede a Google AI Studio**
   - Ve a: https://makersuite.google.com/app/apikey
   - Inicia sesión con tu cuenta de Google

2. **Crear API Key**
   - Haz clic en "Create API Key"
   - Selecciona el proyecto de Google Cloud (o crea uno nuevo)
   - Copia la API key generada

3. **Configuración**
   - Pega la key en el campo "Google (Gemini) API Key"
   - Haz clic en "Verificar" para confirmar que funciona

**Nota**: Gemini ofrece un tier gratuito generoso para desarrollo.

### Anthropic Claude

1. **Crear cuenta en Anthropic**
   - Ve a: https://console.anthropic.com/
   - Regístrate o inicia sesión

2. **Generar API Key**
   - Ve a la sección "API Keys"
   - Haz clic en "Create Key"
   - Dale un nombre descriptivo
   - Copia la key generada

3. **Configuración**
   - Pega la key en el campo "Anthropic (Claude) API Key"
   - Haz clic en "Verificar"

**Nota**: Claude requiere créditos de pago, pero ofrece $5 USD de crédito inicial.

### OpenAI (ChatGPT)

1. **Acceder a OpenAI Platform**
   - Ve a: https://platform.openai.com/api-keys
   - Inicia sesión en tu cuenta de OpenAI

2. **Crear API Key**
   - Haz clic en "Create new secret key"
   - Dale un nombre identificativo
   - Copia la key (¡guárdala inmediatamente, no se muestra de nuevo!)

3. **Configuración**
   - Pega la key en el campo "OpenAI (ChatGPT) API Key"
   - Verifica la conexión

**Importante**: OpenAI requiere una forma de pago configurada para usar la API.

### DeepSeek

1. **Registrarse en DeepSeek**
   - Ve a: https://platform.deepseek.com/
   - Crea una cuenta nueva

2. **Obtener API Key**
   - Navega a la sección "API Keys"
   - Genera una nueva key
   - Copia la key generada

3. **Configuración**
   - Pega la key en el campo "DeepSeek API Key"
   - Verifica la funcionalidad

**Ventaja**: DeepSeek suele ser más económico que otras opciones.

## ⚙️ Configuración en el Sistema

### Pasos para configurar:

1. **Acceder a Configuración**
   - Haz clic en el ícono ⚙️ en la esquina superior derecha
   - O navega directamente a `/configuracion`

2. **Ingresar API Keys**
   - Pega cada API key en su campo correspondiente
   - **No es necesario configurar todas**, solo las que planeas usar

3. **Verificar cada Key**
   - Usa el botón "Verificar" junto a cada campo
   - Espera la confirmación de que la key es válida
   - ✅ = Key válida | ❌ = Key inválida

4. **Guardar Configuración**
   - Haz clic en "Guardar Claves"
   - Las keys se almacenan de forma segura en la base de datos

## 🎯 Uso de IA en el Sistema

### Autocompletado de Contenido:

1. **Seleccionar un Tema**
   - Navega usando el sidebar izquierdo
   - Haz clic en cualquier tema

2. **Iniciar Autocompletado**
   - Haz clic en "✨ Autocompletar con IA"
   - El sistema consultará TODOS los modelos configurados

3. **Proceso Automático**
   - Se generan 9 tipos de contenido diferentes
   - Cada modelo aporta a cada tipo de contenido
   - El proceso puede tardar 2-5 minutos

### Tipos de Contenido Generados:

- **Subtítulo**: Encabezados estructurales
- **Narración**: Explicación fluida del tema
- **Definición**: Conceptos clave y términos
- **Info**: Información complementaria
- **Tip**: Consejos prácticos
- **Desafío**: Ejercicios o retos
- **Código**: Ejemplos de programación (si aplica)
- **Guion**: Pasos procedimentales
- **Alerta**: Advertencias importantes

## 💡 Consejos y Mejores Prácticas

### Gestión de Costos:
- **Gemini**: Generalmente gratuito para uso educativo
- **Claude**: Monitrea tu uso de créditos
- **OpenAI**: Configura límites de gasto en el dashboard
- **DeepSeek**: Opción más económica

### Calidad de Resultados:
- **Claude**: Excelente para explicaciones pedagógicas
- **GPT**: Muy versátil para todo tipo de contenido
- **Gemini**: Bueno para contenido técnico
- **DeepSeek**: Especialmente bueno para código

### Recomendaciones:
1. **Empieza con Gemini** (gratuito) para probar el sistema
2. **Agrega Claude** para mejorar la calidad pedagógica
3. **Usa múltiples modelos** para obtener perspectives diversas
4. **Revisa y edita** el contenido generado según tu criterio

## 🔒 Seguridad

### Protección de API Keys:
- Las keys se almacenan encriptadas en la base de datos
- Nunca se muestran completas en la interfaz
- Solo se transmiten por conexiones HTTPS
- Se recomienda rotar las keys periódicamente

### Límites y Cuotas:
- Cada servicio tiene sus propios límites de uso
- El sistema maneja errores de cuota automáticamente
- Puedes configurar solo algunos servicios si prefieres

## 🆘 Resolución de Problemas

### "Clave inválida o error":
- Verifica que la key esté completa (sin espacios)
- Asegúrate de tener créditos/cuota disponible
- Revisa que la key tenga los permisos correctos

### "El modelo no devolvió respuesta":
- Puede ser un problema temporal del servicio
- Verifica tu conexión a internet
- Intenta con otro modelo

### Proceso lento:
- Es normal que tome 2-5 minutos
- El sistema consulta múltiples modelos secuencialmente
- Puedes cerrar el modal cuando termine

## 📞 Soporte Adicional

Si tienes problemas específicos:
1. Verifica el estado de cada servicio de IA
2. Revisa los logs del servidor
3. Intenta con una sola API primero
4. Contacta al administrador del sistema

---

¡Con estas configuraciones podrás aprovechar al máximo las capacidades de IA del sistema! 🚀