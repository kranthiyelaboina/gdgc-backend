# GDGC Platform Backend - API Documentation

## 🌐 Base URLs

| Environment | Base URL |
|-------------|----------|
| **Production (Render)** | `https://gdgcplatformbackend.onrender.com` |
| **Local Development** | `http://localhost:5000` |

---

## 📋 Table of Contents

1. [Health Check](#health-check)
2. [Authentication Routes](#authentication-routes)
3. [Events Routes](#events-routes)
4. [Quiz Routes](#quiz-routes)
5. [Leaderboard Routes](#leaderboard-routes)
6. [Admin Study Jams Routes](#admin-study-jams-routes)
7. [Error Responses](#error-responses)
8. [CORS Configuration](#cors-configuration)

---

## 🏥 Health Check

### Server Health Check

Check if the server is running.

- **URL:** `/`
- **Method:** `GET`
- **Auth Required:** No
- **Live URL:** `https://gdgcplatformbackend.onrender.com/`

**Response:**
```
Server is working
```

---

## 🔐 Authentication Routes

Base Path: `/api/auth`

### 1. Register Admin

Create a new admin account (requires secret key).

- **URL:** `/api/auth/register`
- **Method:** `POST`
- **Auth Required:** No (but requires secret key)
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/auth/register`

**Request Body:**
```json
{
  "username": "admin_username",
  "password": "secure_password",
  "email": "admin@example.com",
  "secretKey": "your_admin_secret_key"
}
```

**Success Response (201):**
```json
{
  "message": "Admin registered successfully",
  "admin": {
    "id": "64abc123...",
    "username": "admin_username",
    "email": "admin@example.com",
    "role": "admin",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Missing required fields
- `403` - Invalid secret key
- `409` - Admin already exists

---

### 2. Login Admin

Authenticate an admin and receive a JWT token.

- **URL:** `/api/auth/login`
- **Method:** `POST`
- **Auth Required:** No
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/auth/login`

**Request Body:**
```json
{
  "username": "admin_username",
  "password": "secure_password"
}
```

**Success Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": "64abc123...",
    "username": "admin_username",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

**Error Responses:**
- `401` - Invalid credentials

---

### 3. Logout Admin

Destroy the admin session.

- **URL:** `/api/auth/logout`
- **Method:** `POST`
- **Auth Required:** Yes (Session)
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/auth/logout`

**Headers:**
```
Cookie: connect.sid=session_id
```

**Success Response (200):**
```json
{
  "message": "Logout successful"
}
```

---

### 4. Get Current Admin

Get the currently authenticated admin's information.

- **URL:** `/api/auth/me`
- **Method:** `GET`
- **Auth Required:** Yes (Session)
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/auth/me`

**Success Response (200):**
```json
{
  "admin": {
    "_id": "64abc123...",
    "username": "admin_username",
    "email": "admin@example.com",
    "role": "admin",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "lastLogin": "2024-01-20T14:25:00.000Z"
  }
}
```

**Error Responses:**
- `401` - Not authenticated
- `404` - Admin not found

---

### 5. Refresh Token

Generate a new JWT token for the authenticated admin.

- **URL:** `/api/auth/refresh-token`
- **Method:** `POST`
- **Auth Required:** Yes (Session)
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/auth/refresh-token`

**Success Response (200):**
```json
{
  "message": "Token refreshed successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

---

### 6. Change Password

Change the password for the authenticated admin.

- **URL:** `/api/auth/change-password`
- **Method:** `PUT`
- **Auth Required:** Yes (Session)
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/auth/change-password`

**Request Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_secure_password"
}
```

**Success Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `400` - Missing fields or password too short (min 6 chars)
- `401` - Current password incorrect
- `404` - Admin not found

---

### 7. Get All Admins

Retrieve a list of all admin accounts.

- **URL:** `/api/auth/admins`
- **Method:** `GET`
- **Auth Required:** Yes (Session)
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/auth/admins`

**Success Response (200):**
```json
{
  "admins": [
    {
      "_id": "64abc123...",
      "username": "admin1",
      "email": "admin1@example.com",
      "role": "admin"
    }
  ]
}
```

---

## 📅 Events Routes

Base Path: `/api/events`

### 1. Get All Events

Retrieve all events sorted by date (newest first).

- **URL:** `/api/events`
- **Method:** `GET`
- **Auth Required:** No
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/events`

**Success Response (200):**
```json
[
  {
    "id": "64abc123...",
    "eventName": "Flutter Workshop",
    "description": "Learn Flutter basics",
    "date": "2024-02-15",
    "eventType": "workshop",
    "status": "upcoming",
    "imageUrl": "https://example.com/image.jpg",
    "referenceUrl": "https://example.com/register"
  }
]
```

---

### 2. Get Events by Status

Retrieve events filtered by status (past/upcoming).

- **URL:** `/api/events/status/:status`
- **Method:** `GET`
- **Auth Required:** No
- **Parameters:** `status` - Either `past` or `upcoming`
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/events/status/upcoming`

**Success Response (200):**
```json
[
  {
    "id": "64abc123...",
    "eventName": "Flutter Workshop",
    "description": "Learn Flutter basics",
    "date": "2024-02-15",
    "eventType": "workshop",
    "status": "upcoming",
    "imageUrl": "https://example.com/image.jpg"
  }
]
```

**Error Responses:**
- `400` - Invalid status (must be "past" or "upcoming")

---

### 3. Get Event by ID

Retrieve a single event by its ID.

- **URL:** `/api/events/:id`
- **Method:** `GET`
- **Auth Required:** No
- **Parameters:** `id` - MongoDB ObjectId
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/events/64abc123...`

**Success Response (200):**
```json
{
  "id": "64abc123...",
  "eventName": "Flutter Workshop",
  "description": "Learn Flutter basics",
  "date": "2024-02-15",
  "eventType": "workshop",
  "status": "upcoming",
  "imageUrl": "https://example.com/image.jpg",
  "referenceUrl": "https://example.com/register"
}
```

**Error Responses:**
- `404` - Event not found

---

### 4. Create Event

Create a new event.

- **URL:** `/api/events`
- **Method:** `POST`
- **Auth Required:** No (Consider adding auth)
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/events`

**Request Body:**
```json
{
  "eventName": "Flutter Workshop",
  "description": "Learn Flutter basics and build your first app",
  "date": "2024-02-15",
  "eventType": "workshop",
  "status": "upcoming",
  "imageUrl": "https://example.com/image.jpg",
  "referenceUrl": "https://example.com/register"
}
```

**Event Types:** `workshop`, `hackathon`, `meetup`, `conference`, `seminar`, `webinar`

**Status Options:** `past`, `upcoming`

**Success Response (201):**
```json
{
  "message": "Event created successfully",
  "event": {
    "id": "64abc123...",
    "eventName": "Flutter Workshop",
    "description": "Learn Flutter basics and build your first app",
    "date": "2024-02-15",
    "eventType": "workshop",
    "status": "upcoming",
    "imageUrl": "https://example.com/image.jpg",
    "referenceUrl": "https://example.com/register"
  }
}
```

**Error Responses:**
- `400` - Missing required fields

---

### 5. Update Event

Update an existing event.

- **URL:** `/api/events/:id`
- **Method:** `PUT`
- **Auth Required:** No (Consider adding auth)
- **Parameters:** `id` - MongoDB ObjectId
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/events/64abc123...`

**Request Body (all fields optional):**
```json
{
  "eventName": "Updated Flutter Workshop",
  "description": "Updated description",
  "date": "2024-02-20",
  "eventType": "workshop",
  "status": "past",
  "imageUrl": "https://example.com/new-image.jpg",
  "referenceUrl": "https://example.com/new-link"
}
```

**Success Response (200):**
```json
{
  "message": "Event updated successfully",
  "event": {
    "id": "64abc123...",
    "eventName": "Updated Flutter Workshop",
    "description": "Updated description",
    "date": "2024-02-20",
    "eventType": "workshop",
    "status": "past",
    "imageUrl": "https://example.com/new-image.jpg",
    "referenceUrl": "https://example.com/new-link"
  }
}
```

**Error Responses:**
- `404` - Event not found

---

### 6. Delete Event

Delete an event by its ID.

- **URL:** `/api/events/:id`
- **Method:** `DELETE`
- **Auth Required:** No (Consider adding auth)
- **Parameters:** `id` - MongoDB ObjectId
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/events/64abc123...`

**Success Response (200):**
```json
{
  "message": "Event deleted successfully"
}
```

**Error Responses:**
- `404` - Event not found

---

## 📝 Quiz Routes

Base Path: `/api/quiz`

### Admin Routes

#### 1. Create Quiz

Create a new quiz with questions.

- **URL:** `/api/quiz/create`
- **Method:** `POST`
- **Auth Required:** No (Consider adding auth)
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/quiz/create`

**Request Body:**
```json
{
  "quiz_id": "flutter-basics-001",
  "title": "Flutter Basics Quiz",
  "description": "Test your knowledge of Flutter fundamentals",
  "category": "Flutter",
  "difficulty": "Beginner",
  "tags": ["flutter", "dart", "mobile"],
  "time_limit_sec": 600,
  "total_marks": 10,
  "created_by": "admin",
  "questions": [
    {
      "question_id": "q1",
      "type": "single_choice",
      "question_text": "What is Flutter?",
      "options": [
        { "option_id": "a", "text": "A programming language" },
        { "option_id": "b", "text": "A UI toolkit" },
        { "option_id": "c", "text": "A database" },
        { "option_id": "d", "text": "An operating system" }
      ],
      "correct_answers": ["b"],
      "marks": 2,
      "explanation": "Flutter is a UI toolkit for building natively compiled applications."
    },
    {
      "question_id": "q2",
      "type": "multiple_choice",
      "question_text": "Which platforms does Flutter support?",
      "options": [
        { "option_id": "a", "text": "iOS" },
        { "option_id": "b", "text": "Android" },
        { "option_id": "c", "text": "Web" },
        { "option_id": "d", "text": "Desktop" }
      ],
      "correct_answers": ["a", "b", "c", "d"],
      "marks": 4,
      "explanation": "Flutter supports iOS, Android, Web, and Desktop platforms."
    }
  ]
}
```

**Difficulty Options:** `Beginner`, `Intermediate`, `Advanced`

**Question Types:** `single_choice`, `multiple_choice`

**Success Response (201):**
```json
{
  "success": true,
  "message": "Quiz created successfully",
  "quiz": {
    "id": "64abc123...",
    "quiz_id": "flutter-basics-001",
    "code": "123456",
    "title": "Flutter Basics Quiz",
    "category": "Flutter",
    "difficulty": "Beginner",
    "total_marks": 10,
    "time_limit_sec": 600,
    "questions_count": 2,
    "isActive": false,
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  "admin_info": {
    "quiz_access_code": "123456",
    "share_with_users": "Share this code with users: 123456",
    "start_quiz_endpoint": "/api/quiz/start",
    "toggle_status_endpoint": "/api/quiz/64abc123.../toggle"
  }
}
```

**Error Responses:**
- `400` - Missing required fields or invalid question structure
- `409` - Quiz with this quiz_id already exists

---

#### 2. Get All Quizzes (Admin)

Retrieve all quizzes with admin details.

- **URL:** `/api/quiz/admin/all`
- **Method:** `GET`
- **Auth Required:** No (Consider adding auth)
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/quiz/admin/all`

**Success Response (200):**
```json
{
  "quizzes": [
    {
      "id": "64abc123...",
      "quiz_id": "flutter-basics-001",
      "title": "Flutter Basics Quiz",
      "description": "Test your knowledge of Flutter fundamentals",
      "category": "Flutter",
      "difficulty": "Beginner",
      "tags": ["flutter", "dart", "mobile"],
      "time_limit_sec": 600,
      "total_marks": 10,
      "created_by": "admin",
      "code": "123456",
      "isActive": true,
      "questions_count": 5,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "startTime": null,
      "endTime": null
    }
  ]
}
```

---

#### 3. Get All Quiz Attempts (Admin)

Retrieve all quiz attempts with optional filtering.

- **URL:** `/api/quiz/admin/attempts`
- **Method:** `GET`
- **Auth Required:** No (Consider adding auth)
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/quiz/admin/attempts`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `quiz_id` | string | Filter by quiz ID |
| `user_id` | string | Filter by user ID (roll number) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 50) |

**Example:** `/api/quiz/admin/attempts?quiz_id=flutter-basics-001&page=1&limit=10`

**Success Response (200):**
```json
{
  "success": true,
  "attempts": [
    {
      "_id": "64abc123...",
      "quiz_id": "flutter-basics-001",
      "quiz_title": "Flutter Basics Quiz",
      "user_id": "22B01A0501",
      "score": 8,
      "percentage": 80,
      "total_marks": 10,
      "questions_correct": 4,
      "total_questions": 5,
      "time_taken_sec": 350,
      "submitted_at": "2024-01-15T11:00:00.000Z",
      "responses": [...]
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalAttempts": 50,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

#### 4. Get User Quiz History (Admin)

Get a specific user's quiz history.

- **URL:** `/api/quiz/admin/user/:user_id/history`
- **Method:** `GET`
- **Auth Required:** No (Consider adding auth)
- **Parameters:** `user_id` - User's roll number
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/quiz/admin/user/22B01A0501/history`

**Success Response (200):**
```json
{
  "success": true,
  "user_id": "22B01A0501",
  "summary": {
    "total_attempts": 3,
    "total_score": 24,
    "average_percentage": 80,
    "best_score": 10,
    "quizzes_taken": ["Flutter Basics Quiz", "Dart Advanced Quiz"]
  },
  "attempts": [
    {
      "_id": "64abc123...",
      "quiz_id": "flutter-basics-001",
      "quiz_title": "Flutter Basics Quiz",
      "score": 8,
      "percentage": 80,
      "submitted_at": "2024-01-15T11:00:00.000Z"
    }
  ]
}
```

---

#### 5. Toggle Quiz Status

Activate or deactivate a quiz.

- **URL:** `/api/quiz/:id/toggle`
- **Method:** `PATCH`
- **Auth Required:** No (Consider adding auth)
- **Parameters:** `id` - MongoDB ObjectId
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/quiz/64abc123.../toggle`

**Success Response (200):**
```json
{
  "message": "Quiz activated successfully",
  "quiz": {
    "id": "64abc123...",
    "code": "123456",
    "isActive": true
  }
}
```

**Error Responses:**
- `404` - Quiz not found

---

### User Routes

#### 6. Start Quiz

Start a quiz using the 6-digit access code.

- **URL:** `/api/quiz/start`
- **Method:** `POST`
- **Auth Required:** No
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/quiz/start`

**Request Body:**
```json
{
  "code": "123456",
  "rollNo": "22B01A0501",
  "name": "John Doe"
}
```

**Success Response (200):**
```json
{
  "quiz_id": "flutter-basics-001",
  "title": "Flutter Basics Quiz",
  "description": "Test your knowledge of Flutter fundamentals",
  "category": "Flutter",
  "difficulty": "Beginner",
  "time_limit_sec": 600,
  "total_questions": 5,
  "questions": [
    {
      "question_id": "q1",
      "type": "single_choice",
      "question_text": "What is Flutter?",
      "options": [
        { "option_id": "a", "text": "A programming language" },
        { "option_id": "b", "text": "A UI toolkit" },
        { "option_id": "c", "text": "A database" },
        { "option_id": "d", "text": "An operating system" }
      ]
    }
  ]
}
```

> ⚠️ **Note:** Correct answers are NOT included in the response for security.

**Error Responses:**
- `400` - Missing code or roll number / Quiz not available at this time
- `404` - Invalid quiz code or quiz not active
- `409` - User has already attempted this quiz

---

#### 7. Submit Quiz

Submit quiz answers for evaluation.

- **URL:** `/api/quiz/submit`
- **Method:** `POST`
- **Auth Required:** No
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/quiz/submit`

**Request Body:**
```json
{
  "quiz_id": "flutter-basics-001",
  "user_id": "22B01A0501",
  "submitted_at": "2024-01-15T11:00:00.000Z",
  "time_taken_sec": 350,
  "responses": [
    {
      "question_id": "q1",
      "selected_options": ["b"]
    },
    {
      "question_id": "q2",
      "selected_options": ["a", "b", "c", "d"]
    }
  ]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Quiz submitted successfully",
  "evaluation": {
    "quiz_id": "flutter-basics-001",
    "user_id": "22B01A0501",
    "submitted_at": "2024-01-15T11:00:00.000Z",
    "time_taken_sec": 350,
    "score": {
      "total_marks_earned": 6,
      "total_marks_possible": 10,
      "percentage": 60,
      "questions_correct": 2,
      "total_questions": 5
    },
    "question_results": [
      {
        "question_id": "q1",
        "user_selected_options": ["b"],
        "correct_answers": ["b"],
        "is_correct": true,
        "marks_awarded": 2,
        "max_marks": 2,
        "explanation": "Flutter is a UI toolkit for building natively compiled applications."
      }
    ]
  }
}
```

**Error Responses:**
- `400` - Missing required fields
- `404` - Quiz not found
- `409` - Quiz already submitted by this user

---

## 🏆 Leaderboard Routes

Base Path: `/api/leaderboard`

### 1. Get Leaderboard

Retrieve the quiz leaderboard sorted by score.

- **URL:** `/api/leaderboard`
- **Method:** `GET`
- **Auth Required:** No
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/leaderboard`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Items per page (default: 50) |
| `page` | number | Page number (default: 1) |

**Example:** `/api/leaderboard?page=1&limit=20`

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "rollNo": "22B01A0501",
      "name": "John Doe",
      "score": 10,
      "percentage": 100,
      "totalMarks": 10,
      "questionsCorrect": 5,
      "totalQuestions": 5,
      "quizTitle": "Flutter Basics Quiz",
      "submissionTime": "2024-01-15T11:00:00.000Z",
      "lastQuiz": {
        "title": "Flutter Basics Quiz",
        "quiz_id": "flutter-basics-001",
        "category": "Flutter"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalParticipants": 100,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### 2. Add/Update Score

Add a score or update existing score (cumulative).

- **URL:** `/api/leaderboard/add`
- **Method:** `POST`
- **Auth Required:** No (Consider adding auth)
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/leaderboard/add`

**Request Body:**
```json
{
  "rollNo": "22B01A0501",
  "name": "John Doe",
  "score": 10
}
```

**Success Response (200/201):**
```json
{
  "message": "Score updated successfully",
  "entry": {
    "_id": "64abc123...",
    "rollNo": "22B01A0501",
    "name": "John Doe",
    "score": 20
  }
}
```

---

### 3. Get Score by Roll Number

Get a specific user's score.

- **URL:** `/api/leaderboard/rollno/:rollNo`
- **Method:** `GET`
- **Auth Required:** No
- **Parameters:** `rollNo` - User's roll number
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/leaderboard/rollno/22B01A0501`

**Success Response (200):**
```json
{
  "_id": "64abc123...",
  "rollNo": "22B01A0501",
  "name": "John Doe",
  "score": 10,
  "percentage": 100,
  "totalMarks": 10,
  "questionsCorrect": 5,
  "totalQuestions": 5,
  "quizTitle": "Flutter Basics Quiz",
  "submissionTime": "2024-01-15T11:00:00.000Z"
}
```

**Error Responses:**
- `404` - Roll number not found

---

### 4. Set Score (Admin)

Manually set a user's score (overwrites existing).

- **URL:** `/api/leaderboard/set`
- **Method:** `POST`
- **Auth Required:** No (Consider adding auth)
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/leaderboard/set`

**Request Body:**
```json
{
  "rollNo": "22B01A0501",
  "name": "John Doe",
  "score": 15
}
```

**Success Response (200):**
```json
{
  "message": "Score set successfully",
  "entry": {
    "_id": "64abc123...",
    "rollNo": "22B01A0501",
    "name": "John Doe",
    "score": 15
  }
}
```

---

## 📚 Admin Study Jams Routes

Base Path: `/api/admin`

### 1. Get Participants Data

Get all Study Jams participants grouped by team with stats and rankings.

- **URL:** `/api/admin/participants`
- **Method:** `GET`
- **Auth Required:** No
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/admin/participants`

**Success Response (200):**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "team": "1",
      "teamRank": 1,
      "totalScore": 45,
      "memberCount": 5,
      "averageSkillBadges": 5.5,
      "averageArcadeGames": 3.5,
      "totalSkillBadges": 27,
      "totalArcadeGames": 18,
      "lead": {
        "_id": "64abc123...",
        "userName": "Team Lead Name",
        "userEmail": "lead@example.com",
        "team": 1,
        "isLead": true,
        "skillBadgesCompleted": 8,
        "arcadeGamesCompleted": 5,
        "googleCloudSkillsBoostProfileURL": "https://..."
      },
      "members": [
        {
          "_id": "64abc124...",
          "userName": "Member Name",
          "userEmail": "member@example.com",
          "team": 1,
          "isLead": false,
          "skillBadgesCompleted": 5,
          "arcadeGamesCompleted": 3,
          "googleCloudSkillsBoostProfileURL": "https://..."
        }
      ]
    }
  ]
}
```

---

### 2. Upload Study Jams Participants

Upload a CSV/Excel file to enroll participants.

- **URL:** `/api/admin/upload-study-jams`
- **Method:** `POST`
- **Auth Required:** Yes (Session + Admin Role)
- **Content-Type:** `multipart/form-data`
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/admin/upload-study-jams`

**Form Data:**
| Field | Type | Description |
|-------|------|-------------|
| `participantsFile` | file | CSV or XLSX file |

**Required CSV Headers:**
- `User Name`
- `User Email`
- `Google Cloud Skills Boost Profile URL` (optional)
- `# of Skill Badges Completed` (optional)
- `# of Arcade Games Completed` (optional)
- `Team` (optional)
- `Lead` (Y/N, optional)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully processed 50 participants.",
  "results": {
    "matchedCount": 10,
    "modifiedCount": 8,
    "upsertedCount": 40
  }
}
```

**Error Responses:**
- `400` - No file uploaded / Invalid file type / Missing required headers
- `401` - Not authenticated
- `403` - Admin access required

---

### 3. Update Study Jams Progress

Upload a progress report to update scores only.

- **URL:** `/api/admin/update-progress`
- **Method:** `POST`
- **Auth Required:** Yes (Session + Admin Role)
- **Content-Type:** `multipart/form-data`
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/admin/update-progress`

**Form Data:**
| Field | Type | Description |
|-------|------|-------------|
| `participantsFile` | file | CSV or XLSX file |

**Required CSV Headers:**
- `User Name`
- `User Email`
- `# of Skill Badges Completed`
- `# of Arcade Games Completed`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully updated progress for 45 participants.",
  "results": {
    "matchedCount": 45,
    "modifiedCount": 30,
    "upsertedCount": 0
  }
}
```

---

### 4. Delete Single Participant

Delete a participant by their email.

- **URL:** `/api/admin/participant/:email`
- **Method:** `DELETE`
- **Auth Required:** Yes (Session + Admin Role)
- **Parameters:** `email` - Participant's email address
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/admin/participant/user@example.com`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Participant successfully deleted.",
  "deletedParticipant": {
    "_id": "64abc123...",
    "userName": "Deleted User",
    "userEmail": "user@example.com",
    "team": 1
  }
}
```

**Error Responses:**
- `400` - Email parameter required
- `401` - Not authenticated
- `403` - Admin access required
- `404` - Participant not found

---

### 5. Delete All Participants

⚠️ **DANGER ZONE** - Delete all participants from the database.

- **URL:** `/api/admin/participants/all`
- **Method:** `DELETE`
- **Auth Required:** Yes (Session + Admin Role)
- **Live URL:** `https://gdgcplatformbackend.onrender.com/api/admin/participants/all`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Successfully deleted 100 participants. The collection is now empty.",
  "deletedCount": 100
}
```

**Error Responses:**
- `401` - Not authenticated
- `403` - Admin access required

---

## ❌ Error Responses

### Standard Error Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message (development only)"
}
```

### Common HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request - Invalid input |
| `401` | Unauthorized - Not authenticated |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Resource doesn't exist |
| `409` | Conflict - Duplicate resource |
| `500` | Internal Server Error |

### 404 Route Not Found Response

```json
{
  "success": false,
  "message": "Route not found",
  "requestedUrl": "/api/invalid-route",
  "method": "GET",
  "availableRoutes": ["/api/auth", "/api/events", "/api/leaderboard", "/api/quiz", "/api/admin"]
}
```

---

## 🔒 CORS Configuration

### Allowed Origins

```javascript
[
  'http://localhost:3000',
  'http://localhost:5000',
  'https://www.gdgciare.tech',
  'https://gdgciare.tech',
  'https://gdgc-platform-frontend.vercel.app'
]
```

### Allowed Methods

`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`

### Allowed Headers

`Content-Type`, `Authorization`, `X-Requested-With`

---

## 📊 Quick Reference - All Routes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| **Health** |
| `GET` | `/` | Server health check | ❌ |
| **Auth** |
| `POST` | `/api/auth/register` | Register admin | ❌ (needs secret) |
| `POST` | `/api/auth/login` | Admin login | ❌ |
| `POST` | `/api/auth/logout` | Admin logout | ✅ Session |
| `GET` | `/api/auth/me` | Get current admin | ✅ Session |
| `POST` | `/api/auth/refresh-token` | Refresh JWT token | ✅ Session |
| `PUT` | `/api/auth/change-password` | Change password | ✅ Session |
| `GET` | `/api/auth/admins` | Get all admins | ✅ Session |
| **Events** |
| `GET` | `/api/events` | Get all events | ❌ |
| `GET` | `/api/events/status/:status` | Get events by status | ❌ |
| `GET` | `/api/events/:id` | Get event by ID | ❌ |
| `POST` | `/api/events` | Create event | ❌ |
| `PUT` | `/api/events/:id` | Update event | ❌ |
| `DELETE` | `/api/events/:id` | Delete event | ❌ |
| **Quiz** |
| `POST` | `/api/quiz/create` | Create quiz | ❌ |
| `GET` | `/api/quiz/admin/all` | Get all quizzes | ❌ |
| `GET` | `/api/quiz/admin/attempts` | Get all attempts | ❌ |
| `GET` | `/api/quiz/admin/user/:user_id/history` | Get user history | ❌ |
| `PATCH` | `/api/quiz/:id/toggle` | Toggle quiz status | ❌ |
| `POST` | `/api/quiz/start` | Start quiz (user) | ❌ |
| `POST` | `/api/quiz/submit` | Submit quiz (user) | ❌ |
| **Leaderboard** |
| `GET` | `/api/leaderboard` | Get leaderboard | ❌ |
| `POST` | `/api/leaderboard/add` | Add/update score | ❌ |
| `GET` | `/api/leaderboard/rollno/:rollNo` | Get score by roll | ❌ |
| `POST` | `/api/leaderboard/set` | Set score (admin) | ❌ |
| **Admin Study Jams** |
| `GET` | `/api/admin/participants` | Get participants | ❌ |
| `POST` | `/api/admin/upload-study-jams` | Upload participants | ✅ Session+Admin |
| `POST` | `/api/admin/update-progress` | Update progress | ✅ Session+Admin |
| `DELETE` | `/api/admin/participant/:email` | Delete participant | ✅ Session+Admin |
| `DELETE` | `/api/admin/participants/all` | Delete all | ✅ Session+Admin |

---

## 🔗 Live API Endpoints

### Production Base URL
```
https://gdgcplatformbackend.onrender.com
```

### All Live Endpoints

| Endpoint | Full URL |
|----------|----------|
| Health Check | https://gdgcplatformbackend.onrender.com/ |
| Auth Register | https://gdgcplatformbackend.onrender.com/api/auth/register |
| Auth Login | https://gdgcplatformbackend.onrender.com/api/auth/login |
| Auth Logout | https://gdgcplatformbackend.onrender.com/api/auth/logout |
| Auth Me | https://gdgcplatformbackend.onrender.com/api/auth/me |
| Auth Refresh Token | https://gdgcplatformbackend.onrender.com/api/auth/refresh-token |
| Auth Change Password | https://gdgcplatformbackend.onrender.com/api/auth/change-password |
| Auth All Admins | https://gdgcplatformbackend.onrender.com/api/auth/admins |
| Events List | https://gdgcplatformbackend.onrender.com/api/events |
| Events By Status | https://gdgcplatformbackend.onrender.com/api/events/status/upcoming |
| Events By ID | https://gdgcplatformbackend.onrender.com/api/events/:id |
| Quiz Create | https://gdgcplatformbackend.onrender.com/api/quiz/create |
| Quiz All (Admin) | https://gdgcplatformbackend.onrender.com/api/quiz/admin/all |
| Quiz Attempts (Admin) | https://gdgcplatformbackend.onrender.com/api/quiz/admin/attempts |
| Quiz User History | https://gdgcplatformbackend.onrender.com/api/quiz/admin/user/:user_id/history |
| Quiz Toggle | https://gdgcplatformbackend.onrender.com/api/quiz/:id/toggle |
| Quiz Start | https://gdgcplatformbackend.onrender.com/api/quiz/start |
| Quiz Submit | https://gdgcplatformbackend.onrender.com/api/quiz/submit |
| Leaderboard | https://gdgcplatformbackend.onrender.com/api/leaderboard |
| Leaderboard Add | https://gdgcplatformbackend.onrender.com/api/leaderboard/add |
| Leaderboard By Roll | https://gdgcplatformbackend.onrender.com/api/leaderboard/rollno/:rollNo |
| Leaderboard Set | https://gdgcplatformbackend.onrender.com/api/leaderboard/set |
| Study Jams Participants | https://gdgcplatformbackend.onrender.com/api/admin/participants |
| Study Jams Upload | https://gdgcplatformbackend.onrender.com/api/admin/upload-study-jams |
| Study Jams Progress | https://gdgcplatformbackend.onrender.com/api/admin/update-progress |
| Study Jams Delete One | https://gdgcplatformbackend.onrender.com/api/admin/participant/:email |
| Study Jams Delete All | https://gdgcplatformbackend.onrender.com/api/admin/participants/all |

---

## 📝 Notes

1. **Authentication:** Many routes currently don't require authentication. Consider adding the `sessionAuthMiddleware` middleware to protect sensitive routes in production.

2. **Socket.io:** The server also supports WebSocket connections via Socket.io for real-time features.

3. **File Uploads:** Study Jams routes accept `.xlsx` and `.csv` files only.

4. **Session Cookies:** The session cookie is named `connect.sid` and is HTTP-only with a 24-hour expiration.

5. **JWT Tokens:** JWT tokens expire after 24 hours and can be refreshed using the `/api/auth/refresh-token` endpoint.

---

*Last Updated: December 4, 2025*
