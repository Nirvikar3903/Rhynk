# Rhynk Authentication API Integration Guide

This document provides a comprehensive API reference, payload details, success response structures, and critical frontend handling tips for the authentication module of Rhynk.

---

## Global Headers
All HTTP requests to the auth endpoints must include the following header:
```http
Content-Type: application/json
```

**Base URL**: `http://localhost:4000/api/v1` (or the configured staging/production backend URL).

---

## Endpoints Reference

### 1. User Registration (`POST /auth/register`)
Initiates email registration. If the email has been registered previously but is still unverified, this request automatically resends a new verification OTP.

* **Payload**:
  ```json
  {
    "username": "john_doe",
    "email": "john@example.com",
    "password": "supersecurepassword"
  }
  ```
* **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "Registration OTP sent successfully",
    "data": {
      "email": "john@example.com",
      "userId": "d7b12345-6789-1011-1213-141516171819",
      "isVerified": false
    }
  }
  ```
* **Errors to Handle**:
  * `409 Conflict` (`EMAIL_TAKEN`): The email address is already verified and taken.
  * `429 Too Many Requests` (`OTP_COOLDOWN`): Re-triggering sign up within the 30-second cooldown window.

---

### 2. Verify Registration OTP (`POST /auth/verify-otp`)
Verifies the registration OTP. Upon successful verification, logs the user in and returns the access/refresh token pair.

* **Payload**:
  ```json
  {
    "email": "john@example.com",
    "otp": "123456",
    "deviceId": "unique-device-uuid-123",
    "deviceType": "WEB"
  }
  ```
  * *Note: `deviceType` must be one of `WEB`, `IOS`, or `ANDROID`.*
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "OTP verified successfully",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "d7b12345-6789-1011-1213-141516171819",
        "username": "john_doe",
        "email": "john@example.com",
        "isVerified": true
      }
    }
  }
  ```
  * *Action: Save the `accessToken` in memory/state and store the `refreshToken` in secure storage.*
* **Errors to Handle**:
  * `400 Bad Request` (`OTP_INVALID`): The OTP is invalid or has expired (OTP validity is 3 minutes).

---

### 3. Log In (`POST /auth/login`)
Logs the user in with credentials. If the user's email is unverified, the login attempt triggers a new verification OTP and returns an error redirect signal.

* **Payload**:
  ```json
  {
    "email": "john@example.com",
    "password": "supersecurepassword",
    "deviceId": "unique-device-uuid-123",
    "deviceType": "WEB"
  }
  ```
* **Success Response (`200 OK`)**:
  * Same payload format as `POST /auth/verify-otp` (returns `accessToken`, `refreshToken`, and the `user` object).
* **Errors to Handle**:
  * `401 Unauthorized` (`INVALID_CREDENTIALS`): Incorrect email or password.
  * `403 Forbidden` (`EMAIL_NOT_VERIFIED`): User is registered but not verified. 
    * **Crucial Action**: If the frontend receives this error, **a new registration verification OTP has been triggered and sent automatically by the backend**. The frontend must redirect the user to the OTP verification screen immediately.

---

### 4. Resend Verification OTP (`POST /auth/resend-otp`)
Manually requests a new registration OTP code, subject to a cooldown timer.

* **Payload**:
  ```json
  {
    "email": "john@example.com"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "OTP resent successfully",
    "data": {
      "success": true
    }
  }
  ```
* **Errors to Handle**:
  * `429 Too Many Requests` (`OTP_COOLDOWN`): Triggered if requested within the 30-second cooldown period.
  * `404 Not Found` (`USER_NOT_FOUND`): No account exists with this email.

---

### 5. Silent Token Refresh (`POST /auth/refresh`)
Exchanges a valid refresh token for a brand new pair of access and refresh tokens.

* **Payload**:
  ```json
  {
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "deviceId": "unique-device-uuid-123"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Tokens refreshed successfully",
    "data": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```
* **Errors to Handle**:
  * `409 Conflict` (`REFRESH_LOCKED`): Concurrency lock active (another token refresh call from this client is already in progress). Frontend must wait 1 second and retry.
  * `401 Unauthorized` (`REFRESH_INVALID` / `SESSION_REVOKED`): The token is invalid/expired, or reuse was detected. Frontend must immediately clear local credentials and log the user out.

---

### 6. Log Out (`POST /auth/logout`)
Revokes a user session for a specific device, invalidating the refresh token.

* **Headers**:
  ```http
  Authorization: Bearer <accessToken>
  ```
* **Payload**:
  ```json
  {
    "deviceId": "unique-device-uuid-123"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Logged out successfully",
    "data": {
      "success": true
    }
  }
  ```
* **Errors to Handle**:
  * `401 Unauthorized`: Token is expired. Frontend should ignore this error, wipe local credentials, and redirect to the login page anyway.

---

### 7. Forgot Password - Request OTP (`POST /auth/forgot-password/request`)
Requests a password reset OTP by verifying email and username.

* **Payload**:
  ```json
  {
    "username": "john_doe",
    "email": "john@example.com"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Password reset OTP sent successfully",
    "data": {
      "email": "john@example.com"
    }
  }
  ```
* **Errors to Handle**:
  * `401 Unauthorized` (`INVALID_CREDENTIALS`): The username and email do not match.
  * `403 Forbidden` (`EMAIL_NOT_VERIFIED`): The account is not verified yet.
  * `429 Too Many Requests` (`OTP_COOLDOWN`): A cooldown limit of 30 seconds is active.

---

### 8. Forgot Password - Verify OTP (`POST /auth/forgot-password/verify`)
Verifies the reset OTP. Returns a secure temporary `resetToken` on success.

* **Payload**:
  ```json
  {
    "email": "john@example.com",
    "otp": "123456"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "OTP verified successfully",
    "data": {
      "resetToken": "a4d3f234b5c6d7e8f90a1b2c3d4e5f6g"
    }
  }
  ```
  * *Action: Save the `resetToken` in state to use in the password update step.*
* **Errors to Handle**:
  * `400 Bad Request` (`OTP_INVALID`): OTP is wrong or expired (valid for 5 minutes).

---

### 9. Forgot Password - Reset Password (`POST /auth/forgot-password/reset`)
Resets the user's password using the temporary `resetToken`.

* **Payload**:
  ```json
  {
    "email": "john@example.com",
    "resetToken": "a4d3f234b5c6d7e8f90a1b2c3d4e5f6g",
    "newPassword": "newsupersecurepassword"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Password reset successfully",
    "data": {
      "success": true
    }
  }
  ```
  * *Action: The user is now logged out on all devices. Redirect them to the standard login screen.*
* **Errors to Handle**:
  * `400 Bad Request` (`RESET_TOKEN_INVALID`): Reset token has expired (valid for 15 minutes) or has already been used.

---

## Key Frontend Precautions & Guidelines

1. **Persistent Device ID**: The web client must generate a persistent random UUID and save it to `localStorage` on initial boot, providing it in all auth payloads. Mobile clients should generate a UUID and persist it inside hardware-backed secure storage (Android Keystore / iOS Keychain).
2. **Refresh Queueing**: Frontend HTTP clients (like Axios interceptors) should queue incoming requests if a `/auth/refresh` is already running to avoid receiving `409` (`REFRESH_LOCKED`) errors.
3. **Secure Mobile Persistence**: When migrating to mobile apps (APK), store sensitive access/refresh tokens in hardware Keychains (`react-native-keychain` or `expo-secure-store`) rather than plaintext storage (`AsyncStorage`).
4. **Pre-emptive Refreshing**: Decode the JWT access token's `exp` timestamp and schedule a token refresh 30–60 seconds prior to expiration to prevent network lags or `401` errors during active sessions.
5. **Cooldown Countdown**: Enforce a 30-second disable timer on the "Resend OTP" button in the UI to prevent rate-limit errors.
