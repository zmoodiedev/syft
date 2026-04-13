/**
 * @jest-environment node
 *
 * Tests for POST /api/stripe/webhook
 *
 * Covers signature verification, recipe lock/unlock, auto-accept of gated
 * friend requests, and all Stripe event handlers.
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
const mockBatch     = db.batch     as jest.Mock;
const mockConstructEvent = stripe.webhooks.constructEvent as jest.Mock;
const mockRetrieve       = stripe.subscriptions.retrieve  as jest.Mock;

// ─── Fixture factories ────────────────────────────────────────────────────────

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

/** Build recipe doc stubs for lock/unlock helpers. */
function makeRecipeDocs(count: number) {
  return Array.from({ length: count }, (_, i) => ({ ref: { id: `r${i}` } }));
}

/**
 * Build a gated friendRequest doc stub.
 * `ref` is used by batch.delete(); `data()` is called to read fields.
 */
function makeGatedRequestDoc(senderId: string, receiverName = 'Receiver') {
  const ref = { delete: jest.fn().mockResolvedValue(undefined) };
  return {
    ref,
    data: () => ({
      senderId,
      receiverName,
      receiverPhotoURL: null,
    }),
  };
}

// ─── Collection mock helpers ───────────────────────────────────────────────────
//
// Each setup function queues exactly the right number of mockReturnValueOnce
// calls so tests don't bleed into each other.
//
// Call order for checkout.session.completed / subscription.updated (upgrade):
//   1  users.doc().update()                       — set tier to Pro
//   2  recipes.where().where().get()              — unlockAllRecipes
//   3  friendRequests.where().where().get()       — autoAcceptGatedFriendRequests
//   Per gated request (if any):
//   4  friendships.doc()                          — ref for batch.set
//   5  notifications.add()                        — friend_accept for sender
//   6  notifications.where().where().where().get()— find gated notif to clean up
//
// Call order for subscription.deleted:
//   1  users.doc().update()                       — set tier to Free
//   2  recipes.where().orderBy().get()            — lockOverflowRecipes
//   (no friend-request work on downgrade)
//
// Call order for subscription.updated (get prev tier first):
//   1  users.doc().get()                          — read prevTier
//   2  users.doc().update()                       — update tier
//   3  recipes.where().where().get()              — unlockAllRecipes (if upgrading)
//   4  friendRequests.where().where().get()       — autoAcceptGatedFriendRequests (if upgrading)
// ─────────────────────────────────────────────────────────────────────────────

/** Queue an empty gated-request query (most tests just need this no-op). */
function queueEmptyGatedRequests() {
  mockCollection.mockReturnValueOnce({
    where: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
      }),
    }),
  });
}

/**
 * Queue the per-request Firestore calls for autoAcceptGatedFriendRequests
 * when gatedDocs is non-empty.
 *
 * The implementation has two separate loops:
 *   Loop 1 (batch): db.collection('friendships').doc() — one call per request
 *   Loop 2 (notify): db.collection('notifications').add() + cleanup query — per request
 * So we must queue all friendships calls first, then all notification calls.
 */
function queueGatedRequestSideEffects(
  gatedDocs: ReturnType<typeof makeGatedRequestDoc>[],
  mockAdd: jest.Mock,
) {
  // Phase 1 — batch loop: friendships.doc() for each request
  for (const _ of gatedDocs) {
    mockCollection.mockReturnValueOnce({
      doc: jest.fn().mockReturnValue({}),
    });
  }
  // Phase 2 — notification loop: add() + cleanup query for each request
  for (const _ of gatedDocs) {
    mockCollection.mockReturnValueOnce({ add: mockAdd });
    mockCollection.mockReturnValueOnce({
      where: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ docs: [] }),
          }),
        }),
      }),
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────

function setupDbForCheckoutCompleted({
  lockedDocs  = [] as { ref: { id: string } }[],
  gatedDocs   = [] as ReturnType<typeof makeGatedRequestDoc>[],
} = {}) {
  const mockUpdate      = jest.fn().mockResolvedValue(undefined);
  const mockRecipesGet  = jest.fn().mockResolvedValue({
    empty: lockedDocs.length === 0,
    docs:  lockedDocs,
  });
  const mockBatchUpdate = jest.fn();
  const mockBatchSet    = jest.fn();
  const mockBatchDelete = jest.fn();
  const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
  const mockAdd         = jest.fn().mockResolvedValue({ id: 'notif-new' });

  // Call 1 — users.doc().update()
  mockCollection.mockReturnValueOnce({
    doc: jest.fn().mockReturnValue({ update: mockUpdate }),
  });
  // Call 2 — unlockAllRecipes: recipes query
  mockCollection.mockReturnValueOnce({
    where: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({ get: mockRecipesGet }),
    }),
  });
  // Call 3 — autoAcceptGatedFriendRequests: friendRequests query
  if (gatedDocs.length === 0) {
    queueEmptyGatedRequests();
  } else {
    mockCollection.mockReturnValueOnce({
      where: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ empty: false, docs: gatedDocs }),
        }),
      }),
    });
    queueGatedRequestSideEffects(gatedDocs, mockAdd);
  }

  mockBatch.mockReturnValue({
    update: mockBatchUpdate,
    set:    mockBatchSet,
    delete: mockBatchDelete,
    commit: mockBatchCommit,
  });

  return { mockUpdate, mockBatchUpdate, mockBatchSet, mockBatchDelete, mockBatchCommit, mockAdd };
}

function setupDbForSubscriptionDeleted({
  recipeDocs = [] as { ref: { id: string } }[],
} = {}) {
  const mockUpdate      = jest.fn().mockResolvedValue(undefined);
  const mockRecipesGet  = jest.fn().mockResolvedValue({ size: recipeDocs.length, docs: recipeDocs });
  const mockBatchUpdate = jest.fn();
  const mockBatchCommit = jest.fn().mockResolvedValue(undefined);

  mockCollection
    .mockReturnValueOnce({ doc: jest.fn().mockReturnValue({ update: mockUpdate }) })
    .mockReturnValueOnce({
      where: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockReturnValue({ get: mockRecipesGet }),
      }),
    });

  mockBatch.mockReturnValue({ update: mockBatchUpdate, commit: mockBatchCommit });

  return { mockUpdate, mockBatchUpdate, mockBatchCommit };
}

function setupDbForSubscriptionUpdated({
  prevTier    = 'Free',
  lockedDocs  = [] as { ref: { id: string } }[],
  gatedDocs   = [] as ReturnType<typeof makeGatedRequestDoc>[],
} = {}) {
  const mockUpdate      = jest.fn().mockResolvedValue(undefined);
  const mockUserGet     = jest.fn().mockResolvedValue({ data: () => ({ tier: prevTier }) });
  const mockRecipesGet  = jest.fn().mockResolvedValue({
    empty: lockedDocs.length === 0,
    docs:  lockedDocs,
  });
  const mockBatchUpdate = jest.fn();
  const mockBatchSet    = jest.fn();
  const mockBatchDelete = jest.fn();
  const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
  const mockAdd         = jest.fn().mockResolvedValue({ id: 'notif-new' });

  // Call 1 — read prevTier
  mockCollection.mockReturnValueOnce({ doc: jest.fn().mockReturnValue({ get: mockUserGet }) });
  // Call 2 — update user doc
  mockCollection.mockReturnValueOnce({ doc: jest.fn().mockReturnValue({ update: mockUpdate }) });

  if (prevTier !== 'Pro' && /* subscription becomes active */ true) {
    // Call 3 — unlockAllRecipes
    mockCollection.mockReturnValueOnce({
      where: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({ get: mockRecipesGet }),
      }),
    });
    // Call 4 — autoAcceptGatedFriendRequests
    if (gatedDocs.length === 0) {
      queueEmptyGatedRequests();
    } else {
      mockCollection.mockReturnValueOnce({
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ empty: false, docs: gatedDocs }),
          }),
        }),
      });
      queueGatedRequestSideEffects(gatedDocs, mockAdd);
    }
  }

  mockBatch.mockReturnValue({
    update: mockBatchUpdate,
    set:    mockBatchSet,
    delete: mockBatchDelete,
    commit: mockBatchCommit,
  });

  return { mockUpdate, mockBatchUpdate, mockBatchSet, mockBatchDelete, mockBatchCommit, mockAdd };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
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

  const completedEvent = (userId = 'user-abc') => ({
    type: 'checkout.session.completed',
    data: {
      object: {
        mode: 'subscription',
        metadata: { userId },
        customer: 'cus_1',
        subscription: 'sub_1',
      },
    },
  });

  it('sets tier to Pro and clears subscriptionLapsedAt', async () => {
    mockConstructEvent.mockReturnValueOnce(completedEvent());
    const { mockUpdate } = setupDbForCheckoutCompleted();
    const res = await POST(makeWebhookRequest());
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      tier: 'Pro',
      subscriptionLapsedAt: expect.anything(), // FieldValue.delete() sentinel
    }));
  });

  it('unlocks locked recipes', async () => {
    mockConstructEvent.mockReturnValueOnce(completedEvent());
    const { mockBatchCommit } = setupDbForCheckoutCompleted({ lockedDocs: makeRecipeDocs(3) });
    const res = await POST(makeWebhookRequest());
    expect(res.status).toBe(200);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('skips recipe batch when there are no locked recipes', async () => {
    mockConstructEvent.mockReturnValueOnce(completedEvent());
    const { mockBatchCommit } = setupDbForCheckoutCompleted();
    const res = await POST(makeWebhookRequest());
    expect(res.status).toBe(200);
    // batch.commit() should not be called when nothing to unlock and no gated requests
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

  it('auto-accepts gated friend requests and creates friendship', async () => {
    mockConstructEvent.mockReturnValueOnce(completedEvent());
    const gatedDocs = [makeGatedRequestDoc('sender-1')];
    const { mockBatchSet, mockBatchDelete, mockBatchCommit } = setupDbForCheckoutCompleted({ gatedDocs });

    const res = await POST(makeWebhookRequest());
    expect(res.status).toBe(200);
    expect(mockBatchSet).toHaveBeenCalledTimes(1);
    expect(mockBatchDelete).toHaveBeenCalledTimes(1);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('sends a friend_accept notification to the original sender on auto-accept', async () => {
    mockConstructEvent.mockReturnValueOnce(completedEvent('user-abc'));
    const gatedDocs = [makeGatedRequestDoc('sender-1', 'New Pro User')];
    const { mockAdd } = setupDbForCheckoutCompleted({ gatedDocs });

    await POST(makeWebhookRequest());
    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'sender-1',
      type: 'friend_accept',
      fromUserId: 'user-abc',
    }));
  });

  it('auto-accepts multiple gated requests in one upgrade', async () => {
    mockConstructEvent.mockReturnValueOnce(completedEvent());
    const gatedDocs = [
      makeGatedRequestDoc('sender-1'),
      makeGatedRequestDoc('sender-2'),
    ];
    const { mockBatchSet, mockAdd } = setupDbForCheckoutCompleted({ gatedDocs });

    await POST(makeWebhookRequest());
    expect(mockBatchSet).toHaveBeenCalledTimes(2);
    expect(mockAdd).toHaveBeenCalledTimes(2);
  });

  it('does nothing with gated requests when there are none', async () => {
    mockConstructEvent.mockReturnValueOnce(completedEvent());
    const { mockBatchSet, mockBatchDelete } = setupDbForCheckoutCompleted();

    const res = await POST(makeWebhookRequest());
    expect(res.status).toBe(200);
    expect(mockBatchSet).not.toHaveBeenCalled();
    expect(mockBatchDelete).not.toHaveBeenCalled();
  });

  it('cleans up the gated notification from the upgraded user inbox', async () => {
    mockConstructEvent.mockReturnValueOnce(completedEvent('user-abc'));
    const gatedDocs = [makeGatedRequestDoc('sender-1')];

    // Override the gated-notif cleanup query to return a notification to delete
    const mockNotifDelete = jest.fn().mockResolvedValue(undefined);
    const gatedNotifDoc = { ref: { delete: mockNotifDelete } };

    // We need to intercept the third notifications collection call (the cleanup query).
    // Do the standard setup first, then override the last mockReturnValueOnce.
    // Easiest: wire gatedDocs without side effects, then manually queue the overrides.
    const mockUpdate  = jest.fn().mockResolvedValue(undefined);
    const mockBatchSet    = jest.fn();
    const mockBatchDelete = jest.fn();
    const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
    const mockAdd         = jest.fn().mockResolvedValue({ id: 'notif-new' });

    mockRetrieve.mockResolvedValue(fakeSubscription('user-abc'));
    mockCollection
      // Call 1: users.doc().update()
      .mockReturnValueOnce({ doc: jest.fn().mockReturnValue({ update: mockUpdate }) })
      // Call 2: unlockAllRecipes (empty)
      .mockReturnValueOnce({
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
          }),
        }),
      })
      // Call 3: friendRequests query — 1 gated request
      .mockReturnValueOnce({
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue({ empty: false, docs: gatedDocs }),
          }),
        }),
      })
      // Call 4: friendships.doc() — ref for batch.set
      .mockReturnValueOnce({ doc: jest.fn().mockReturnValue({}) })
      // Call 5: notifications.add() — friend_accept for sender
      .mockReturnValueOnce({ add: mockAdd })
      // Call 6: notifications query — returns 1 gated notif to delete
      .mockReturnValueOnce({
        where: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ docs: [gatedNotifDoc] }),
            }),
          }),
        }),
      });

    mockBatch.mockReturnValue({
      set: mockBatchSet, delete: mockBatchDelete, commit: mockBatchCommit,
    });

    await POST(makeWebhookRequest());
    expect(mockNotifDelete).toHaveBeenCalledTimes(1);
  });
});

// ── customer.subscription.deleted ────────────────────────────────────────────

describe('customer.subscription.deleted', () => {
  it('sets tier to Free and writes subscriptionLapsedAt', async () => {
    mockConstructEvent.mockReturnValueOnce({
      type: 'customer.subscription.deleted',
      data: { object: fakeSubscription('user-abc', 'canceled') },
    });
    const { mockUpdate } = setupDbForSubscriptionDeleted({ recipeDocs: makeRecipeDocs(10) });

    const res = await POST(makeWebhookRequest());
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      tier: 'Free',
      subscriptionLapsedAt: expect.any(Date),
    }));
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
  const updatedEvent = (userId = 'user-abc', status = 'active') => ({
    type: 'customer.subscription.updated',
    data: { object: fakeSubscription(userId, status) },
  });

  it('sets tier to Pro when subscription is active', async () => {
    mockConstructEvent.mockReturnValueOnce(updatedEvent());
    const { mockUpdate } = setupDbForSubscriptionUpdated({ prevTier: 'Free' });

    const res = await POST(makeWebhookRequest());
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ tier: 'Pro' }));
  });

  it('unlocks recipes when transitioning from Free to Pro', async () => {
    mockConstructEvent.mockReturnValueOnce(updatedEvent());
    const { mockBatchCommit } = setupDbForSubscriptionUpdated({
      prevTier:   'Free',
      lockedDocs: makeRecipeDocs(2),
    });

    await POST(makeWebhookRequest());
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('does not call unlock when subscription was already Pro', async () => {
    mockConstructEvent.mockReturnValueOnce(updatedEvent('user-abc', 'active'));
    const { mockBatchUpdate } = setupDbForSubscriptionUpdated({ prevTier: 'Pro' });

    await POST(makeWebhookRequest());
    expect(mockBatchUpdate).not.toHaveBeenCalled();
  });

  it('keeps tier as Pro when subscription is past_due (grace period)', async () => {
    mockConstructEvent.mockReturnValueOnce(updatedEvent('user-abc', 'past_due'));
    const { mockUpdate } = setupDbForSubscriptionUpdated({ prevTier: 'Pro' });

    const res = await POST(makeWebhookRequest());
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      tier: 'Pro',
      subscriptionStatus: 'past_due',
    }));
  });

  it('does not unlock recipes or auto-accept requests when going past_due', async () => {
    mockConstructEvent.mockReturnValueOnce(updatedEvent('user-abc', 'past_due'));
    const { mockBatchUpdate, mockBatchSet } = setupDbForSubscriptionUpdated({ prevTier: 'Pro' });

    await POST(makeWebhookRequest());
    expect(mockBatchUpdate).not.toHaveBeenCalled();
    expect(mockBatchSet).not.toHaveBeenCalled();
  });

  it('auto-accepts gated friend requests when re-activating from Free', async () => {
    mockConstructEvent.mockReturnValueOnce(updatedEvent());
    const gatedDocs = [makeGatedRequestDoc('sender-1')];
    const { mockBatchSet, mockBatchDelete } = setupDbForSubscriptionUpdated({
      prevTier:  'Free',
      gatedDocs,
    });

    const res = await POST(makeWebhookRequest());
    expect(res.status).toBe(200);
    expect(mockBatchSet).toHaveBeenCalledTimes(1);
    expect(mockBatchDelete).toHaveBeenCalledTimes(1);
  });

  it('does not run auto-accept when already Pro (no tier transition)', async () => {
    mockConstructEvent.mockReturnValueOnce(updatedEvent('user-abc', 'active'));
    const { mockBatchSet } = setupDbForSubscriptionUpdated({ prevTier: 'Pro' });

    await POST(makeWebhookRequest());
    expect(mockBatchSet).not.toHaveBeenCalled();
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
