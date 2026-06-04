# timeclock

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines React, TanStack Start, Convex, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Start** - SSR framework with TanStack Router
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **Convex** - Reactive backend-as-a-service platform
- **Authentication** - Clerk
- **Oxlint** - Oxlint + Oxfmt (linting & formatting)
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Convex Setup

This project uses Convex as a backend. You'll need to set up Convex before running the app:

```bash
bun run dev:setup
```

Follow the prompts to create a new Convex project and connect it to your application.

Copy the Convex deployment env values from `packages/backend/.env.local` to your Convex project, and then create app env files from each app's `.env.example`:
- `apps/web/.env` for the web frontend
- `apps/mobile/.env` for the Expo app

### Clerk Authentication Setup

1. Create or open your Clerk application.
2. Open the Clerk Convex integration page and activate the Convex integration:
   <https://dashboard.clerk.com/apps/setup/convex>
3. Copy the Clerk Frontend API URL from that page. In development it usually looks like `https://verb-noun-00.clerk.accounts.dev`.
4. Set that value on the Convex deployment:

```bash
cd packages/backend
bun x convex env set CLERK_JWT_ISSUER_DOMAIN https://your-clerk-frontend-api-url
```

5. Set the Clerk keys in `apps/web/.env`:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

You also need the publishable key for the mobile app in `apps/mobile/.env`:

```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

6. Push the Convex auth config after setting the issuer:

```bash
bun run dev:server
```

The JWT template must be named `convex`; that is the token template requested by both the TanStack Start SSR loader and `ConvexProviderWithClerk`.

If you use the same Clerk application for web + mobile, you can reuse the same publishable key and issuer setup.

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
Your app will connect to the Convex cloud backend automatically.

### Mobile (Expo + Uniwind)

You now also have `apps/mobile` in this workspace. Start it with:

```bash
bun run dev:mobile
```

Set these in `apps/mobile/.env` (copy from `.env.example`):

```bash
EXPO_PUBLIC_CONVEX_URL=...
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=...
```

For mobile emulators/simulators, `EXPO_PUBLIC_CONVEX_URL` can point at your local Convex instance (the same style as web via `VITE_CONVEX_URL`), but on physical devices use your machine's LAN URL (for example, `http://192.168.x.x:3210`) so the phone can reach the backend.

Then run:

```bash
bun run dev:mobile
```

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@timeclock/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Git Hooks and Formatting

- Format and lint fix: `bun run check`

## Project Structure

```
timeclock/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Start)
│   └── mobile/      # Native mobile app (Expo + Uniwind)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── backend/     # Convex backend functions and schema
│   │   ├── convex/    # Convex functions and schema
│   │   └── .env.local # Convex environment variables
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run dev:mobile`: Start only the mobile application
- `bun run dev:setup`: Setup and configure your Convex project
- `bun run check-types`: Check TypeScript types across all apps
- `bun run check`: Run Oxlint and Oxfmt
