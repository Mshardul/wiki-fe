# Multi-Factor Authentication

## Prerequisites

- **[Authentication](./authentication.md)** [Must read] - MFA is a hardening layer on top of primary authentication (session or token based); the hub covers where it fits in the overall flow.

---

## Table of Contents

<!-- Partial article - seeded from authentication.md. Sections to be completed. -->

- [TOTP - How It Works](#totp--how-it-works)
- [WebAuthn / Passkeys](#webauthn--passkeys)
- [SMS OTP - Why It's Weak](#sms-otp--why-its-weak)
- [Step-Up Authentication](#step-up-authentication)

---

## TLDR

<!-- To be written when this article is fully developed. -->

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

## Step-Up Authentication

Step-up is a pattern where an existing authenticated session must re-verify with a stronger factor before accessing a sensitive resource - without requiring a full logout and re-login.

**When to use:** The user's base session (authenticated with password) is sufficient for reading data. A higher-assurance action (wire transfer, admin operation, account deletion) requires step-up.

### Implementation

OIDC defines `acr_values` (Authentication Context Class Reference) and `amr` (Authentication Methods References) to express authentication strength:

```
acr_values: basic   ← password only
acr_values: mfa     ← MFA required
```

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

> 🎯 **Interview Lens**
> **Q:** How would you design MFA for a banking application?
> **Ideal answer:** Baseline authentication with password + TOTP or WebAuthn for all logins. Step-up authentication for high-value actions (transfers, beneficiary changes) requiring re-verification of the second factor, with a short step-up token TTL (5 min). WebAuthn preferred over TOTP for phishing resistance. SMS OTP only as a fallback with explicit risk acceptance. Backup codes for account recovery, stored hashed. Enforce `acr` claims at the resource server, not just at the client.
> **Common trap:** "Add MFA to the login form and you're done." Misses step-up auth for sensitive operations - an attacker who hijacks a session after the MFA checkpoint can still perform high-value actions.
> **Next question:** "How do you handle a user who loses their second factor device?" → Pre-issued backup codes (primary recovery). Secondary: identity verification via customer support with out-of-band verification (photo ID, account history questions). Do not allow email-only recovery - email account compromise would bypass MFA entirely.

**Key Takeaway:** TOTP is the practical default; WebAuthn/Passkeys are the correct long-term answer for phishing resistance. SMS OTP is a fallback with known weaknesses - acceptable as an option, not as a primary MFA method. Step-up authentication is the pattern that extends MFA coverage beyond login to sensitive in-session operations.
