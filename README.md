# C谩tedra Manager - Node.js

Sistema de Gesti贸n de C谩tedras migrado de Flask/Python a Node.js/Express con base de datos MySQL.

## 馃殌 Caracter铆sticas

- **Gesti贸n de Materias**: Organizaci贸n por unidades y temas
- **Editor de Contenidos**: M煤ltiples tipos de contenido (definici贸n, narraci贸n, c贸digo, etc.)
- **Integraci贸n con IA**: Autocompletado con Gemini, Claude, OpenAI y DeepSeek
- **Interfaz Intuitiva**: Sidebar colapsible y edici贸n inline
- **Base de Datos MySQL**: Escalable y robusta
- **Responsive Design**: Funciona en desktop y m贸vil

## 馃搵 Prerrequisitos

- **Node.js** 16+ 
- **MySQL** 5.7+ o 8.0+
- **npm** o **yarn**

## 馃洜锔?Instalaci贸n

### 1. Clonar y configurar el proyecto

```bash
# Clonar o descomprimir el proyecto
cd catedra-manager

# Instalar dependencias
npm install
```

### 2. Configurar base de datos MySQL

```sql
-- Conectarse a MySQL como administrador
mysql -u root -p

-- Crear base de datos (opcional, el script lo hace autom谩ticamente)
CREATE DATABASE catedra_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crear usuario espec铆fico (recomendado para producci贸n)
CREATE USER 'catedra_user'@'localhost' IDENTIFIED BY 'tu_password_seguro';
GRANT ALL PRIVILEGES ON catedra_db.* TO 'catedra_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Configurar variables de entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus configuraciones
nano .env
```

**Ejemplo de configuraci贸n .env:**

```env
# Base de datos
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password_mysql
DB_NAME=catedra_db

# Servidor
PORT=3000
NODE_ENV=development
SESSION_SECRET=tu_clave_secreta_super_segura

# APIs de IA (opcionales)
GOOGLE_API_KEY=tu_api_key_de_google
ANTHROPIC_API_KEY=tu_api_key_de_anthropic
OPENAI_API_KEY=tu_api_key_de_openai
DEEPSEEK_API_KEY=tu_api_key_de_deepseek
```

### 4. Inicializar base de datos

```bash
# Crear estructura de base de datos
npm run setup-db

# Insertar datos iniciales
npm run seed-db
```

### 5. Iniciar la aplicaci贸n

```bash
# Modo desarrollo (con nodemon)
npm run dev

# Modo producci贸n
npm start
```

La aplicaci贸n estar谩 disponible en: **http://localhost:3000**

## 馃幆 Uso R谩pido

### Primera vez:

1. Accede a http://localhost:3000
2. Ve a **Configuraci贸n** (鈿欙笍) para agregar tus API keys de IA
3. Verifica cada API key antes de guardar
4. Navega de vuelta y selecciona un tema del sidebar
5. Usa el bot贸n **"鉁?Autocompletar con IA"** para generar contenido

### Gesti贸n de contenidos:

- **Editar unidades/temas**: Clic directo en el nombre
- **Agregar temas**: Bot贸n "+" junto a cada unidad
- **Crear contenido**: Bot贸n "Agregar Nuevo Contenido"
- **Editar/Eliminar**: Botones 鉁忥笍 y 鉂?en cada bloque

## 馃摎 Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Inicia con nodemon (auto-reload)
npm start           # Inicia modo producci贸n

# Base de datos
npm run setup-db    # Crea estructura de BD
npm run seed-db     # Inserta datos iniciales

# Utilidades (pr贸ximamente)
node scripts/agregar-pregunta.js      # Agregar preguntas de examen
node scripts/consultar-programa.js    # Ver programa de materia
node scripts/generar-examen.js        # Generar ex谩menes
```

## 馃梻锔?Estructura del Proyecto

```
catedra-manager/
鈹溾攢鈹€ package.json              # Configuraci贸n y dependencias
鈹溾攢鈹€ server.js                 # Servidor principal Express
鈹溾攢鈹€ .env                      # Variables de entorno
鈹溾攢鈹€ services/
鈹?  鈹斺攢鈹€ ai-services.js        # Integraci贸n con APIs de IA
鈹溾攢鈹€ scripts/
鈹?  鈹溾攢鈹€ setup-database.js     # Setup inicial de BD
鈹?  鈹斺攢鈹€ seed-database.js      # Datos iniciales
鈹溾攢鈹€ public/
鈹?  鈹溾攢鈹€ css/style.css         # Estilos CSS
鈹?  鈹斺攢鈹€ js/app.js             # JavaScript frontend
鈹溾攢鈹€ views/
鈹?  鈹溾攢鈹€ base.ejs              # Template base
鈹?  鈹溾攢鈹€ app_view.ejs          # Vista principal
鈹?  鈹溾攢鈹€ configuracion.ejs     # P谩gina de configuraci贸n
鈹?  鈹斺攢鈹€ partials/             # Componentes reutilizables
鈹斺攢鈹€ docs/                     # Documentaci贸n
```

## 馃 Configuraci贸n de APIs de IA

### Google Gemini
1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crea una API key
3. Agr茅gala en configuraci贸n

### Anthropic Claude
1. Ve a [Anthropic Console](https://console.anthropic.com/)
2. Crea una API key
3. Agr茅gala en configuraci贸n

### OpenAI
1. Ve a [OpenAI Platform](https://platform.openai.com/api-keys)
2. Crea una API key
3. Agr茅gala en configuraci贸n

### DeepSeek
1. Ve a [DeepSeek Platform](https://platform.deepseek.com/)
2. Crea una API key
3. Agr茅gala en configuraci贸n

## 馃帹 Tipos de Contenido

El sistema soporta diferentes tipos de contenido con estilos espec铆ficos:

- **Definici贸n**: Conceptos clave (verde)
- **Narraci贸n**: Texto libre sin formato especial
- **Subt铆tulo**: Encabezados grandes
- **Info**: Informaci贸n adicional (azul)
- **Tip**: Consejos 煤tiles (amarillo)
- **Guion**: Pasos o procedimientos (p煤rpura)
- **Alerta**: Advertencias importantes (rojo)
- **Desaf铆o**: Ejercicios o retos (azul)
- **C贸digo**: Bloques de c贸digo con sintaxis resaltada

## 馃敡 Troubleshooting

### Error de conexi贸n a MySQL
```bash
# Verificar que MySQL est茅 ejecut谩ndose
sudo systemctl status mysql

# Verificar configuraci贸n en .env
# Probar conexi贸n manual
mysql -h localhost -u root -p
```

### Error "Module not found"
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Puerto 3000 en uso
```bash
# Cambiar puerto en .env
PORT=3001

# O matar proceso existente
sudo lsof -ti:3000 | xargs kill -9
```

### APIs de IA no funcionan
1. Verifica que las API keys sean v谩lidas
2. Revisa los l铆mites de uso de cada servicio
3. Comprueba la conexi贸n a internet

## 馃殌 Despliegue en Producci贸n

### Preparaci贸n:
```bash
# Configurar variables de entorno para producci贸n
NODE_ENV=production
SESSION_SECRET=clave_super_segura_aleatoria

# Instalar dependencias de producci贸n
npm ci --only=production
```

### Con PM2:
```bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicaci贸n
pm2 start server.js --name "catedra-manager"

# Configurar inicio autom谩tico
pm2 startup
pm2 save
```

### Con Docker:
```bash
# Construir imagen
docker build -t catedra-manager .

# Ejecutar contenedor
docker run -p 3000:3000 \
  -e DB_HOST=host.docker.internal \
  -e DB_USER=root \
  -e DB_PASSWORD=password \
  catedra-manager
```

## 馃搫 Migraci贸n desde Flask

Este proyecto es una migraci贸n completa de Flask/Python a Node.js/Express:

### Cambios principales:
- **Backend**: Flask 鈫?Express.js
- **Base de datos**: SQLite 鈫?MySQL
- **Templates**: Jinja2 鈫?EJS
- **Dependencias**: requirements.txt 鈫?package.json
- **Estructura**: Reorganizada siguiendo patrones de Node.js

### Datos preservados:
- 鉁?Estructura de materias, unidades y temas
- 鉁?Tipos de contenido y estilos
- 鉁?Funcionalidad de IA
- 鉁?Interfaz de usuario
- 鉁?Scripts de utilidades

## 馃 Contribuci贸n

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 馃摓 Soporte

Si encuentras problemas:

1. Revisa la secci贸n [Troubleshooting](#-troubleshooting)
2. Verifica que todos los prerrequisitos est茅n instalados
3. Comprueba los logs en la consola
4. Crea un issue en el repositorio

## 馃摑 Licencia

Este proyecto est谩 bajo la Licencia MIT. Ver `LICENSE` para m谩s detalles.

---

## 馃帀 隆Listo!

Tu sistema de gesti贸n de c谩tedras ya est谩 funcionando en **http://localhost:3000**

### Pr贸ximos pasos recomendados:
1. Configurar APIs de IA en la p谩gina de configuraci贸n
2. Explorar la creaci贸n de contenido con diferentes tipos
3. Probar la funcionalidad de autocompletado con IA
4. Personalizar los estilos en `public/css/style.css`
5. Agregar m谩s materias seg煤n tus necesidades

隆Disfruta gestionando tus c谩tedras! 馃帗