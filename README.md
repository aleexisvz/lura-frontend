# Lura Frontend

Frontend web (SPA) para la plataforma **Lura**, una biblioteca digital y lector interactivo de manga (imágenes) y libros (EPUB).

---

## Stack Tecnológico

- **React 18** + **TypeScript**
- **Vite** — servidor de desarrollo y empaquetador ultrarrápido
- **React Router v6** — enrutamiento y guardias de autenticación/rol (`AuthGuard`, `AdminGuard`)
- **TanStack Query v5** — estado del servidor, sincronización y caché
- **epub.js** — motor de renderizado y navegación de libros digitales EPUB
- **Zod** — validación de esquemas y formularios
- **Vanilla CSS** — estilos modulares y globales (`src/styles/global.css`)

---

## Requisitos Previos

- Node.js 18+
- pnpm 11+ o npm
- Servidor `lura-backend` en ejecución (por defecto en `http://localhost:3001`)

---

## Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto basándose en `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:3001
```

Si no se especifica, el cliente asumirá `http://localhost:3001`.

---

## Instalación y Ejecución

1. **Instalar dependencias**:

```bash
npm install
```

2. **Iniciar servidor en modo desarrollo**:

```bash
npm run dev
```

El frontend estará disponible en `http://localhost:5173`.

3. **Verificar tipado estático**:

```bash
npm run typecheck
```

4. **Compilar para producción**:

```bash
npm run build
```

---

## Estructura del Proyecto

```
src/
├── app/
│   ├── App.tsx             # Proveedores raíz (QueryClient, AuthContext, Router)
│   ├── router.tsx          # Configuración centralizada de rutas
│   └── route-guards.tsx    # Guardias de ruta (AuthGuard y AdminGuard)
├── components/
│   ├── AppLayout.tsx       # Layout principal con navegación superior
│   ├── ProtectedImage.tsx  # Renderizado nativo de imágenes CDN de R2 con fallback
│   ├── ErrorBox.tsx        # Contenedor reutilizable para errores
│   ├── Loading.tsx         # Indicadores visuales de carga
│   └── SuccessBox.tsx      # Contenedor reutilizable para mensajes de éxito
├── features/
│   ├── admin/              # Panel de administración de contenidos (mangas, volúmenes, libros)
│   ├── auth/               # Inicio de sesión, registro y contexto de autenticación
│   ├── books/              # Catálogo de libros, vista de detalle y lector EPUB con doble página
│   ├── manga/              # Catálogo de mangas, detalle, lista de volúmenes y lector de manga
│   ├── profile/            # Perfil de usuario, estadísticas de lectura y nivel de XP
│   ├── reader/             # Shell común de lectura, hotkeys y temporizador AFK
│   ├── reading/            # Hook de sesiones de lectura y widgets de "Continuar leyendo"
│   ├── tags/               # Selectores de géneros y etiquetas de contenido
│   └── users/              # Gestión de datos de usuario y actualización de perfil
├── lib/
│   ├── apiClient.ts        # Cliente HTTP centralizado con manejo normalizado de errores
│   ├── config.ts           # Configuración de variables de entorno del cliente
│   ├── jwt.ts              # Decodificación y verificación de expiración de tokens JWT
│   ├── queryClient.ts      # Instancia y configuración de TanStack Query
│   └── storage.ts          # Persistencia segura de token en localStorage
├── styles/
│   └── global.css          # Estilos globales de la aplicación
└── types/
    ├── api.ts              # Tipos de respuestas y contratos de API
    └── domain.ts           # Modelos de dominio (Manga, Volume, Book, Progress, etc.)
```

---

## Tabla de Rutas

| Ruta | Acceso | Descripción |
|---|---|---|
| `/login` | Público | Formulario de inicio de sesión |
| `/register` | Público | Formulario de registro de usuario |
| `/` | Autenticado | Inicio con tarjetas de "Continuar leyendo" y progreso general |
| `/manga` | Autenticado | Catálogo de mangas con filtros y buscador |
| `/manga/:mangaId` | Autenticado | Ficha técnica del manga, lista de volúmenes y estado de completitud |
| `/reader/:mangaId/:volumeId/:pageNumber` | Autenticado | Lector de manga con precarga de páginas, tracking y atajos de teclado |
| `/books` | Autenticado | Catálogo de libros digitales |
| `/books/:bookId` | Autenticado | Detalle del libro, sinopsis y botón de lectura/reanudación |
| `/reader/book/:bookId` | Autenticado | Lector EPUB interactivo con modo doble página, temas y notas |
| `/profile` | Autenticado | Perfil de usuario, nivel de XP, eventos activos e historial de lectura |
| `/admin` | Admin | Panel de carga y administración de mangas, volúmenes y libros EPUB |
| `/promote` | Admin | Herramienta para promover usuarios al rol de Administrador |

---

## Características Clave del Lector

### 1. Lector de Manga
- **Precarga Inteligente**: Precarga en segundo plano 3 páginas hacia adelante y 1 hacia atrás mediante elementos `<img>` ocultos para transiciones instantáneas sin esperas de red.
- **Protección contra Clics Rápidos (Cooldown)**: Bloqueo suave de navegación rápida para evitar condiciones de carrera o peticiones desordenadas.
- **Detección de Inactividad (AFK)**: Pausa automática de la sesión de lectura tras periodos prolongados de inactividad para registrar el tiempo real de lectura.
- **Cierre Fiable de Sesión**: Utiliza `keepalive` en peticiones `fetch` durante el desmontaje del componente o cierre de pestaña para garantizar el registro del tiempo de lectura y otorgamiento de XP.

### 2. Lector de Libros EPUB
- **Doble Página (Spread Layout)**: Simulación de lectura de libro físico en dos columnas con ajuste dinámico del ancho del contenedor del iframe para evitar saltos o páginas omitidas.
- **Personalización Visual**: Temas claro, sepia y oscuro, ajuste de tamaño de fuente (12px a 24px) y selector de tipografías (Merriweather, Literata, Inter, etc.).
- **Navegación y Marcadores**: Cajón lateral con tabla de contenidos (TOC), modal de notas y marcadores persistentes.
- **Sincronización de Progreso**: Persistencia del localizador EPUB CFI y porcentaje exacto de avance sincronizado con el backend.
