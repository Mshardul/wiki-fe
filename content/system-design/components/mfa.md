# Multi-Factor Authentication

## Prerequisites

- **[Authentication](./authentication.md)** [Must read] - MFA is a hardening layer on top of primary authentication (session or token based); the hub covers where it fits in the overall flow.
- **[OAuth 2.0 & OIDC](./oauth-oidc.md)** [Should read] - Step-up authentication expresses factor strength via OIDC's `acr`/`amr` claims; this page assumes the ID token and claim-validation mechanics covered there.

---

## Table of Contents

- [TOTP - How It Works](#totp--how-it-works)
- [WebAuthn / Passkeys](#webauthn--passkeys)
- [SMS OTP - Why It's Weak](#sms-otp--why-its-weak)
- [Push Notification MFA - Convenience vs Prompt Bombing](#push-notification-mfa--convenience-vs-prompt-bombing)
- [Quick Decision Guide](#quick-decision-guide)
- [Step-Up Authentication](#step-up-authentication)
- [Production Failure Modes & Gotchas](#production-failure-modes--gotchas)
- [Interview Scenario Bank](#interview-scenario-bank)

---

## TLDR

MFA hardens login by requiring a second factor from a distinct category - something you have or are, on top of something you know - so a leaked password alone isn't enough to take over an account. The real design decision isn't whether to add MFA, it's which factor: TOTP is the practical default, WebAuthn/passkeys are the only phishing-resistant option because the credential is cryptographically bound to the origin, and SMS/push each carry a distinct real-world attack (SIM swap; prompt bombing) that a senior candidate must name unprompted. Step-up authentication extends that same factor check beyond login to sensitive in-session actions.

---

## TOTP - How It Works

_A 6-digit code derived from a shared secret and the current 30-second time window - no network required at verification time._

TOTP (Time-based One-Time Password, RFC 6238) generates a 6-digit code that changes every 30 seconds, derived from a shared secret and the current time.

### Mechanics

TOTP is built on HOTP (HMAC-based OTP, RFC 4226):

```
HOTP(secret, counter) = truncate(HMAC-SHA1(secret, counter))
TOTP(secret, time)    = HOTP(secret, floor(unix_timestamp / 30))
```

The counter in TOTP is the number of 30-second windows elapsed since Unix epoch. Both the authenticator app and the server independently compute the same value - no communication required at verification time.

**Enrollment:**

1. Server generates a random 160-bit secret
2. Secret is encoded as a QR code (`otpauth://totp/...?secret=BASE32...`)
3. User scans with authenticator app (Google Authenticator, Authy) - app stores the secret
4. Server also stores the secret, tied to the user's account

**Verification:** The server independently computes TOTP for the current time window and compares against the user-submitted code. It checks ±1 adjacent windows to tolerate clock skew between the authenticator app and server - a 90-second effective acceptance window. Wider windows increase the attack surface.

### Threat Model

TOTP provides "what you have" (the device with the secret). It does not protect against:

- **Real-time phishing:** attacker presents a fake login page, relays credentials and TOTP code to the real site within the 30-second window. The code is valid - TOTP is not phishing-resistant.
- **Device theft:** if the phone is unlocked and unencrypted, the attacker has the second factor.
- **Secret exfiltration:** if the server's stored TOTP secrets are leaked, all users' second factors are compromised. Secrets must be encrypted at rest.

**Backup codes:** Generate 8–10 single-use backup codes at enrollment. Store hashed (bcrypt). If the user loses their device, backup codes are the only recovery path without an account reset flow.

### Phishing Relay

The real-time phishing case above is worth naming as its own failure mode, not just a bullet: a transparent reverse proxy (an adversary-in-the-middle kit) sits between the victim and the real site, forwarding the password and the TOTP code the instant the victim types them. Because the proxy relays to the real server within the 30-second validity window, the code it submits is genuinely valid - there's no cryptographic defect to exploit, just a timing window the code can't prove which origin captured it. This is the structural reason TOTP is described as "not phishing-resistant" rather than "weak": the shared secret authenticates the code, not the channel it traveled over. The only fix that closes this gap is origin binding (see [WebAuthn § Why It's Phishing-Resistant](#why-its-phishing-resistant)) - rate limiting or shorter windows reduce the attack surface but don't remove it.

---

## WebAuthn / Passkeys

_Public key cryptography bound to the origin domain - the private key never leaves the device and cannot be used on a phishing site._

WebAuthn (Web Authentication, W3C spec) uses asymmetric key cryptography. The private key never leaves the authenticator device. The server stores only the public key.

### Registration

```
1. Server generates a random challenge and sends it with relying party info:
   { challenge: "abc...", rp: { id: "example.com", name: "Example" }, ... }

2. Authenticator (hardware key, platform authenticator) generates a key pair:
   private_key  → stored securely on device (hardware-bound, not exportable)
   public_key   → sent to server along with credential ID and attestation

3. Server stores: { credential_id, public_key, user_id, rp_id: "example.com" }
```

### Authentication

```
1. Server sends a fresh challenge

2. Authenticator signs the challenge + client data with the private key:
   signature = sign(private_key, challenge + client_data_hash)

3. Server verifies:
   verify(public_key, signature, challenge + client_data_hash)
   → if valid: authentication succeeds
```

Nothing sensitive is transmitted. The credential never leaves the device. The server never sees the private key.

### Why It's Phishing-Resistant

The credential is **origin-bound**. The `rp_id` (relying party ID) is the domain the credential was registered for. The authenticator refuses to sign a challenge if the current origin doesn't match the registered `rp_id`.

A phishing site at `examp1e.com` cannot request a signature from a credential registered for `example.com` - the authenticator rejects it. This is a hardware-enforced property, not a software check that can be bypassed.

### Passkeys

Passkeys are synced WebAuthn credentials - the private key is protected by the platform (iCloud Keychain, Google Password Manager) and synchronized across the user's devices. The UX is the same as hardware-bound WebAuthn (biometric prompt), but credentials survive device loss.

The security trade-off: synced credentials are only as secure as the platform account protecting the sync (iCloud password + Apple ID MFA). Hardware-bound keys (FIDO2 security keys like YubiKey) are more secure but require physical possession.

|                       | TOTP               | WebAuthn (hardware)     | Passkeys                       |
| ---------------------- | ------------------- | -------------------------- | --------------------------------- |
| Phishing-resistant    | No                  | Yes                        | Yes                                |
| Device loss recovery  | Backup codes        | Replace key, re-enroll     | Restore from platform backup      |
| Server-side secret    | Yes (TOTP secret)   | No                         | No                                 |
| Sync across devices   | App-dependent       | No                         | Yes                                |
| UX friction           | Code entry          | Tap key / biometric        | Biometric                          |

---

## SMS OTP - Why It's Weak

SMS delivers a one-time code to the user's phone number. It is widely deployed but has fundamental weaknesses at the protocol layer.

**SS7 vulnerability:** The telecom signaling protocol (Signaling System 7, designed in 1975) has no authentication between carriers. An attacker with access to the SS7 network - achievable through a rogue carrier or a compromised telco employee - can intercept SMS messages destined for any number globally.

**SIM swap:** The attacker contacts the carrier, social-engineers or bribes a customer service representative, and transfers the victim's number to a SIM the attacker controls. All subsequent SMS messages (including OTPs) go to the attacker. This attack has been used in high-profile account takeovers of cryptocurrency exchanges and email accounts.

**Real-time relay:** Same phishing weakness as TOTP - an attacker can relay the SMS code to the real site within the validity window.

**Malware interception:** Android apps with `READ_SMS` permission can silently read OTP messages.

NIST SP 800-63B classifies SMS OTP as a "restricted authenticator" - permissible but not recommended. Agencies using it must assess the risk, notify users, and offer alternatives.

SMS OTP is still significantly better than password-only authentication. The guidance is not "never use SMS OTP" but "do not use it as the only MFA option, and prefer TOTP or WebAuthn when possible."

---

## Push Notification MFA - Convenience vs Prompt Bombing

_A tap-to-approve notification on a trusted device - fast for the user, but the same simplicity is what makes it attackable through the human, not the crypto._

Push MFA sends an approve/deny prompt to a previously-enrolled device (Duo, Okta Verify, Microsoft Authenticator) instead of asking the user to type a code. The server holds a pending auth request; the app polls or receives a push notification, the user taps Approve, and the app signs the response with a device-bound key.

### Mechanics

```
1. User submits password → server creates a pending auth challenge
2. Push notification sent to enrolled device: "Approve sign-in to example.com?"
3. User taps Approve/Deny on device
4. Device signs the response with its enrollment key → server verifies signature
5. Server completes login
```

Unlike TOTP, there's no code to transcribe and no timing window to race - the UX is a single tap. That same removal of friction is the attack surface: approval requires no proof the user is the one who *initiated* the request, only that they tapped Approve on *a* request.

### MFA Fatigue / Prompt Bombing

**Prompt bombing** (MFA fatigue attack): the attacker already has valid credentials (phished or leaked) and repeatedly triggers login attempts, firing a push approval prompt to the victim's device every time. The attack doesn't break the cryptography at all - it targets human patience. Sent once at 2am, or a dozen times back-to-back during a workday, the goal is the same: get the user to tap Approve out of habit, annoyance, or the mistaken belief it will make the notifications stop.

This is not a hypothetical - it's the confirmed initial-access vector in several high-profile breaches (Uber 2022, Cisco 2022), where attackers combined stolen credentials with repeated push prompts, in some cases pairing the flood with a direct social-engineering message ("this is IT, approve the request to fix your account") over chat or a phone call.

> ⚠️ **Warning / Gotcha**
> Push MFA with a bare Approve/Deny button is not equivalent in security value to TOTP or WebAuthn even though it's also "something you have" - it adds a *social-engineering* attack surface that code-entry MFA doesn't have in the same way, because approval requires zero knowledge of *why* the prompt fired.

**Mitigations, in order of effectiveness:**

- **Number matching** - the login page displays a number, the user must enter that same number on the push prompt to approve. This forces the approver to be looking at the same screen that initiated the request, closing the "tap without looking" failure mode. Now the default in Microsoft Authenticator and Duo.
- **Rich context in the prompt** - show requesting IP, approximate location, and device/browser on the push notification itself, so an out-of-pattern request (unfamiliar country, unfamiliar device) is visibly suspicious before the user taps anything.
- **Rate limiting / throttling push attempts** - cap how many push challenges can be sent to one user within a window and lock further pushes (falling back to a slower recovery flow) past a threshold, rather than letting an attacker fire unlimited prompts.
- **Anomaly-triggered step-up** - treat a burst of denied or ignored push prompts as a signal itself: alert security, or require a stronger factor (WebAuthn, not another push) for the next attempt.

Prompt bombing is a frequent interview opener for this component - see [Interview Scenario Bank](#interview-scenario-bank) for how a strong candidate walks through the breach scenario and its follow-ups.

---

## Quick Decision Guide

Placed after the mechanics above - the right factor depends on the threat model and the friction budget, not "which is most secure in the abstract."

| Situation | Reach for |
| --- | --- |
| Default MFA for a consumer or B2B app, broad device support | TOTP - universal authenticator app support, no telecom dependency |
| High-value accounts (admin, finance, infra) or any phishing-conscious org | WebAuthn / Passkeys - the only phishing-resistant option, origin-bound |
| Large workforce needing fast, low-friction daily login | Push with number matching - faster than typing a code, but only safe with number matching + rate limiting enabled |
| Users without a smartphone or in regions with unreliable data connectivity | SMS OTP as a fallback only, never the sole factor |
| Sensitive in-session action after a low-assurance login | Step-up authentication (below), not a stronger *default* factor for every request |

**Do not offer push MFA with bare approve/deny and no number matching** - it is the weakest "something you have" option against a motivated attacker who already has the password, weaker in practice than TOTP despite feeling more modern. If a vendor's push implementation lacks number matching, either configure it or don't rely on push as the only option.

**Where $ differentiates the choice:** WebAuthn hardware keys (YubiKey) cost per-device and require a distribution/replacement process for a workforce; TOTP and passkeys have no incremental hardware cost. For a large workforce, the calculus is usually TOTP or passkeys as the default with hardware keys reserved for the highest-privilege accounts, rather than universal hardware key rollout.

---

## Step-Up Authentication

Step-up is a pattern where an existing authenticated session must re-verify with a stronger factor before accessing a sensitive resource - without requiring a full logout and re-login.

**When to use:** The user's base session (authenticated with password) is sufficient for reading data. A higher-assurance action (wire transfer, admin operation, account deletion) requires step-up.

### Implementation

Step-up needs a way to carry "how strongly was this user authenticated" on the token itself, so the resource server can compare what it has against what the action requires. OIDC's `acr` (Authentication Context Class Reference) and `amr` (Authentication Methods References) claims are the standard vehicle for that signal - see [OAuth 2.0 & OIDC](./oauth-oidc.md) for how ID tokens are structured, issued, and validated in general; here the concern is narrower: using `acr`/`amr` to signal freshness and factor-strength to the relying party, not the claim mechanics themselves.

The MFA-specific read: `acr` is the level the AS is asserting ("basic" = password only, "mfa" = a second factor was checked), and `amr` is which methods actually contributed to that level (`pwd`, `otp`, `webauthn`). A resource server enforcing step-up compares its required `acr` against the token's `acr` - not against `amr` directly - because `acr` is the AS's considered judgment of strength, while `amr` is just the raw list of methods used to get there.

```
1. User is authenticated with password (acr: basic)
   Token contains: { "acr": "basic", "amr": ["pwd"] }

2. User attempts a sensitive action (POST /transfer)

3. Resource server checks: required_acr=mfa, token_acr=basic → insufficient
   Returns 403 with step-up challenge:
   { "error": "insufficient_user_authentication",
     "acr_values": "mfa" }

4. Client redirects to AS with:
   GET /authorize?...&acr_values=mfa&prompt=login

5. AS prompts for second factor (TOTP / WebAuthn)
   Issues new token: { "acr": "mfa", "amr": ["pwd", "otp"] }

6. Client retries the sensitive action with the new token → accepted
```

### Time-Bounding Step-Up

Step-up tokens for sensitive operations should carry a tighter `exp` than the base access token. A gold-level token valid for 15 minutes that was issued 14 minutes ago should not be accepted for a new sensitive action - the AS can embed an `auth_time` claim (time of the last authentication event) and the resource server can check how recent it was.

---

## Production Failure Modes & Gotchas

MFA's failure modes aren't primarily about uptime - they're about the system's behavior on the edges: enrollment, recovery, and the second factor itself becoming unavailable or actively targeted.

- **Second-factor unavailability is a designed-for case, not an edge case.** A user's phone dies, is lost, or has no signal - the system needs a recovery path that doesn't quietly become a bypass. Pre-issued, single-use backup codes (see [TOTP § Backup codes](#totp--how-it-works)) are the standard answer; the failure mode is treating account-recovery support as an unauthenticated backdoor (see below).
- **Prompt bombing is an availability-of-judgment failure, not a system outage** - see [MFA Fatigue / Prompt Bombing](#mfa-fatigue--prompt-bombing) above. The system stays "up" the whole time; what fails is the assumption that a human will always make the correct security decision under repeated interruption. Rate limiting and number matching are the resilience controls here, functionally identical in spirit to backoff/circuit-breaking for any other repeated-request abuse pattern.
- **Phishing relay defeats code-based factors without breaking any crypto** - see [TOTP § Phishing Relay](#phishing-relay) above. The same relay pattern applies to SMS OTP.
- **Enrollment-time compromise cascades.** If an attacker enrolls their own device as a second factor (during an account-recovery window, or via a support agent who skips verification), MFA now protects the attacker's session, not the legitimate user's. Enrollment must itself require step-up-equivalent proof of identity, not just an authenticated session.
- **Account-recovery flow as the weakest link.** Every MFA scheme eventually needs a "I lost my factor" path, and that path is frequently the actual point of compromise - if recovery only requires email access or a support call with weak identity verification, the strong factor upstream (WebAuthn, TOTP) is decorative. The recovery flow's assurance level should not be weaker than the factor it's meant to replace.
- **Rate limit the verification endpoint itself**, not just enrollment - both to stop brute-forcing a 6-digit TOTP code (10<sup>6</sup> space is small enough to matter without throttling) and to blunt push-prompt flooding.

This feeds into the same class of failure as any auth boundary: a strong primitive (WebAuthn's origin binding, TOTP's shared secret) is only as strong as the weakest path around it - recovery, enrollment, or human patience under repeated prompts.

### Common Misconceptions

- **"MFA at login means the session is fully protected."** No - MFA raises the assurance bar of the login event, not every action taken afterward. A session hijacked or left open after login bypasses MFA entirely for anything that doesn't explicitly require step-up (see [Step-Up Authentication](#step-up-authentication)).
- **"Push MFA is strictly better than TOTP because it's more convenient."** Convenience and attack-resistance are different axes. A bare approve/deny push is weaker against a motivated attacker with valid credentials than TOTP, because it trades a code the user must actively transcribe for a single tap that requires no knowledge of *why* the prompt fired - see [MFA Fatigue / Prompt Bombing](#mfa-fatigue--prompt-bombing).
- **"Any second factor makes an account phishing-proof."** Only origin-bound factors (WebAuthn/passkeys) are. TOTP, SMS, and push all depend on the human (or the transport) not being fooled - they raise the cost of an attack, they don't structurally prevent it.

---

## Interview Scenario Bank

> 🗣️ **Opening framing:** "Before picking a factor, I'd ask what we're actually defending against - credential stuffing, targeted phishing, or SIM-based attacks all point to different answers. Assuming this is a general consumer login, I'd default to TOTP with WebAuthn as an upgrade path for high-value accounts, and treat step-up as a separate decision from the login factor itself."

> 🎯 **Interview Lens**
> **Q:** A company using push-based MFA gets breached even though every employee has MFA enabled. How?
> **Ideal answer:** Prompt bombing - the attacker already has valid credentials and repeatedly fires push challenges until an employee approves one out of fatigue or confusion, sometimes paired with a social-engineering call posing as IT. The fix isn't removing push MFA, it's number matching (forces the approver to be looking at the same screen as the login attempt) plus rate-limiting repeated challenges and treating a burst of denials as an anomaly signal worth alerting on.
> **Common trap:** Treating push MFA as strictly better than TOTP because it's "more convenient" - convenience and phishing/social-engineering resistance are different axes. Only WebAuthn is origin-bound; push and TOTP both depend on the human not making a mistake, just different kinds of mistake.
> **Next question:** "Your number-matching rollout is complete - is prompt bombing solved?" → No, it raises the bar but doesn't remove the human in the loop; a sufficiently convincing concurrent phone call ("read me the number you see") still defeats it. Number matching stops the zero-effort tap, not a targeted social-engineering attempt.

> 🎯 **Interview Lens**
> **Q:** How would you design MFA for a banking application?
> **Ideal answer:** Baseline authentication with password + TOTP or WebAuthn for all logins. Step-up authentication for high-value actions (transfers, beneficiary changes) requiring re-verification of the second factor, with a short step-up token TTL (5 min). WebAuthn preferred over TOTP for phishing resistance. SMS OTP only as a fallback with explicit risk acceptance. Backup codes for account recovery, stored hashed. Enforce `acr` claims at the resource server, not just at the client.
> **Common trap:** "Add MFA to the login form and you're done." Misses step-up auth for sensitive operations - an attacker who hijacks a session after the MFA checkpoint can still perform high-value actions.
> **Next question:** "How do you handle a user who loses their second factor device?" → Pre-issued backup codes (primary recovery). Secondary: identity verification via customer support with out-of-band verification (photo ID, account history questions).
> **Next question:** "Support agents keep getting social-engineered into re-enrolling attacker devices during recovery calls - what's the structural fix?" → Recovery must require proof of identity at least as strong as the factor it replaces (e.g. a prior-verified out-of-band channel or existing passkey re-auth), not agent judgment alone; treat the recovery flow itself as a step-up-gated operation, not a support-desk convenience.

> 🎯 **Interview Lens**
> **Q:** A user reports their account was taken over even though they had TOTP enabled and never gave anyone their code. What's your first hypothesis?
> **Ideal answer:** Real-time credential relay - an adversary-in-the-middle proxy captured the password and the code as the user typed them into a convincing fake login page, then replayed both to the real site inside the validity window. Confirm by checking login metadata (IP/device mismatch from the user's usual pattern) and treat it as evidence the org needs an origin-bound factor, not a "the user must have leaked it" assumption.
> **Common trap:** Assuming a valid TOTP code proves the legitimate user was present. The code's validity only proves possession of the secret at that moment - it says nothing about which origin captured the input.
> **Next question:** "The user also had SMS OTP as a fallback - does removing SMS close this gap?" → No, SMS is vulnerable to the identical relay technique (and additionally to SIM swap); the gap only closes by moving the account to an origin-bound factor like WebAuthn/passkeys.

> 🎯 **Interview Lens**
> **Q:** Your org wants to roll out hardware security keys to every employee for cost and phishing-resistance reasons. What pushback would you give?
> **Ideal answer:** Hardware keys are the strongest option but carry real per-device cost and an operational burden (distribution, loss/replacement, support for a lost-key employee who's now locked out). For most orgs the better rollout is passkeys as the default (no hardware cost, still origin-bound) with hardware keys reserved for the highest-privilege accounts (admins, infra, finance) where the extra assurance and physical-possession requirement justify the cost.
> **Common trap:** Treating "most secure" and "right default" as the same decision - the correct choice is the strongest option the org can actually operate at its required scale, not the theoretical ceiling.
> **Next question:** "A remote employee loses their only enrolled hardware key while traveling - what's the immediate and long-term fix?" → Immediate: a pre-verified backup factor or admin-assisted re-enrollment gated by strong identity proof, never a bare support-ticket override. Long-term: require at least two enrolled factors per high-privilege account so losing one doesn't lock the user out or force a weak recovery path.

**Key Takeaway:** TOTP is the practical default; WebAuthn/Passkeys are the correct long-term answer for phishing resistance. SMS OTP is a fallback with known weaknesses - acceptable as an option, not as a primary MFA method. Step-up authentication is the pattern that extends MFA coverage beyond login to sensitive in-session operations.
