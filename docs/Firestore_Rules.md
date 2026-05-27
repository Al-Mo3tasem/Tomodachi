# 🔒 Tomodachi — Firestore Security Rules

This file holds the **current recommended** Firestore security rules and the
exact instructions for applying them. Keep it in sync with any rule change.

---

## ⚠️ Important context (read first)

As of **Phase R2.05** the project runs on a three-environment topology
(`tomodachi-dev`, `tomodachi-staging`, `tomodachi-prod`) plus the legacy
`hiraquest0` project that still receives production traffic until the
R2.11 cutover lands.

The ruleset in this document applies **identically** to the three new
projects (`tomodachi-dev`, `tomodachi-staging`, `tomodachi-prod`) per
`PROJECT_RULES.md` §15.3. The `hiraquest0` project stays on its existing
broad catch-all rule (`allow read, write: if request.auth != null;`) —
see the [hiraquest0 carve-out](#-hiraquest0-carve-out) section below for
why.

### How R2.05 solved the pre-existing signup bug

The previous hardened ruleset (documented here pre-R2.05) gated `users`
collection reads behind `request.auth != null`. That broke the signup
flow, which needed to query `users` *before* the user was authenticated
— both to enforce a uniqueness check and the (now-retired) maxUsers cap.

R2.05 took two changes to fix this without weakening the rules:

1. **New `usernames/` collection** — document ID is the lowercase
   username. Existence of the doc IS the uniqueness lock. The `allow
   create` rule fires only when the doc doesn't exist (create
   semantics), so two simultaneous claims for the same name never both
   succeed. See `Tomodachi_Master_Plan.md` §4.8.
2. **The maxUsers client-side cap was retired.** The L1 Cloud Function
   registration gateway will own rate limiting going forward. No
   client-side counter; no pre-auth users-read for cap enforcement.

The signup flow now: `createUserWithEmailAndPassword` → `setDoc` on
`usernames/{lower}` (the atomic lock) → user + stats writes. See the
R2.05 signup-flow refactor in `js/app.js` `handleRegister`.

The `saveProfileSettings` path (username CHANGES via the Settings
screen) still uses a query against `users` for uniqueness and is
race-vulnerable. Tracked as L1.19 in `Phases_and_Tasks.md` for cleanup.

---

## ✅ R2.05 ruleset (3-env: dev / staging / prod)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ----- Usernames -----
    // Source of truth for username uniqueness. Doc id IS the lowercase
    // username; the doc's `uid` field links it to the owning user.
    // Reads are public — usernames already appear in leaderboards and
    // expose nothing private. Creates are the atomicity gate: the rule
    // fires only when the doc doesn't already exist (create semantics),
    // so two simultaneous signups for the same username can never both
    // win. Updates are blocked — usernames are immutable once reserved.
    // Username CHANGES happen as delete-old + create-new.
    match /usernames/{username} {
      allow read: if true;
      allow create: if request.auth != null
                    && request.auth.uid == request.resource.data.uid
                    && request.resource.data.keys().hasOnly(['uid', 'createdAt']);
      allow delete: if request.auth != null
                    && request.auth.uid == resource.data.uid;
      // No update rule = updates denied.
    }

    // ----- Users -----
    // Both players can read each other (friend card). You can only
    // create / change / delete your own user document.
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create, update, delete: if request.auth != null
                                     && request.auth.uid == userId;
    }

    // ----- Stats -----
    match /stats/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // ----- Presence -----
    match /presence/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // ----- Game sessions -----
    // Any signed-in user can read and create a session.
    // Updates: a participant, OR the invited guest accepting a duel
    // (the guest is not in playerIds until they join).
    // Deletes: participants only (powers "Reset My Progress").
    match /game_sessions/{sessionId} {
      allow read, create: if request.auth != null;
      allow update: if request.auth != null && (
                      request.auth.uid in resource.data.playerIds ||
                      request.auth.uid == resource.data.guestId
                    );
      allow delete: if request.auth != null
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

    // ----- App config (collection currently empty post-R2.05) -----
    match /config/{docId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

---

## 🪪 `hiraquest0` carve-out

`hiraquest0` is the legacy project that holds live production data
until the R2.11 cutover migrates everything to `tomodachi-prod`. R2.13
then decommissions `hiraquest0` entirely (project deletion).

**The R2.05 ruleset is NOT applied to `hiraquest0`.** That project stays
on its existing broad catch-all rule:

```
match /{document=**} {
  allow read, write: if request.auth != null;
}
```

**Why:** applying new rules to a project being phased out in 2–4 weeks
adds risk (we could break the live signup flow during a paste-publish
mistake) for zero reward (the rules disappear with the project at R2.13).
The `PROJECT_RULES.md` §15.3 "apply equivalent rules across envs" intent
is about the active triumvirate (`-dev` / `-staging` / `-prod`), not the
legacy project being retired.

**One exception:** the R2.05 `usernames/` collection backfill (existing
`users/` docs on `hiraquest0` getting matching `usernames/{lower}` docs)
writes TO `hiraquest0` via manual Firestore Console clicks. No rule
change required — the catch-all permits authenticated writes universally.
R2.09 then imports the backfilled collection into `tomodachi-prod`.

**Decommission trigger:** R2.13 deletes the `hiraquest0` project. This
carve-out section can be removed from the doc at that point.

---

## 📋 Application sequence (R2.05)

Apply the ruleset to **each of the three new projects in sequence**:

1. `tomodachi-dev` first (lowest blast radius — only test data).
2. `tomodachi-staging` next.
3. `tomodachi-prod` last.

For **each** project, do these 8 steps:

1. Open https://console.firebase.google.com and click the project tile
   (the project switcher in the top-left also works).
2. Left sidebar → **Build → Firestore Database**.
3. Top tab bar → **Rules**.
4. Click into the editor area, select all (`Ctrl+A`), delete.
5. Paste the entire ruleset block from the [R2.05 ruleset](#-r205-ruleset-3-env-dev--staging--prod)
   section above (from `rules_version = '2';` through the final closing `}`).
6. **Test in the Rules Playground BEFORE publishing:**
   - Click the **Rules Playground** tab (next to Rules).
   - **Simulation 1** — public read of a username doc:
     - Type: `get`, Path: `/usernames/alice`, Authenticated: **off**.
     - Expected: **Allow** (usernames are public).
   - **Simulation 2** — claim a username for yourself:
     - Type: `create`, Path: `/usernames/alice`, Authenticated: **on**,
       Firebase UID: `alice`, Build a custom resource with:
       `{ "uid": "alice", "createdAt": "<any timestamp>" }`.
     - Expected: **Allow**.
   - **Simulation 3** — try to claim someone else's username:
     - Type: `create`, Path: `/usernames/alice`, Authenticated: **on**,
       Firebase UID: `bob`, Build a custom resource with:
       `{ "uid": "bob", "createdAt": "<any timestamp>" }`.
     - Expected: **Deny** (uid mismatch — auth.uid must equal data.uid).
   - **Simulation 4** — users collection stays private:
     - Type: `get`, Path: `/users/alice`, Authenticated: **off**.
     - Expected: **Deny**.
   - **Simulation 5** — authed user can read other users:
     - Type: `get`, Path: `/users/alice`, Authenticated: **on**, UID: `bob`.
     - Expected: **Allow** (friend card needs cross-read).
7. Click **Publish** (top-right). Wait for the green "Rules published"
   confirmation (usually <5 seconds).
8. Hard-refresh the app (`Ctrl + Shift + R`) and sign in once to confirm
   Firestore reads still work (presence + dashboard load).
   - For `tomodachi-dev`: the app loads via `localhost`; the selector
     routes to dev. Verify signup creates `usernames/{lower}` +
     `users/{uid}` + `stats/{uid}`.
   - For `tomodachi-staging`: the app loads via the Cloudflare Pages URL
     (set up in R2.06). Verify by signing up a different test account.
   - For `tomodachi-prod`: NOT yet routed (R2.11 cutover comes later).
     Verification on prod is via the Rules Playground sims above only;
     real-traffic verification happens after R2.11.

### Rollback

If anything looks wrong after publishing:
1. Firestore Database → Rules tab → click the **clock/history icon**
   (top-right of the editor).
2. Find the previous version (just before today's publish).
3. Click **Restore**.
4. Click **Publish**. The previous ruleset is live again within seconds.

Firebase keeps every published version indefinitely — rollback is risk-free.

---

## 🧱 Indexes

The R2.05 ruleset needs **no composite indexes**. The recent-history
query (`game_sessions` where `playerIds` array-contains your uid) uses
Firestore's automatic single-field array index, and results are sorted
in the browser.

If a future query ever needs a composite index, the browser console will
print a ready-made "Create index" link — just click it.
