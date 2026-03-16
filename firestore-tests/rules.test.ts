// Run with: cd firestore-tests && npm install && npm test
// Requires Firebase emulator: firebase emulators:start --only firestore

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
} from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

const USER_A = 'userA';
const USER_B = 'userB';
const USER_C = 'userC'; // unrelated third party

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'petbase-test',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Returns a Firestore instance authenticated as the given uid. */
function authed(uid: string) {
  return testEnv.authenticatedContext(uid).firestore();
}

/** Returns an unauthenticated Firestore instance. */
function unauthed() {
  return testEnv.unauthenticatedContext().firestore();
}

/**
 * Seed data as the admin (bypasses rules) so tests can set up prerequisite
 * documents without hitting rule gates.
 */
async function seed(path: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data);
  });
}

// ─── 1. Users: owner-only access to own subtree ──────────────────────────────

describe('users/{userId}/** — owner-only subtree', () => {
  it('owner can read their own profile', async () => {
    await seed(`users/${USER_A}/profile/data`, { displayName: 'Alice' });
    const db = authed(USER_A);
    await assertSucceeds(getDoc(doc(db, `users/${USER_A}/profile/data`)));
  });

  it('another authenticated user cannot write to a different user subtree', async () => {
    const db = authed(USER_B);
    await assertFails(
      setDoc(doc(db, `users/${USER_A}/config/settings`), { theme: 'dark' })
    );
  });

  it('unauthenticated user cannot read or write any user subtree', async () => {
    await seed(`users/${USER_A}/profile/data`, { displayName: 'Alice' });
    const db = unauthed();
    await assertFails(getDoc(doc(db, `users/${USER_A}/profile/data`)));
  });
});

// ─── 2. Pets: authenticated reads; owner or household writes ─────────────────

describe('users/{userId}/pets/{petId} — public reads, owner writes', () => {
  beforeEach(async () => {
    await seed(`users/${USER_A}/pets/pet1`, { name: 'Buddy', species: 'dog' });
  });

  it('any authenticated user can read a pet', async () => {
    const db = authed(USER_B);
    await assertSucceeds(getDoc(doc(db, `users/${USER_A}/pets/pet1`)));
  });

  it('unauthenticated user cannot read a pet', async () => {
    await assertFails(
      getDoc(doc(unauthed(), `users/${USER_A}/pets/pet1`))
    );
  });

  it('owner can update their own pet', async () => {
    const db = authed(USER_A);
    await assertSucceeds(
      updateDoc(doc(db, `users/${USER_A}/pets/pet1`), { name: 'Max' })
    );
  });

  it('non-owner (without shared household) cannot write to a pet', async () => {
    const db = authed(USER_B);
    await assertFails(
      updateDoc(doc(db, `users/${USER_A}/pets/pet1`), { name: 'Hacked' })
    );
  });
});

// ─── 3. publicCards: world-readable; owner-only writes ──────────────────────

describe('publicCards/{cardId} — world readable, owner writes', () => {
  beforeEach(async () => {
    await seed('publicCards/card1', { ownerId: USER_A, title: 'Buddy Card' });
  });

  it('unauthenticated user can read a public card', async () => {
    await assertSucceeds(
      getDoc(doc(unauthed(), 'publicCards/card1'))
    );
  });

  it('authenticated user can read a public card', async () => {
    await assertSucceeds(
      getDoc(doc(authed(USER_B), 'publicCards/card1'))
    );
  });

  it('owner can update their public card', async () => {
    const db = authed(USER_A);
    await assertSucceeds(
      updateDoc(doc(db, 'publicCards/card1'), { title: 'Updated Title' })
    );
  });

  it('non-owner cannot update a public card', async () => {
    const db = authed(USER_B);
    await assertFails(
      updateDoc(doc(db, 'publicCards/card1'), { title: 'Hacked' })
    );
  });

  it('owner can delete their public card', async () => {
    const db = authed(USER_A);
    await assertSucceeds(deleteDoc(doc(db, 'publicCards/card1')));
  });

  it('non-owner cannot delete a public card', async () => {
    const db = authed(USER_B);
    await assertFails(deleteDoc(doc(db, 'publicCards/card1')));
  });

  it('create requires ownerId to match authenticated uid', async () => {
    // USER_B tries to create a card claiming ownerId = USER_A
    const db = authed(USER_B);
    await assertFails(
      setDoc(doc(db, 'publicCards/card2'), { ownerId: USER_A, title: 'Fake' })
    );
  });

  it('unauthenticated user cannot create a public card', async () => {
    await assertFails(
      setDoc(doc(unauthed(), 'publicCards/card99'), {
        ownerId: 'anyone',
        title: 'Anon Card',
      })
    );
  });
});

// ─── 4. groups: authenticated reads; Owner-only update/delete ────────────────

describe('groups/{groupId} — authenticated reads, Owner-only mutations', () => {
  const GROUP = 'group1';

  beforeEach(async () => {
    await seed(`groups/${GROUP}`, { name: 'Dog Lovers', createdBy: USER_A });
    // USER_A is the Owner
    await seed(`groups/${GROUP}/members/${USER_A}`, { role: 'Owner' });
    // USER_B is a regular Member
    await seed(`groups/${GROUP}/members/${USER_B}`, { role: 'Member' });
  });

  it('authenticated user can read the group', async () => {
    await assertSucceeds(getDoc(doc(authed(USER_C), `groups/${GROUP}`)));
  });

  it('unauthenticated user cannot read the group', async () => {
    await assertFails(getDoc(doc(unauthed(), `groups/${GROUP}`)));
  });

  it('Owner can update the group', async () => {
    const db = authed(USER_A);
    await assertSucceeds(
      updateDoc(doc(db, `groups/${GROUP}`), { name: 'Dog Lovers Updated' })
    );
  });

  it('non-Owner Member cannot update the group', async () => {
    const db = authed(USER_B);
    await assertFails(
      updateDoc(doc(db, `groups/${GROUP}`), { name: 'Hacked Name' })
    );
  });

  it('Owner can delete the group', async () => {
    const db = authed(USER_A);
    await assertSucceeds(deleteDoc(doc(db, `groups/${GROUP}`)));
  });
});

// ─── 5. groups/members: self-write and Owner-managed ─────────────────────────

describe('groups/{groupId}/members/{userId} — self or Owner writes', () => {
  const GROUP = 'group1';

  beforeEach(async () => {
    await seed(`groups/${GROUP}`, { name: 'Dog Lovers' });
    await seed(`groups/${GROUP}/members/${USER_A}`, { role: 'Owner' });
  });

  it('user can write their own membership (join)', async () => {
    const db = authed(USER_B);
    await assertSucceeds(
      setDoc(doc(db, `groups/${GROUP}/members/${USER_B}`), { role: 'Member' })
    );
  });

  it('user cannot write another member doc (not Owner)', async () => {
    const db = authed(USER_B);
    await assertFails(
      setDoc(doc(db, `groups/${GROUP}/members/${USER_C}`), { role: 'Member' })
    );
  });

  it('Owner can manage any member', async () => {
    await seed(`groups/${GROUP}/members/${USER_B}`, { role: 'Member' });
    const db = authed(USER_A);
    await assertSucceeds(
      updateDoc(doc(db, `groups/${GROUP}/members/${USER_B}`), {
        role: 'Moderator',
      })
    );
  });
});

// ─── 6. groups/posts: member create; author or mod update/delete ─────────────

describe('groups/{groupId}/posts/{postId} — member create, role-based update', () => {
  const GROUP = 'group1';
  const POST = 'post1';

  beforeEach(async () => {
    await seed(`groups/${GROUP}`, { name: 'Dog Lovers' });
    await seed(`groups/${GROUP}/members/${USER_A}`, { role: 'Owner' });
    await seed(`groups/${GROUP}/members/${USER_B}`, { role: 'Member' });
    await seed(`groups/${GROUP}/posts/${POST}`, {
      authorId: USER_B,
      text: 'Hello',
      reactions: {},
    });
  });

  it('member can create a post', async () => {
    const db = authed(USER_B);
    await assertSucceeds(
      addDoc(collection(db, `groups/${GROUP}/posts`), {
        authorId: USER_B,
        text: 'New post',
        reactions: {},
      })
    );
  });

  it('non-member (USER_C) cannot create a post', async () => {
    const db = authed(USER_C);
    await assertFails(
      addDoc(collection(db, `groups/${GROUP}/posts`), {
        authorId: USER_C,
        text: 'Intruder post',
        reactions: {},
      })
    );
  });

  it('author can update their own post', async () => {
    const db = authed(USER_B);
    await assertSucceeds(
      updateDoc(doc(db, `groups/${GROUP}/posts/${POST}`), { text: 'Edited' })
    );
  });

  it('Owner/Moderator can update any post', async () => {
    const db = authed(USER_A);
    await assertSucceeds(
      updateDoc(doc(db, `groups/${GROUP}/posts/${POST}`), { text: 'Moderated' })
    );
  });

  it('non-author non-mod Member can only update reactions field', async () => {
    // Seed a third member USER_C who is a regular member but not the author
    await seed(`groups/${GROUP}/members/${USER_C}`, { role: 'Member' });
    const db = authed(USER_C);

    // Updating only reactions should succeed
    await assertSucceeds(
      updateDoc(doc(db, `groups/${GROUP}/posts/${POST}`), {
        reactions: { '👍': [USER_C] },
      })
    );
  });

  it('non-author non-mod Member cannot update non-reactions field', async () => {
    await seed(`groups/${GROUP}/members/${USER_C}`, { role: 'Member' });
    const db = authed(USER_C);
    await assertFails(
      updateDoc(doc(db, `groups/${GROUP}/posts/${POST}`), { text: 'Hacked' })
    );
  });

  it('author can delete their own post', async () => {
    const db = authed(USER_B);
    await assertSucceeds(deleteDoc(doc(db, `groups/${GROUP}/posts/${POST}`)));
  });

  it('non-author non-mod cannot delete a post', async () => {
    await seed(`groups/${GROUP}/members/${USER_C}`, { role: 'Member' });
    const db = authed(USER_C);
    await assertFails(deleteDoc(doc(db, `groups/${GROUP}/posts/${POST}`)));
  });
});

// ─── 7. Direct Messages: participant-only access ─────────────────────────────

describe('messages/{messageId} — participant-only access', () => {
  const MSG = 'msg1';

  beforeEach(async () => {
    await seed(`messages/${MSG}`, {
      fromUid: USER_A,
      participants: [USER_A, USER_B],
      text: 'Hey!',
      read: false,
      reactions: {},
    });
  });

  it('participant can read the message', async () => {
    await assertSucceeds(getDoc(doc(authed(USER_A), `messages/${MSG}`)));
    await assertSucceeds(getDoc(doc(authed(USER_B), `messages/${MSG}`)));
  });

  it('non-participant cannot read the message', async () => {
    await assertFails(getDoc(doc(authed(USER_C), `messages/${MSG}`)));
  });

  it('unauthenticated user cannot read a message', async () => {
    await assertFails(getDoc(doc(unauthed(), `messages/${MSG}`)));
  });

  it('sender can create a message they authored', async () => {
    const db = authed(USER_A);
    await assertSucceeds(
      setDoc(doc(db, 'messages/msg2'), {
        fromUid: USER_A,
        participants: [USER_A, USER_B],
        text: 'New message',
        read: false,
        reactions: {},
      })
    );
  });

  it('cannot create a message impersonating another sender', async () => {
    const db = authed(USER_B);
    await assertFails(
      setDoc(doc(db, 'messages/msg3'), {
        fromUid: USER_A, // B claims to be A
        participants: [USER_A, USER_B],
        text: 'Spoof',
        read: false,
        reactions: {},
      })
    );
  });

  it('participant can soft-delete (update allowed fields only)', async () => {
    const db = authed(USER_A);
    await assertSucceeds(
      updateDoc(doc(db, `messages/${MSG}`), { deletedBySender: true })
    );
  });

  it('participant cannot update disallowed fields', async () => {
    const db = authed(USER_A);
    await assertFails(
      updateDoc(doc(db, `messages/${MSG}`), { text: 'Edited text' })
    );
  });
});

// ─── 8. Notifications: private per-user subcollection ────────────────────────

describe('notifications/{uid}/items/{notifId} — owner-only', () => {
  beforeEach(async () => {
    await seed(`notifications/${USER_A}/items/notif1`, {
      type: 'friendRequest',
      read: false,
    });
  });

  it('owner can read their own notifications', async () => {
    await assertSucceeds(
      getDoc(doc(authed(USER_A), `notifications/${USER_A}/items/notif1`))
    );
  });

  it('another user cannot read someone else notifications', async () => {
    await assertFails(
      getDoc(doc(authed(USER_B), `notifications/${USER_A}/items/notif1`))
    );
  });

  it('unauthenticated user cannot read notifications', async () => {
    await assertFails(
      getDoc(doc(unauthed(), `notifications/${USER_A}/items/notif1`))
    );
  });

  it('owner can write their own notifications', async () => {
    const db = authed(USER_A);
    await assertSucceeds(
      setDoc(doc(db, `notifications/${USER_A}/items/notif2`), {
        type: 'reaction',
        read: false,
      })
    );
  });

  it('another user cannot write to someone else notifications', async () => {
    const db = authed(USER_B);
    await assertFails(
      setDoc(doc(db, `notifications/${USER_A}/items/notif99`), {
        type: 'spam',
        read: false,
      })
    );
  });
});

// ─── 9. Reports: write-only (no reads) ───────────────────────────────────────

describe('reports/{reportId} — write-only for authenticated users', () => {
  beforeEach(async () => {
    await seed('reports/report1', { reportedBy: USER_A, reason: 'spam' });
  });

  it('authenticated user can create a report', async () => {
    const db = authed(USER_A);
    await assertSucceeds(
      setDoc(doc(db, 'reports/newReport'), {
        reportedBy: USER_A,
        reason: 'harassment',
      })
    );
  });

  it('nobody can read a report (not even the submitter)', async () => {
    await assertFails(getDoc(doc(authed(USER_A), 'reports/report1')));
  });

  it('nobody can update a report', async () => {
    await assertFails(
      updateDoc(doc(authed(USER_A), 'reports/report1'), { reason: 'updated' })
    );
  });

  it('nobody can delete a report', async () => {
    await assertFails(deleteDoc(doc(authed(USER_A), 'reports/report1')));
  });

  it('unauthenticated user cannot create a report', async () => {
    await assertFails(
      setDoc(doc(unauthed(), 'reports/anonReport'), {
        reportedBy: 'anon',
        reason: 'test',
      })
    );
  });
});

// ─── 10. friendRequests: participant-only read; sender creates ───────────────

describe('friendRequests/{requestId} — sender/recipient access', () => {
  beforeEach(async () => {
    await seed('friendRequests/req1', {
      fromUid: USER_A,
      toUid: USER_B,
      status: 'pending',
    });
  });

  it('sender can read the friend request', async () => {
    await assertSucceeds(
      getDoc(doc(authed(USER_A), 'friendRequests/req1'))
    );
  });

  it('recipient can read the friend request', async () => {
    await assertSucceeds(
      getDoc(doc(authed(USER_B), 'friendRequests/req1'))
    );
  });

  it('unrelated third party cannot read the friend request', async () => {
    await assertFails(getDoc(doc(authed(USER_C), 'friendRequests/req1')));
  });

  it('sender can create a request where fromUid matches their uid', async () => {
    const db = authed(USER_A);
    await assertSucceeds(
      setDoc(doc(db, 'friendRequests/req2'), {
        fromUid: USER_A,
        toUid: USER_C,
        status: 'pending',
      })
    );
  });

  it('cannot create a friend request impersonating another user', async () => {
    const db = authed(USER_C);
    await assertFails(
      setDoc(doc(db, 'friendRequests/req3'), {
        fromUid: USER_A, // C impersonates A
        toUid: USER_B,
        status: 'pending',
      })
    );
  });

  it('recipient can update (accept/reject) the request', async () => {
    const db = authed(USER_B);
    await assertSucceeds(
      updateDoc(doc(db, 'friendRequests/req1'), { status: 'accepted' })
    );
  });

  it('unrelated user cannot update the request', async () => {
    await assertFails(
      updateDoc(doc(authed(USER_C), 'friendRequests/req1'), {
        status: 'accepted',
      })
    );
  });
});

// ─── 11. Households: owner creates, members read ────────────────────────────

describe('households/{householdId} — owner and member access', () => {
  const HH = 'hh1';

  beforeEach(async () => {
    await seed(`households/${HH}`, { ownerId: USER_A, name: 'Smith Family' });
    await seed(`households/${HH}/members/${USER_B}`, { role: 'Member' });
  });

  it('owner can read the household', async () => {
    await assertSucceeds(getDoc(doc(authed(USER_A), `households/${HH}`)));
  });

  it('household member can read the household', async () => {
    await assertSucceeds(getDoc(doc(authed(USER_B), `households/${HH}`)));
  });

  it('non-member cannot read the household', async () => {
    await assertFails(getDoc(doc(authed(USER_C), `households/${HH}`)));
  });

  it('authenticated user can create a household they own', async () => {
    const db = authed(USER_C);
    await assertSucceeds(
      setDoc(doc(db, 'households/hh2'), { ownerId: USER_C, name: 'New Family' })
    );
  });

  it('cannot create a household with mismatched ownerId', async () => {
    const db = authed(USER_C);
    await assertFails(
      setDoc(doc(db, 'households/hh3'), { ownerId: USER_A, name: 'Fake' })
    );
  });

  it('owner can update household metadata', async () => {
    const db = authed(USER_A);
    await assertSucceeds(
      updateDoc(doc(db, `households/${HH}`), { name: 'Updated Name' })
    );
  });

  it('non-owner member cannot update household metadata', async () => {
    const db = authed(USER_B);
    await assertFails(
      updateDoc(doc(db, `households/${HH}`), { name: 'Hacked' })
    );
  });

  it('owner can delete the household', async () => {
    const db = authed(USER_A);
    await assertSucceeds(deleteDoc(doc(db, `households/${HH}`)));
  });
});

// ─── 12. Households/members: join self, owner manages ────────────────────────

describe('households/{householdId}/members/{uid} — self-join, owner manages', () => {
  const HH = 'hh1';

  beforeEach(async () => {
    await seed(`households/${HH}`, { ownerId: USER_A, name: 'Smith Family' });
    await seed(`households/${HH}/members/${USER_A}`, { role: 'Owner' });
    await seed(`households/${HH}/members/${USER_B}`, { role: 'Member' });
  });

  it('user can join (create their own member doc)', async () => {
    const db = authed(USER_C);
    await assertSucceeds(
      setDoc(doc(db, `households/${HH}/members/${USER_C}`), { role: 'Member' })
    );
  });

  it('user cannot create a member doc for another uid', async () => {
    const db = authed(USER_C);
    await assertFails(
      setDoc(doc(db, `households/${HH}/members/${USER_B}`), { role: 'Owner' })
    );
  });

  it('member can leave (delete their own membership)', async () => {
    const db = authed(USER_B);
    await assertSucceeds(
      deleteDoc(doc(db, `households/${HH}/members/${USER_B}`))
    );
  });

  it('owner can remove any member', async () => {
    const db = authed(USER_A);
    await assertSucceeds(
      deleteDoc(doc(db, `households/${HH}/members/${USER_B}`))
    );
  });

  it('non-owner cannot remove another member', async () => {
    await seed(`households/${HH}/members/${USER_C}`, { role: 'Member' });
    const db = authed(USER_B);
    await assertFails(
      deleteDoc(doc(db, `households/${HH}/members/${USER_C}`))
    );
  });

  it('only owner can update member roles', async () => {
    const db = authed(USER_A);
    await assertSucceeds(
      updateDoc(doc(db, `households/${HH}/members/${USER_B}`), {
        role: 'FamilyLeader',
      })
    );
  });

  it('member cannot update their own role', async () => {
    const db = authed(USER_B);
    await assertFails(
      updateDoc(doc(db, `households/${HH}/members/${USER_B}`), {
        role: 'Owner',
      })
    );
  });
});
