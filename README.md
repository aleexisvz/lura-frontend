# Lura Frontend

Frontend web para la plataforma Lura, una aplicación de lectura de manga y libros digitales.

## Stack

- **React 18** + **TypeScript**
- **Vite** — bundler y dev server
- **React Router v6** — navegación y rutas protegidas
- **TanStack Query v5** — fetching y caché de datos
- **Zod** — validación de formularios

## Requisitos

- Node.js 18+
- pnpm 11+
- Backend Lura corriendo (por defecto en `http://localhost:3001`)

## Instalación

```bash
pnpm install
```

## Variables de entorno

Creá un archivo `.env` en la raíz del proyecto:

```env
VITE_API_BASE_URL=http://localhost:3001
```

Si no se define, el valor por defecto es `http://localhost:3001`.

## Scripts

| Comando | Descripción |
|---|---|
| `pnpm run dev` | Inicia el servidor de desarrollo en `http://localhost:5173` |
| `pnpm run build` | Compila TypeScript y genera el bundle de producción en `/dist` |
| `pnpm run preview` | Sirve el bundle de producción localmente |
| `pnpm run typecheck` | Verifica tipos sin emitir archivos |

## Estructura del proyecto

```
src/
├── app/
│   ├── App.tsx            # Providers raíz (QueryClient, AuthContext, Router)
│   ├── router.tsx         # Definición de rutas
│   └── route-guards.tsx   # AuthGuard y AdminGuard
├── components/
│   ├── AppLayout.tsx      # Shell principal con navbar
│   ├── ErrorBox.tsx       # Box de error reutilizable
│   ├── Loading.tsx        # Indicador de carga
│   └── SuccessBox.tsx     # Box de éxito reutilizable
├── features/
│   ├── auth/              # Login, registro, contexto de autenticación
│   ├── manga/             # Listado, detalle, volúmenes, reader, páginas
│   ├── books/             # Listado y detalle de libros EPUB
│   ├── reading/           # Home con progreso de lectura y stats
│   └── admin/             # Panel de administración
├── lib/
│   ├── apiClient.ts       # Cliente HTTP centralizado con manejo de errores
│   ├── adapters.ts        # Helpers para normalizar respuestas del backend
│   ├── config.ts          # Variables de entorno
│   ├── jwt.ts             # Decodificación de tokens JWT
│   ├── queryClient.ts     # Instancia de TanStack Query
│   └── storage.ts         # Persistencia del token en localStorage
├── styles/
│   └── global.css         # Estilos globales
└── types/
    ├── api.ts             # Tipos relacionados a la API
    └── domain.ts          # Tipos de dominio (Manga, Volume, Book, etc.)
```

## Rutas

| Ruta | Acceso | Descripción |
|---|---|---|
| `/login` | Público | Inicio de sesión |
| `/register` | Público | Registro de usuario |
| `/` | Autenticado | Home con "Continue Reading" y Reading Stats |
| `/manga` | Autenticado | Listado de mangas |
| `/manga/:mangaId` | Autenticado | Detalle de manga con progreso y estado por volumen |
| `/manga/:mangaId/volumes/:volumeId/pages` | Autenticado | Páginas de un volumen |
| `/reader/:mangaId/:volumeId/:pageNumber` | Autenticado | Reader de manga con tracking de sesión |
| `/books` | Autenticado | Listado de libros |
| `/books/:bookId` | Autenticado | Detalle de libro |
| `/admin` | Admin | Panel de administración de contenido |
| `/promote` | Admin | Promover usuario a administrador |

## Features principales

### Reading tracking
- **Continue Reading** — muestra los mangas en progreso cuyo volumen actual no está completado.
- **Reading Stats** — acumula sesiones, tiempo total (H:MM:SS), páginas leídas y volúmenes completados. Los stats nunca retroceden, incluso al reiniciar lectura.

### VolumeCompletion
- Se marca automáticamente al llegar a la última página del volumen.
- Botón manual "Marcar como completado" en el reader.
- Botón "Reiniciar lectura" por volumen en la página de detalle: resetea la posición a página 1 y reactiva el tracking, manteniendo los stats acumulados.

## Autenticación

El token JWT se almacena en `localStorage`. Al iniciar la app se verifica automáticamente la sesión. Las rutas protegidas redirigen a `/login` si no hay sesión activa; las rutas de admin redirigen a `/` si el rol no es `ADMIN`.
