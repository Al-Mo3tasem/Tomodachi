# iOS / TestFlight — checklist for the Apple Developer account holder

Tomodachi's iOS build is produced in the cloud (Codemagic, Xcode 26) and uploaded to
TestFlight. The build machine needs a few things that only the **Apple Developer
account holder** can create. Everything below is done on the Apple websites — no
Mac needed. Expected time: 30–40 minutes.

**App identity (must match exactly):**
- App name: **Tomodachi**
- Bundle ID: **`com.bytepluslife.tomodachi`** (tell us before creating it if you prefer another — it cannot be changed after the first upload)
- Primary language: Arabic · Category: Education

## 0. First, one question
Is the Apple Developer Program enrollment **Individual** or **Organization**?
- *Organization*: you can invite Moutasem with a role that lets him do steps 3–5 himself.
- *Individual*: invited users only get App Store Connect access (no certificates), so
  **you** do steps 3–5 personally. (Converting to Organization needs a D-U-N-S number — not needed now.)

## 1. Invite Moutasem to App Store Connect (5 min)
https://appstoreconnect.apple.com → **Users and Access** → **+** →
his Apple ID email → role **App Manager** (not "Developer": App Manager can create the
app record, upload builds and manage testers) → all apps → Invite.

## 2. Create the app record (5 min)
App Store Connect → **My Apps** → **+** → New App →
Platform iOS · Name **Tomodachi** · Primary language **Arabic** · Bundle ID (create it in
step 3 first, or choose it here if it already exists) · SKU `tomodachi-ios` →
Create. Under the app → **App Access** add Moutasem.

## 3. Register the Bundle ID (3 min)
https://developer.apple.com/account/resources/identifiers → **+** → App IDs → App →
Description "Tomodachi" · Bundle ID **Explicit** `com.bytepluslife.tomodachi` →
Capabilities: tick **Push Notifications** and **Associated Domains** → Register.

## 4. Distribution certificate + provisioning profile (10 min)
- **Certificates** → **+** → **Apple Distribution** → it asks for a CSR file.
  Moutasem will send you a `CertificateSigningRequest.certSigningRequest` file
  (he generates it on Windows) — upload it → Download the `.cer`.
  **Alternative that skips the CSR:** in step 5 create the API key with **Admin**
  access; the build service then creates the certificate by itself. Prefer this.
- **Profiles** → **+** → **App Store Connect** (distribution) → select the Bundle ID →
  select the certificate → name `Tomodachi App Store` → Generate → Download the
  `.mobileprovision` (only needed if you did the manual certificate).
- Apple allows at most **3** distribution certificates per account — don't create extras.

## 5. App Store Connect API key (5 min) — the important one
App Store Connect → **Users and Access** → **Integrations** → **App Store Connect API**
→ **Team Keys** → **+** → Name `Tomodachi CI` → Access **Admin** (lets the build
service create/sign; choose **App Manager** if you prefer upload-only and did step 4
manually) → Generate → **Download the `.p8` file — it can be downloaded exactly once.**
Note the **Key ID**, the **Issuer ID** (top of that page) and your **Team ID**
(developer.apple.com → Membership).

## 6. Send these to Moutasem — through a password manager share or an encrypted archive, never plain chat/email
- `AuthKey_XXXXXXXX.p8` + Key ID + Issuer ID + Team ID
- (if manual) the Distribution certificate exported as `.p12` with its password, and the `.mobileprovision`
- the Bundle ID you registered

## 7. Testers (later, 2 min each)
TestFlight **Internal** testing: App Store Connect → Users and Access → + → tester's
Apple ID with role **Developer** or **Marketing** (they only need the TestFlight app);
builds appear ~30 min after upload, no review. For a wider group we'll use an
**External** public link (first build goes through a short Apple review, usually < 48 h).

## 8. Keep in mind
- The $99/yr membership must stay active during the whole test period.
- TestFlight builds expire 90 days after upload (we re-upload).
- Push notifications later need an **APNs Auth Key** (Keys → + → Apple Push
  Notifications service) — not needed for the first builds.
