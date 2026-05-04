# Truco

Marcador de Truco Argentino para la mesa de los lunes.

- Roster persistente (`Mesa`).
- Equipos de 1v1 hasta 4v4.
- Historial de partidas con detalle de jugadas.
- Tabla de estadísticas por jugador.
- PWA — instalable en mobile.

Source-of-truth para diseño y motion: [`DESIGN.md`](./DESIGN.md).

## Stack

React 19 · TypeScript · Vite 7 · Tailwind 3 · framer-motion · Radix UI primitives.

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build      # outputs to ./dist
npm run preview    # serve the build at /playground/truco/
```

## Deploy

GitHub Pages serves from the `gh-pages` branch. To deploy:

1. `npm run build`
2. Copy `dist/*` into the `gh-pages` branch under `truco/` (overwriting prior build).
3. Commit and push `gh-pages`.
