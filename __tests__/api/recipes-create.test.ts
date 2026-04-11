/**
 * @jest-environment node
 *
 * Tests for POST /api/recipes/create
 *
 * Mocks firebase-admin so no real Firestore/Auth calls are made.
 */

// ─── Module mocks (hoisted by Jest before imports) ───────────────────────────

jest.mock('@/lib/firebase-admin', () => ({
  auth: { verifyIdToken: jest.fn() },
  db: {
    collection: jest.fn(),
  },
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { POST } from '@/app/api/recipes/create/route';
// Import the mocked module so we can configure per-test behaviour
import { auth, db } from '@/lib/firebase-admin';

const mockVerifyIdToken = auth.verifyIdToken as jest.Mock;
const mockCollection = db.collection as jest.Mock;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: object, token = 'valid-token') {
  return new Request('http://localhost/api/recipes/create', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

const RECIPE_BODY = {
  name: 'Test Recipe',
  prepTime: '10 min',
  cookTime: '20 min',
  ingredients: [],
  instructions: [],
};

/**
 * Wire up the collection mock for a single test case.
 * The route calls db.collection('users') then db.collection('recipes').
 */
function setupCollectionMock({
  tier = 'Free',
  recipeCount = 0,
  newDocId = 'new-recipe-id',
}: { tier?: string; recipeCount?: number; newDocId?: string } = {}) {
  const mockAdd = jest.fn().mockResolvedValue({ id: newDocId });
  mockCollection
    // First call: db.collection('users').doc(userId).get()
    .mockReturnValueOnce({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({ data: () => ({ tier }) }),
      }),
    })
    // Second call: db.collection('recipes').where(...).select().get()
    .mockReturnValueOnce({
      where: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ size: recipeCount }),
        }),
      }),
    })
    // Third call: db.collection('recipes').add(...)
    .mockReturnValueOnce({ add: mockAdd });

  return { mockAdd };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // resetAllMocks flushes mockReturnValueOnce queues so leftover entries
  // from tests that return early never bleed into the next test.
  jest.resetAllMocks();
});

describe('POST /api/recipes/create — auth', () => {
  it('returns 401 when no Authorization header is present', async () => {
    const req = new Request('http://localhost/api/recipes/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(RECIPE_BODY),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when the token is invalid', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));
    const res = await POST(makeRequest(RECIPE_BODY, 'bad-token'));
    expect(res.status).toBe(401);
  });
});

describe('POST /api/recipes/create — tier enforcement', () => {
  beforeEach(() => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' });
  });

  it('returns 403 with limit_reached when Free user has 15 recipes', async () => {
    setupCollectionMock({ tier: 'Free', recipeCount: 15 });

    const res = await POST(makeRequest(RECIPE_BODY));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe('limit_reached');
    expect(body.limit).toBe(15);
    expect(body.count).toBe(15);
  });

  it('returns 200 when Free user has 14 recipes', async () => {
    setupCollectionMock({ tier: 'Free', recipeCount: 14 });

    const res = await POST(makeRequest(RECIPE_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('new-recipe-id');
  });

  it('allows Pro user to create beyond 15 recipes', async () => {
    setupCollectionMock({ tier: 'Pro', recipeCount: 100 });

    const res = await POST(makeRequest(RECIPE_BODY));
    expect(res.status).toBe(200);
  });

  it('strips client-supplied userId and id from the written document', async () => {
    const { mockAdd } = setupCollectionMock({ tier: 'Pro', recipeCount: 0 });

    await POST(makeRequest({ ...RECIPE_BODY, userId: 'attacker-uid', id: 'fake-id' }));

    const written = mockAdd.mock.calls[0]?.[0];
    expect(written.userId).toBe('user-123');  // from verified token
    expect(written.id).toBeUndefined();        // stripped
  });
});
