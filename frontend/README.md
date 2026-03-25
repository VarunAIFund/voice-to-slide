# Frontend — Voice-to-Slide Generator

React + Vite single-page app that drives the full upload-to-download workflow.

## Quick start

```bash
npm install
npm run dev
```

UI: `http://localhost:3000`

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Preview the production build locally |

## Configuration

- API base URL is set as a constant in `src/App.jsx` (`http://localhost:8000`)
- Dev server port is set in `vite.config.js` (default: 3000)

## Tech

- **React 18** — UI components and state
- **Vite** — dev server and bundler
- **Tailwind CSS** — utility-first styling
- **react-dropzone** — drag-and-drop file input
- **Axios** — REST API communication
