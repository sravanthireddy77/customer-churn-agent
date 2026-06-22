# Frontend Development Instructions

## Run The Frontend

From the `frontend` directory:

```bash
npm install
npm run dev
```

The app runs at:

```text
http://localhost:5173
```

The backend should be running at:

```text
http://localhost:8000/api
```

If needed, set:

```bash
VITE_API_BASE_URL=http://localhost:8000/api
```

## Verify Changes

Use this before handing off UI or TypeScript changes:

```bash
npm run build
```

When validating in the browser, refresh `http://localhost:5173/` and check for console errors.

## Project Layout

```text
frontend/
├── src/
│   ├── api/             API client and React Query hooks
│   ├── components/      Shared UI components
│   ├── contexts/        React context providers
│   ├── data/            Legacy/mock data helpers
│   ├── hooks/           Legacy/custom React hooks
│   ├── pages/           Route-level pages
│   ├── services/        Business logic helpers
│   ├── styles/          Global CSS modules imported by index.css
│   ├── utils/           Utility functions
│   ├── App.tsx          Route definitions
│   ├── index.css        Main CSS entry point
│   ├── main.tsx         React app bootstrap
│   └── types.ts         Shared TypeScript types
└── agent-specs/
    ├── agents.md
    └── instructions.md
```

## Coding Guidelines

- Keep API access in `src/api/client.ts` and `src/api/hooks.ts`.
- Keep page-level workflows in `src/pages/`.
- Keep reusable display elements in `src/components/`.
- Put shared domain types in `src/types.ts`.
- Put risk formatting and similar pure helpers in `src/utils/`.
- Follow existing Tailwind patterns before adding new abstractions.
- Prefer `lucide-react` icons over custom inline SVG for ordinary UI actions.
- Avoid broad refactors when fixing a narrow UI issue.

## React Query Guidelines

- Use stable query keys from `queryKeys` in `src/api/hooks.ts`.
- Invalidate affected customer, analysis, and task queries after mutations.
- Keep backend response types explicit with shared TypeScript interfaces.
- Use `enabled` for optional customer-specific queries.

## UI Guidelines

- Buttons should use `btn-primary` or `btn-secondary` unless the local pattern needs something more specific.
- Inputs should use `field`.
- Repeated data groups can use `panel`.
- Compact operational UI should stay restrained and scannable.
- Do not use visible instructional copy to explain obvious controls.
- Ensure text does not overflow controls on mobile.
- For customer-scope checkboxes, use the custom white outlined checkbox pattern in `AgentPage.tsx`.

## Backend Interaction

Main endpoints used by the frontend:

- `GET /customers`
- `GET /customers/{customer_id}`
- `GET /churn/results`
- `GET /churn/results/{customer_id}`
- `POST /churn/analyze`
- `POST /churn/analyze-batch`
- `GET /tasks`
- `POST /tasks`
- `PUT /tasks/{task_id}`
- `POST /campaigns/trigger`
- `POST /agent/run`

If the console shows `ERR_CONNECTION_REFUSED` for `localhost:8000`, start the backend before debugging frontend code.

## Pre-Handoff Checklist

- `npm run build` passes.
- The in-browser console has no runtime errors.
- The Agent page loads customer data.
- The changed UI is verified in the browser.
- Any new docs are kept under `frontend/agent-specs/` unless they are project-wide.
