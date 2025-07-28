# 🧪 Authentication API Testing Documentation

## 📍 Base URL

```
http://localhost:5000/api
```

---

## ✅ 1. Health Check

**GET** `/api/health`
Checks if server is running.

### ✅ Expected Response:

```json
{
  "status": "OK",
  "message": "Server is running!",
  "timestamp": "2025-07-02T10:30:00.000Z"
}
```

---

## 🧝 2. User Registration

**POST** `/api/auth/register`
Registers a new user (admin or user).

### 📤 Request:

```json
{
  "email": "admin@test.com",
  "password": "Test123!@#",
  "firstName": "John",
  "lastName": "Doe",
  "role": "ADMIN"
}
```

### ✅ Expected Response:

```json
{
  "message": "User registered successfully",
  "user": {
    "id": "clx1234567890",
    "email": "admin@test.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "ADMIN",
    "createdAt": "2025-07-02T10:30:00.000Z"
  }
}
```

---

## 🔐 3. User Login (No 2FA)

**POST** `/api/auth/login`

### 📤 Request:

```json
{
  "email": "admin@test.com",
  "password": "Test123!@#"
}
```

### ✅ Response (Without 2FA):

```json
{
  "message": "Login successful",
  "accessToken": "jwt_token",
  "refreshToken": "jwt_token",
  "user": {
    "id": "clx1234567890",
    "email": "admin@test.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "ADMIN"
  }
}
```

---

## 🔄 4. Refresh Token

**POST** `/api/auth/refresh`

### 📤 Request:

```json
{
  "refreshToken": "your_refresh_token_here"
}
```

### ✅ Response:

```json
{
  "accessToken": "new_access_token_here"
}
```

---

## 🔁 5. Change Password

**POST** `/api/auth/change-password`
🛡️ Requires Bearer token.

### 📤 Request:

```json
{
  "currentPassword": "Test123!@#",
  "newPassword": "NewTest123!@#"
}
```

### ✅ Response:

* `200 OK` on success
* `400 Bad Request` if old password is wrong

---

## 🚪 6. Logout

**POST** `/api/auth/logout`
🛡️ Requires Bearer token.

### 📤 Request:

```json
{
  "refreshToken": "your_refresh_token_here"
}
```

### ✅ Response:

```json
{
  "message": "Logout successful"
}
```

---

## 🔒 7. Logout All Devices

**POST** `/api/auth/logout-all`
🛡️ Requires Bearer token.

### ✅ Response:

```json
{
  "message": "All sessions cleared"
}
```

---

## 🔐 Two-Factor Authentication (2FA)

### 1️⃣ Check 2FA Status

**GET** `/api/auth/2fa/status`
🛡️ Requires Bearer token.

### ✅ Response:

```json
{
  "is2FAEnabled": false
}
```


### 2️⃣ Setup 2FA

**POST** `/api/auth/2fa/setup`
🛡️ Requires Bearer token.

### ✅ Response:

```json
{
  "message": "Scan the QR code with your authenticator app and verify with a token",
  "qrCode": "data:image/png;base64,...",
  "manualEntryKey": "JBSWY3DPEHPK3PXP"
}
```

### 3️⃣ Verify 2FA Setup

**POST** `/api/auth/2fa/verify`
🛡️ Requires Bearer token.

### 📤 Request:

```json
{
  "token": "123456"
}
```

### ✅ Response:

```json
{
  "message": "2FA enabled successfully"
}
```

### 4a. Login with 2FA Enabled - Initial Login

**POST** `/api/auth/login`

### 📤 Request:

```json
{
  "email": "admin@test.com",
  "password": "Test123!@#"
}
```

### ✅ Response:

```json
{
  "requires2FA": true,
  "tempToken": "temp_token_here",
  "message": "Please provide 2FA token to complete login"
}
```

### 4b. Complete Login with 2FA Token

**POST** `/api/auth/2fa/login`

### 📤 Request:

```json
{
  "tempToken": "temp_token_here",
  "token": "654321"
}
```

### ✅ Response:

```json
{
  "message": "Login successful",
  "accessToken": "jwt_token",
  "refreshToken": "jwt_token",
  "user": {
    "id": "clx1234567890",
    "email": "admin@test.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "ADMIN"
  }
}
```

### 5️⃣ Disable 2FA

**POST** `/api/auth/2fa/disable`
🛡️ Requires Bearer token.

### 📤 Request:

```json
{
  "token": "987654"
}
```

### ✅ Response:

```json
{
  "message": "2FA disabled successfully"
}
```

---

## 🛠️ Environment Variables (.env)

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/db"
DIRECT_URL="postgresql://user:pass@localhost:5432/db"

JWT_ACCESS_SECRET="your-access-secret"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_TEMP_SECRET="your-temp-secret"

ACCESS_TOKEN_EXPIRY="15m"
REFRESH_TOKEN_EXPIRY="7d"
TEMP_TOKEN_EXPIRY="5m"

BCRYPT_ROUNDS="12"

ADMIN_EMAIL="admin@uniapp.com"
ADMIN_PASSWORD="Admin123!@#"

PORT="5000"
NODE_ENV="development"
```
