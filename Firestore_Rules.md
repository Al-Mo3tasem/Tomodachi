# 🔒 HiraQuest — Firestore Security Rules

This file holds the **current recommended** Firestore security rules and exact
instructions for applying them. Keep it in sync with any rule change.

---

## ⚠️ Important context (read first)

Phase 2 (Zen Mode, Survival Rush, leaderboards) **already works on your
existing rules** — no change is strictly required to play. The reason: your
current ruleset begins with a broad catch-all:

```
match /{document=**} {
  allow read, write: if request.auth != null;
}
```

In Firestore, access is granted if **any** matching rule allows it. So that
catch-all silently grants every signed-in user full read/write to *every*
collection — which also means the `leaderboards` rule `allow write: if false`
below it has **no effect**.

That works, but it does not express the intended security model. The ruleset
below removes the catch-all and scopes each collection properly. **Applying it
is recommended but optional** — Phase 2 will deploy and run either way.

---

## ✅ Recommended hardened ruleset (Phase 2)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ----- Users -----
    // Both players can read each other (needed for the friend card).
    // You may only create / change your own user document.
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create, update, delete: if request.auth != null
                                     && request.auth.uid == userId;
    }

    // ----- Stats -----
    // Readable by both players; writable only by the owner.
    match /stats/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // ----- Presence -----
    // Readable by both players; writable only by the owner.
    match /presence/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // ----- Game sessions -----
    // Any signed-in user can read and create a session.
    // Updates/deletes are limited to participants (delete powers the
    // "Reset My Progress" feature; updates are used by Duel / Co-op later).
    match /game_sessions/{sessionId} {
      allow read, create: if request.auth != null;
      allow update, delete: if request.auth != null
                            && request.auth.uid in resource.data.playerIds;
    }

    // ----- Leaderboards -----
    // Any signed-in user can read and write. The app maintains the
    // top-10 entries client-side; full game_sessions remain the audit trail.
    match /leaderboards/{docId} {
      allow read, write: if request.auth != null;
    }

    // ----- Content sets -----
    // Read-only for the app. Seed / edit these from the Firebase console.
    match /content_sets/{setId} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    // ----- App config (optional collection) -----
    match /config/{docId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

### Note on registration
The "only 2 accounts" check reads the `users` collection **before** the new
user is signed in. With the rule `allow read: if request.auth != null`, an
unauthenticated reader is denied — so a brand-new 3rd person could not even
reach the limit check. Because **both of your accounts already exist**, this is
not a problem in practice. If you ever need to wipe and re-register accounts,
temporarily switch the `users` read rule to `allow read: if true;`, register,
then switch it back.

---

## 📋 How to apply the rules (step by step)

1. Open **https://console.firebase.google.com/** and sign in.
2. Select the **`hiraquest0`** project.
3. In the left sidebar, click **Build → Firestore Database**.
4. Click the **Rules** tab (top of the Firestore panel).
5. Select **all** the text in the editor and delete it.
6. Paste the entire **Recommended hardened ruleset** block from above.
7. Click **Publish** (top-right). A confirmation appears within a few seconds.
8. Wait ~1 minute for rules to propagate, then hard-refresh the app
   (`Ctrl + Shift + R`) and sign in to confirm everything still loads.

If anything breaks, re-open the Rules tab, click the **clock/history icon**,
and restore the previous version — Firebase keeps every published version.

---

## 🧱 Indexes

Phase 2 needs **no composite indexes**. The recent-history query
(`game_sessions` where `playerIds` array-contains your uid) uses Firestore's
automatic single-field array index, and results are sorted in the browser.

If a future query ever needs a composite index, the browser console will print
a ready-made "Create index" link — just click it.
