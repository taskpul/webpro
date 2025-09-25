## Project Structure (Please note)
1. The `back/` folder contains all backend code.  
2. The `front/` folder contains all frontend code.

---

## 0) Project Goal
Build features for a MedusaJS v2 project (including backend, storefront, and frontend development) using the correct abstraction:
- **Module** = isolated domain logic packaged for this app (and optionally reusable).
- **Plugin** = distributable package that can bundle modules and other Medusa customizations.

**Authoritative references (follow step‑by‑step):**
- Modules: https://docs.medusajs.com/learn/fundamentals/modules
- Create Plugin: https://docs.medusajs.com/learn/fundamentals/plugins/create
- Storefront Development: https://docs.medusajs.com/resources/storefront-development

---

## 1) Hard Rules (must pass before any PR)
1. **TypeScript, strict mode only.**
2. **No cross‑module imports** of services/models. Use the module container & **Module Links** for relations; use **Queries/Workflows** for cross‑module reads.
3. **Configuration via options** (and `medusa-config.ts`) — **no hard‑coded secrets**. Read env with `process.env` and validate.
4. **Idempotent loaders & migrations.**
5. **Tests required** (services: unit; workflows: integration; storefront: component/integration tests where applicable).
6. **Docs required** (README with install, options schema, usage examples).
7. **Design/UI**: *strictly reuse existing fonts, colors, spacing, and CSS utilities*. **Do not** add new tokens, fonts, or ad‑hoc styles. If a new token/component seems necessary, open a design RFC instead.
8. **Conventional Commits** and keep a **CHANGELOG** for plugins (semver).

---

## 2) Decision Flow: Module vs Plugin
- If the functionality is **project‑internal** and encapsulates a domain → **Module** inside the app or inside a private plugin.
- If it must be **reused across projects**, or you’re packaging routes/hooks/subscribers/jobs/admin UI → **Plugin** (which may export your module).

---

## 3) Implementing a Module (checklist)
**Scaffold**
- Package/folder name: `@org/<name>-module` (or local folder under `/src/modules/<name>` if not publishing).
- Entry points: `src/index.ts` (exports), `src/registration.ts` (module registration), `src/services/*`, `src/models/*`, `src/workflows/*`, `src/loaders/*`.

**Container & Isolation**
- Register services/models with the module container.
- Use **Module Links** for inter‑module relations; never import another module’s internals.
- For reads across modules use **Queries** or **Workflows** orchestrating public APIs.

**Options & Config**
- Define an `Options` type with sane defaults.
- Read options from `medusa-config.ts` plugin entry.

**Workflows & Hooks**
- Compose business logic with workflows, add hook handlers only via public events.

**Errors/Logging**
- Throw descriptive, typed errors; structured logs with context (module name, operation, ids).

**DB/Migrations**
- Write idempotent migrations; guard re‑runs.

**Tests**
- Unit tests for services; integration tests for workflows and links.

**Docs**
- README covering: purpose, install/register, options schema, examples.

**Example: registering a plugin with options (calls your module internally)**
```ts
// medusa-config.ts
import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  plugins: [
    {
      resolve: "@org/example-plugin",
      options: {
        featureFlag: true,
        apiKey: process.env.EXAMPLE_API_KEY!,
      },
    },
  ],
})
```

---

## 4) Creating a Plugin (checklist)
**Structure**
- `package.json` with `name`, `version`, `type: "module"`, `exports`.
- `src/` may include: `modules/`, `routes/`, `workflows/`, `hooks/`, `subscribers/`, `jobs/`, `links/`, `admin/`.
- `README.md` with install, config options, and usage.

**Install in app**
- Add to `plugins[]` in `medusa-config.ts` with `resolve` & `options`.

**Versioning/Release**
- Semantic versioning; CHANGELOG; publish to private/public registry.

**Testing**
- Create a local test app ensuring end‑to‑end flows work.

**Minimal export**
```ts
// src/index.ts
export * from "./modules";
export * from "./workflows";
```

---

## 5) Storefront Development Guidelines
When working in the **app-storefront/** folder:

- Follow [Medusa Storefront Development Guide](https://docs.medusajs.com/resources/storefront-development).
- Use existing **components, and styles** for consistency.
- **Framework**: Next.js (if applicable in this repo).
- **APIs**: consume Medusa’s Store API via the SDK or REST endpoints.
- **Authentication**: handle customer sessions with provided utilities; do not roll your own.
- **Cart/Checkout**: use Medusa’s workflows and providers; no custom logic unless extending officially.
- **Styling**: reuse design system tokens; no new ad‑hoc styles.
- **Testing**: write component/unit tests for UI, and integration tests for checkout & cart flows.
- **Performance**: enable caching where appropriate, optimize images/assets, and ensure storefront is production ready.
- **SEO/Accessibility**: follow semantic HTML, ensure meta tags, alt attributes, and accessibility standards.

---

## 6) Design & UI Constraints (strict)
- Maintain accessibility (contrast, focus states, semantics).

---

## 7) PR Gate (copy into PR description)
- [ ] Correctly chose **Module** or **Plugin** per the decision flow.
- [ ] No cross‑module imports; using container & links correctly.
- [ ] Config via options; no secrets committed.
- [ ] Loaders/migrations are idempotent.
- [ ] Tests added and passing (unit/integration as applicable).
- [ ] README includes install/config/usage with examples.
- [ ] Any UI changes reuse existing fonts/colors/styles only.
- [ ] (For plugins) CHANGELOG updated and semver applied.
- [ ] Storefront development followed official guidelines (if applicable).

---

## 8) Starter Commands & Config
- Lint/format: **ESLint + Prettier** (use repo presets).
- TS config: `"strict": true`, target Node version from repo.
- Env: define in `.env.example`; validate on startup.

---

## 9) Do/Don’t TL;DR
**Do** keep modules isolated, use links/queries/workflows, validate env, write tests, document options, and follow official storefront guidelines.  
**Don’t** import across modules, hard‑code secrets, introduce new design tokens, bypass the container, or ignore storefront best practices.

---

## 10) References
- Modules: https://docs.medusajs.com/learn/fundamentals/modules
- Create Plugin: https://docs.medusajs.com/learn/fundamentals/plugins/create
- Storefront Development: https://docs.medusajs.com/resources/storefront-development

---

## 10) Storefront Development Guidelines (Medusa Official)

> Follow these when working in `app-storefront/`.

### 10.1 Overview
- The storefront is **installed, built, and hosted separately** from the Medusa backend. You can choose any frontend tech (e.g., Next.js). You may start from the official **Next.js Starter**.  
  _Refs: Storefront Development Guides; Next.js Starter._

### 10.2 Connect to the Backend
- Prefer **Medusa JS SDK** in JavaScript frameworks (Next.js/React/Vue/Angular). Otherwise, call the **Store REST APIs** directly.  
- Always include a **Publishable API Key** in storefront-to-backend requests:  
  - With JS SDK: set env var (e.g., `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`) and pass to the SDK/client init.  
  - Without SDK: send header `x-publishable-api-key: <your_key>` on every Store API request.  
- Ensure **CORS** is configured in `medusa-config.ts` so the backend allows your storefront origin(s):  
  ```ts
  // medusa-config.ts
  export default defineConfig({
    projectConfig: {
      http: {
        storeCors: "http://localhost:3000",
      },
    },
  })
  ```

### 10.3 Cart Lifecycle
- **Create a cart on first access** to the storefront and store the `cart.id` in `localStorage`.  
- The cart is **scoped to sales channel(s)** via the publishable API key; optionally pass `sales_channel_id` when creating the cart to target a specific channel.  
- If a guest logs in later, **associate the customer with the cart** (see “Update Cart” flow).  
- In React apps, expose the cart via a **React Context** to share across components.

### 10.4 Build Blocks (typical flows)
- Regions & currencies → pick region, price selection.  
- Products → list, detail, variant selection.  
- Cart operations → add/update/remove items, shipping address, shipping method, tax and totals.  
- Checkout → payment session (Stripe/PayPal or as configured), submit order, confirmation.  
- Auth → session/JWT (follow existing project patterns).  
- Deployment → follow Medusa’s storefront deployment guides (e.g., Vercel for Next.js).

### 10.5 Frontend Code Standards (project‑wide)
- Keep environment variables under `app-storefront` (e.g., `NEXT_PUBLIC_MEDUSA_*`) and document them in `.env.example`.
