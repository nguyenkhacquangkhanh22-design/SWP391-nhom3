# Backend authentication API

## Environment

Copy `.env.example` values into `.env` and configure MongoDB Atlas, a random
`JWT_SECRET` of at least 32 characters, Google OAuth web client ID, SMTP
credentials, and the frontend URL used for password reset links. Never commit
`.env`.

Google sign-in expects an ID token from a client configured with
`GOOGLE_CLIENT_ID`; a Google API key is not used to authenticate users.

## Endpoints

All routes use the `/api/auth` prefix. Protected routes require
`Authorization: Bearer <token>`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| POST | `/register/send-otp` | No | Email a 6-digit registration verification code (`email`) |
| POST | `/register/verify-otp` | No | Verify code (`email`, `otp`) and receive one-time verification token |
| POST | `/register` | No | Create account (`name`, `email`, `password`, `verificationToken`) |
| POST | `/login` | No | Sign in (`email`, `password`) |
| POST | `/google` | No | Google sign-in (`idToken`) |
| POST | `/logout` | Yes | Revoke all active JWT sessions for this account |
| POST | `/change-password` | Yes | Change password (`currentPassword`, `newPassword`); returns a replacement token |
| POST | `/forgot-password` | No | Email a time-limited reset link (`email`) |
| POST | `/reset-password` | No | Set a new password (`email`, `token`, `newPassword`) |
| GET | `/profile` | Yes | Read the current profile |
| PATCH | `/profile` | Yes | Update the current profile (`name`) |

Passwords must contain at least 8 characters. Password reset links expire after
15 minutes and are single-use. The forgot-password endpoint returns the same
response whether or not the account exists. Logout revokes all sessions for the
account because the current JWT strategy tracks a per-user token version.

Registration requires sending an OTP, verifying the 6-digit code, then creating
the account with the returned one-time verification token. OTP codes expire
after 10 minutes, can be resent once per minute, and allow at most five
incorrect attempts. The verification token also expires after 10 minutes and
is consumed during account creation.
