# FotoPieces

Aplicacion web de rompecabezas interactivo construida con Astro, Tailwind CSS y Canvas API.

Permite cargar imagenes desde archivo o camara del navegador, convertirlas en piezas dinamicas y resolverlas mediante arrastre.

## Resumen Tecnico

- Framework base: Astro
- Estilos: Tailwind CSS + estilos globales personalizados
- Render interactivo: Canvas 2D API
- Entrada de imagen: `input[type=file]` + `MediaDevices.getUserMedia`
- Persistencia local: `localStorage`

> [!IMPORTANT]
> Esta aplicacion esta orientada a navegadores modernos con soporte de `Pointer Events`, `CanvasRenderingContext2D`, `localStorage` y `MediaDevices`.

## Caracteristicas Implementadas

- Carga de imagen desde disco (desktop/movil).
- Captura de foto desde camara del navegador.
- Generacion de malla aleatoria para piezas del puzzle por partida.
- Drag and drop con `pointerdown`/`pointermove`/`pointerup`.
- Snap inteligente por distancia al objetivo.
- Timer de partida y contador de movimientos.
- Historial de puzzles resueltos persistido en `localStorage`.

## Arquitectura

```text
/
├── astro.config.mjs
├── package.json
├── src/
│   ├── components/
│   │   └── PuzzleGame.astro        # Estructura de UI y zonas del juego
│   ├── layouts/
│   │   └── Layout.astro            # Documento base, metadata y estilos globales
│   ├── pages/
│   │   └── index.astro             # Punto de entrada principal
│   ├── scripts/
│   │   └── puzzle-game.js          # Logica del juego (estado, canvas, drag, storage)
│   └── styles/
│       └── global.css              # Tailwind import + estilos y scrollbar custom
└── public/
```

## Flujo De Juego

1. Usuario sube o captura una imagen.
2. La imagen se normaliza en un canvas segun el tamano real del tablero.
3. Se genera una malla aleatoria (`createRandomMesh`) sobre el area util de imagen.
4. Cada celda se recorta en una pieza independiente (`makePieceFromPolygon`).
5. Las piezas se mezclan en la bandeja inferior.
6. Al soltar una pieza, se evalua distancia al objetivo (`trySnap`).
7. Si todas las piezas quedan bloqueadas, se dispara estado de victoria.
8. Se persiste resultado en `localStorage` y se refresca historial.

## Persistencia Local

El historial se guarda bajo la clave:

- `fotopieces-history-v1`

Cada entrada contiene:

- Imagen (data URL comprimida)
- Etiqueta/origen de imagen
- Dificultad (`rows`, `cols`)
- Tiempo
- Movimientos
- Timestamp (`solvedAt`)

> [!NOTE]
> Para evitar fallos por cuota de almacenamiento, el guardado aplica una estrategia de degradacion: si hay `QuotaExceededError`, elimina entradas antiguas y reintenta.

## Configuracion Del Entorno

### Requisitos

- Node.js `>= 22.12.0`
- npm

### Instalacion

```bash
npm install
```

### Desarrollo

```bash
npm run dev
```

### Build De Produccion

```bash
npm run build
```

### Preview De Build

```bash
npm run preview
```

## Scripts Disponibles

| Comando | Descripcion |
|---|---|
| `npm run dev` | Levanta servidor de desarrollo de Astro |
| `npm run build` | Genera salida estatica en `dist/` |
| `npm run preview` | Sirve localmente el build de produccion |
| `npm run astro` | Ejecuta CLI de Astro |


