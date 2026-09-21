# 🚖 Uber Clone Backend API

Backend API for the Uber Clone application built with **Node.js**, **Express.js**, **MongoDB**, **JWT Authentication**, and **Socket.IO**.

---

## 📚 Table of Contents

* User APIs

  * Register User
  * Login User
  * User Profile
  * Logout User
* Captain APIs

  * Register Captain
  * Login Captain
  * Captain Profile
  * Logout Captain
* Authentication
* Error Handling

---

# 👤 User Registration

## Endpoint

```http
POST /users/register
```

## Request Body

```json
{
  "fullname": {
    "firstname": "John",
    "lastname": "Doe"
  },
  "email": "john@example.com",
  "password": "securePassword123"
}
```

## Validation

| Field              | Required | Validation           |
| ------------------ | -------- | -------------------- |
| fullname.firstname | ✅        | Minimum 3 characters |
| fullname.lastname  | ❌        | Minimum 3 characters |
| email              | ✅        | Valid email          |
| password           | ✅        | Minimum 6 characters |

## Success Response

```json
{
  "token": "jwt_token_here",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "fullname": {
      "firstname": "John",
      "lastname": "Doe"
    },
    "email": "john@example.com"
  }
}
```

## Error Response

```json
{
  "errors": [
    {
      "msg": "firstname must be at least 3 characters long"
    }
  ]
}
```

---

# 🔐 User Login

## Endpoint

```http
POST /users/login
```

## Request Body

```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

## Success Response

```json
{
  "token": "jwt_token_here",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "john@example.com"
  }
}
```

## Error Response

```json
{
  "message": "Invalid email or password"
}
```

---

# 👤 User Profile

## Endpoint

```http
GET /users/profile
```

## Headers

```http
Authorization: Bearer <JWT_TOKEN>
```

## Success Response

```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "fullname": {
      "firstname": "John",
      "lastname": "Doe"
    },
    "email": "john@example.com"
  }
}
```

---

# 🚪 User Logout

## Endpoint

```http
POST /users/logout
```

## Headers

```http
Authorization: Bearer <JWT_TOKEN>
```

## Success Response

```json
{
  "message": "Logged out successfully"
}
```

---

# 🚖 Captain Registration

## Endpoint

```http
POST /captains/register
```

## Request Body

```json
{
  "fullname": {
    "firstname": "John",
    "lastname": "Doe"
  },
  "email": "captain@example.com",
  "password": "securePassword123",
  "vehicle": {
    "color": "White",
    "plate": "GJ01AB1234",
    "capacity": 4,
    "vehicleType": "car"
  }
}
```

## Validation

| Field               | Required | Validation           |
| ------------------- | -------- | -------------------- |
| fullname.firstname  | ✅        | Minimum 3 characters |
| fullname.lastname   | ✅        | Minimum 3 characters |
| email               | ✅        | Valid email          |
| password            | ✅        | Minimum 6 characters |
| vehicle.color       | ✅        | Minimum 3 characters |
| vehicle.plate       | ✅        | Minimum 3 characters |
| vehicle.capacity    | ✅        | Minimum 1            |
| vehicle.vehicleType | ✅        | car, bike, auto      |

## Success Response

```json
{
  "token": "jwt_token_here",
  "captain": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "captain@example.com",
    "status": "active"
  }
}
```

---

# 🚖 Captain Login

## Endpoint

```http
POST /captains/login
```

## Request Body

```json
{
  "email": "captain@example.com",
  "password": "securePassword123"
}
```

## Success Response

```json
{
  "token": "jwt_token_here",
  "captain": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "captain@example.com",
    "status": "active"
  }
}
```

## Error Response

```json
{
  "message": "Invalid email or password"
}
```

---

# 👨‍✈️ Captain Profile

## Endpoint

```http
GET /captains/profile
```

## Headers

```http
Authorization: Bearer <JWT_TOKEN>
```

## Success Response

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "fullname": {
    "firstname": "John",
    "lastname": "Doe"
  },
  "email": "captain@example.com",
  "status": "active"
}
```

---

# 🚪 Captain Logout

## Endpoint

```http
POST /captains/logout
```

## Headers

```http
Authorization: Bearer <JWT_TOKEN>
```

## Success Response

```json
{
  "message": "Logged out successfully"
}
```

---

# 🔒 Authentication

This project uses **JWT Authentication**.

* Tokens are generated during login and registration.
* Tokens expire after **24 hours**.
* Protected routes require:

```http
Authorization: Bearer <JWT_TOKEN>
```

* Blacklisted tokens are rejected.
* Logout stores tokens in a blacklist collection.

---

# 🔐 Security Features

* Password hashing using **bcrypt**
* JWT Authentication
* Protected Routes
* Token Blacklisting
* MongoDB TTL Index for expired tokens
* Input Validation using **express-validator**

---

# 🛠️ Tech Stack

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT
* bcrypt
* express-validator
* Socket.IO

---

## 👨‍💻 Author

**Bhavy Patel**

Uber Clone Backend Project built for learning MERN Stack development.
