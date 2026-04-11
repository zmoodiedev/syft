# Testing Guide — Syft

## Running tests

```bash
npm test                    # run all tests once
npm run test:watch          # watch mode (re-runs on file save)
npm run test:coverage       # run with coverage report
```

To run a single file or pattern:

```bash
npx jest --testPathPatterns="tiers"          # matches __tests__/lib/tiers.test.ts
npx jest --testPathPatterns="stripe-webhook" # matches __tests__/api/stripe-webhook.test.ts
```

---

## Directory layout

```
__tests__/
  lib/
    tiers.test.ts             # Pure business logic — no mocks needed
  api/
    recipes-create.test.ts    # POST /api/recipes/create
    stripe-webhook.test.ts    # POST /api/stripe/webhook
  components/
    ConfirmModal.test.tsx     # <ConfirmModal /> rendering and interactions
```

Test files mirror the `app/` source tree. A test for `app/api/foo/route.ts` lives at `__tests__/api/foo.test.ts`.

---

## Environment

### API route tests — `@jest-environment node`

The global Jest environment is `jsdom` (set in `jest.config.js`). `jsdom` does not include the Web Fetch `Request`/`Response` globals, which Next.js route handlers rely on. Every API test file must declare the Node environment at the top:

```typescript
/**
 * @jest-environment node
 */
```

Omitting this causes `Request is not defined` errors.

### Component tests — default (jsdom)

Component tests use jsdom (the default). No docblock needed.

---

## Mock patterns

### Firebase Admin

Firebase Admin initialises a real service account connection on import, so it must always be mocked in tests. The factory must use `jest.fn()` directly — no variable references, because `jest.mock()` calls are hoisted before variable declarations.

```typescript
jest.mock('@/lib/firebase-admin', () => ({
  auth: { verifyIdToken: jest.fn() },
  db: {
    collection: jest.fn(),
    batch: jest.fn(),
  },
}));

import { auth, db } from '@/lib/firebase-admin';

// Assign typed references after import
const mockVerifyIdToken = auth.verifyIdToken as jest.Mock;
const mockCollection    = db.collection as jest.Mock;
const mockBatch         = db.batch as jest.Mock;
```

### Stripe

```typescript
jest.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: jest.fn() },
    subscriptions: { retrieve: jest.fn() },
  },
}));

import { stripe } from '@/lib/stripe';

const mockConstructEvent = stripe.webhooks.constructEvent as jest.Mock;
const mockRetrieve       = stripe.subscriptions.retrieve as jest.Mock;
```

---

## The `resetAllMocks` rule

Use `jest.resetAllMocks()` (not `jest.clearAllMocks()`) in `beforeEach` for any test file that uses `mockReturnValueOnce`.

**Why:** `clearAllMocks()` resets call history but does NOT flush the `mockReturnValueOnce` queue. When a route returns early (e.g. 403 before the `db.collection('recipes').add()` call), the unused entry stays in the queue and poisons the next test.

```typescript
beforeEach(() => {
  jest.resetAllMocks();
  // Re-apply any persistent mock implementations here, e.g.:
  // mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });
});
```

If a mock needs a persistent (non-once) implementation shared across multiple tests in a `describe` block, set it in that block's own `beforeEach` — it runs after the outer reset.

---

## Mocking sequential Firestore calls

Routes often call `db.collection()` multiple times with different return shapes. Chain `mockReturnValueOnce` calls in the order the route invokes them:

```typescript
// Route calls:
//   1. db.collection('users').doc(id).get()
//   2. db.collection('recipes').where(...).select().get()
//   3. db.collection('recipes').add(data)

mockCollection
  .mockReturnValueOnce({
    doc: jest.fn().mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: () => ({ tier: 'Free' }) }),
    }),
  })
  .mockReturnValueOnce({
    where: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({ size: 5 }),
      }),
    }),
  })
  .mockReturnValueOnce({ add: jest.fn().mockResolvedValue({ id: 'new-id' }) });
```

**Count every `db.collection()` call the route makes** — including calls inside helper functions like `lockOverflowRecipes` or `unlockAllRecipes`. Missing one causes `db.collection(...).x is not a function` errors in subsequent tests.

For Firestore batch operations:

```typescript
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
mockBatch.mockReturnValue({ update: mockBatchUpdate, commit: mockBatchCommit });
```

---

## Coverage targets

| File | What's covered |
|---|---|
| `__tests__/lib/tiers.test.ts` | `TIER_FEATURES` values, `hasUserReachedLimit`, `canUserPerformAction` |
| `__tests__/api/recipes-create.test.ts` | Auth (401), tier enforcement (403/200), userId stripping |
| `__tests__/api/stripe-webhook.test.ts` | Signature verification, all four event types, lock/unlock counts |
| `__tests__/components/ConfirmModal.test.tsx` | Render, open/close, callbacks, loading state |

Run `npm run test:coverage` to see line-by-line coverage in `coverage/lcov-report/index.html`.

---

## What to test next

Ordered by value:

- `__tests__/api/recipes-delete.test.ts` — ownership check (user can only delete their own recipe)
- `__tests__/api/scrape-recipe.test.ts` — URL validation, auth gate
- `__tests__/components/RecipeCard.test.tsx` — locked badge renders, visibility badge hidden when locked
- `__tests__/components/RecipeLimitBanner.test.tsx` — nudge at 10/15, urgent at 13/15, hidden at 0/15
- `__tests__/components/UpgradeModal.test.tsx` — renders correct copy per `reason` prop, Stripe checkout call
- `__tests__/lib/recipe.test.ts` — slug generation, visibility helpers
