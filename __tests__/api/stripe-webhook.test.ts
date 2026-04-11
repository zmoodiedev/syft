/**
 * @jest-environment node
 *
 * Tests for POST /api/stripe/webhook
 *
 * Covers signature verification, recipe lock/unlock helpers,
 * and the Stripe event handlers that update Firestore.
 */

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@/lib/firebase-admin', () => ({
  db: {
    collection: jest.fn(),
    batch: jest.fn(),
  },
}));

jest.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: jest.fn() },
    subscriptions: { retrieve: jest.fn() },
  },
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { POST } from '@/app/api/stripe/webhook/route';
import { db } from '@/lib/firebase-admin';
import { stripe } from '@/lib/stripe';

const mockCollection = db.collection as jest.Mock;
const mockBatch = db.batch as jest.Mock;
const mockConstructEvent = stripe.webhooks.constructEvent as jest.Mock;
const mockRetrieve = stripe.subscriptions.retrieve as jest.Mock;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWebhookRequest(signature = 'valid-sig') {
  return new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': signature },
    body: '{}',
  });
}

function fakeSubscription(userId: string, status = 'active', interval = 'month') {
  return {
    id: 'sub_123',
    status,
    metadata: { userId },
    items: {
      data: [{ plan: { interval }, current_period_end: 9999999999 }],
    },
  };
}

/** Build doc refs for the recipes collection mock. */
function makeRecipeDocs(count: number) {
  return Array.from({ length: count }, (_, i) => ({ ref: { id: `r${i}` } }));
}

/** Set up db.collection chain for a specific call order. */
function setupDbForCheckoutCompleted({
  lockedDocs = [] as { ref: { id: string } }[],
} = {}) {
  // checkout.session.completed: 1 users.doc().update(), then unlockAllRecipes
  const mockUpdate = jest.fn().mockResolvedValue(undefined);
  const mockUserGet = jest.fn();
  const mockRecipesGet = jest.fn().mockResolvedValue({
    empty: lockedDocs.length === 0,
    docs: lockedDocs,
  });
  const mockBatchUpdate = jest.fn();
  const mockBatchCommit = jest.fn().mockResolvedValue(undefined);

  mockCollection
    .mockReturnValueOnce({ doc: jest.fn().mockReturnValue({ update: mockUpdate, get: mockUserGet }) })
    .mockReturnValueOnce({
      where: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ get: mockRecipesGet }) }),
    });

  mockBatch.mockReturnValue({ update: mockBatchUpdate, commit: mockBatchCommit });

  return { mockUpdate, mockBatchUpdate, mockBatchCommit };
}

function setupDbForSubscriptionDeleted({
  recipeDocs = [] as { ref: { id: string } }[],
} = {}) {
  const mockUpdate = jest.fn().mockResolvedValue(undefined);
  const mockRecipesGet = jest.fn().mockResolvedValue({ size: recipeDocs.length, docs: recipeDocs });
  const mockBatchUpdate = jest.fn();
  const mockBatchCommit = jest.fn().mockResolvedValue(undefined);

  mockCollection
    .mockReturnValueOnce({ doc: jest.fn().mockReturnValue({ update: mockUpdate }) })
    .mockReturnValueOnce({
      where: jest.fn().mockReturnValue({ orderBy: jest.fn().mockReturnValue({ get: mockRecipesGet }) }),
    });

  mockBatch.mockReturnValue({ update: mockBatchUpdate, commit: mockBatchCommit });

  return { mockUpdate, mockBatchUpdate, mockBatchCommit };
}

function setupDbForSubscriptionUpdated({
  prevTier = 'Free',
  lockedDocs = [] as { ref: { id: string } }[],
} = {}) {
  const mockUpdate = jest.fn().mockResolvedValue(undefined);
  const mockUserGet = jest.fn().mockResolvedValue({ data: () => ({ tier: prevTier }) });
  const mockRecipesGet = jest.fn().mockResolvedValue({
    empty: lockedDocs.length === 0,
    docs: lockedDocs,
  });
  const mockBatchUpdate = jest.fn();
  const mockBatchCommit = jest.fn().mockResolvedValue(undefined);

  // The route calls db.collection('users') twice: once to .get() the prev tier,
  // then again to .update() the user doc. Third call is the recipes query in
  // unlockAllRecipes (only executed when transitioning to active from non-Pro).
  mockCollection
    .mockReturnValueOnce({ doc: jest.fn().mockReturnValue({ get: mockUserGet }) })
    .mockReturnValueOnce({ doc: jest.fn().mockReturnValue({ update: mockUpdate }) })
    .mockReturnValueOnce({
      where: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ get: mockRecipesGet }) }),
    });

  mockBatch.mockReturnValue({ update: mockBatchUpdate, commit: mockBatchCommit });

  return { mockUpdate, mockBatchUpdate, mockBatchCommit };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // resetAllMocks flushes mockReturnValueOnce queues so leftovers don't bleed between tests.
  jest.resetAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
});

// ── Signature verification ────────────────────────────────────────────────────

describe('signature verification', () => {
  it('returns 400 when stripe-signature header is missing', async () => {
    const req = new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      body: '{}',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when the signature is invalid', async () => {
    mockConstructEvent.mockImplementationOnce(() => { throw new Error('Bad sig'); });
    const res = await POST(makeWebhookRequest());
    expect(res.status).toBe(400);
  });
});

// ── checkout.session.completed ────────────────────────────────────────────────

describe('checkout.session.completed', () => {
  beforeEach(() => {
    mockRetrieve.mockResolvedValue(fakeSubscription('user-abc'));
  });

  it('sets tier to Pro', async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: 'checkout.session.completed',
      data: { object: { mode: 'subscription', metadata: { userId: 'user-abc' }, customer: 'cus_1', subscription: 'sub_1' } },
    });
    const { mockUpdate } = setupDbForCheckoutCompleted();

    const res = await POST(makeWebhookRequest());
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ tier: 'Pro' }));
  });

  it('calls batch.commit() to unlock locked recipes', async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: 'checkout.session.completed',
      data: { object: { mode: 'subscription', metadata: { userId: 'user-abc' }, customer: 'cus_1', subscription: 'sub_1' } },
    });
    const { mockBatchCommit } = setupDbForCheckoutCompleted({ lockedDocs: makeRecipeDocs(3) });

    const res = await POST(makeWebhookRequest());
    expect(res.status).toBe(200);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('skips batch when there are no locked recipes', async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: 'checkout.session.completed',
      data: { object: { mode: 'subscription', metadata: { userId: 'user-abc' }, customer: 'cus_1', subscription: 'sub_1' } },
    });
    const { mockBatchCommit } = setupDbForCheckoutCompleted({ lockedDocs: [] });

    const res = await POST(makeWebhookRequest());
    expect(res.status).toBe(200);
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('ignores non-subscription checkout sessions', async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: 'checkout.session.completed',
      data: { object: { mode: 'payment' } },
    });

    const res = await POST(makeWebhookRequest());
    expect(res.status).toBe(200);
    expect(mockCollection).not.toHaveBeenCalled();
  });
});

// ── customer.subscription.deleted ────────────────────────────────────────────

describe('customer.subscription.deleted', () => {
  it('sets tier to Free', async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: 'customer.subscription.deleted',
      data: { object: fakeSubscription('user-abc', 'canceled') },
    });
    const { mockUpdate } = setupDbForSubscriptionDeleted({ recipeDocs: makeRecipeDocs(10) });

    const res = await POST(makeWebhookRequest());
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ tier: 'Free' }));
  });

  it('locks exactly the overflow recipes (17 total → 2 locked)', async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: 'customer.subscription.deleted',
      data: { object: fakeSubscription('user-abc', 'canceled') },
    });
    const { mockBatchUpdate, mockBatchCommit } = setupDbForSubscriptionDeleted({
      recipeDocs: makeRecipeDocs(17),
    });

    await POST(makeWebhookRequest());
    expect(mockBatchUpdate).toHaveBeenCalledTimes(2); // 17 - 15 = 2 overflow
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('does not lock anything when user has exactly 15 recipes', async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: 'customer.subscription.deleted',
      data: { object: fakeSubscription('user-abc', 'canceled') },
    });
    const { mockBatchUpdate } = setupDbForSubscriptionDeleted({ recipeDocs: makeRecipeDocs(15) });

    await POST(makeWebhookRequest());
    expect(mockBatchUpdate).not.toHaveBeenCalled();
  });

  it('does not lock anything when user has fewer than 15 recipes', async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: 'customer.subscription.deleted',
      data: { object: fakeSubscription('user-abc', 'canceled') },
    });
    const { mockBatchUpdate } = setupDbForSubscriptionDeleted({ recipeDocs: makeRecipeDocs(8) });

    await POST(makeWebhookRequest());
    expect(mockBatchUpdate).not.toHaveBeenCalled();
  });
});

// ── customer.subscription.updated ────────────────────────────────────────────

describe('customer.subscription.updated', () => {
  it('sets tier to Pro when subscription is active', async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: 'customer.subscription.updated',
      data: { object: fakeSubscription('user-abc', 'active') },
    });
    const { mockUpdate } = setupDbForSubscriptionUpdated({ prevTier: 'Free' });

    const res = await POST(makeWebhookRequest());
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ tier: 'Pro' }));
  });

  it('unlocks recipes when transitioning from Free to Pro', async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: 'customer.subscription.updated',
      data: { object: fakeSubscription('user-abc', 'active') },
    });
    const { mockBatchCommit } = setupDbForSubscriptionUpdated({
      prevTier: 'Free',
      lockedDocs: makeRecipeDocs(2),
    });

    await POST(makeWebhookRequest());
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('does not call unlock when subscription was already Pro', async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: 'customer.subscription.updated',
      data: { object: fakeSubscription('user-abc', 'active') },
    });
    const { mockBatchUpdate } = setupDbForSubscriptionUpdated({ prevTier: 'Pro' });

    await POST(makeWebhookRequest());
    expect(mockBatchUpdate).not.toHaveBeenCalled();
  });

  it('sets tier to Free when subscription is past_due', async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: 'customer.subscription.updated',
      data: { object: fakeSubscription('user-abc', 'past_due') },
    });
    const { mockUpdate } = setupDbForSubscriptionUpdated({ prevTier: 'Pro' });

    const res = await POST(makeWebhookRequest());
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ tier: 'Free' }));
  });
});

// ── invoice.payment_failed ────────────────────────────────────────────────────

describe('invoice.payment_failed', () => {
  it('returns 200 and makes no Firestore writes', async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: 'invoice.payment_failed',
      data: { object: { customer: 'cus_abc' } },
    });

    const res = await POST(makeWebhookRequest());
    expect(res.status).toBe(200);
    expect(mockCollection).not.toHaveBeenCalled();
  });
});
