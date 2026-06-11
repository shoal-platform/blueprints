# Static Frontend Blueprint

React + TypeScript static site, hosted on [shoalstack.com](https://shoalstack.com).

## Stack

- React 19 + TypeScript
- Vite (build tool)
- React Compiler enabled
- ESLint with type-aware rules

## Usage

```bash
npm install
npm run dev       # local dev server with HMR
npm run build     # production build → dist/
npm run preview   # preview production build locally
npm run lint      # lint
```

## Deployment

Add this folder to a container node, attach a gateway, hit deploy!
