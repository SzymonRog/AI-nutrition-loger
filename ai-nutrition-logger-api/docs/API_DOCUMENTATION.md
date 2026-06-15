# AI Nutrition Logger API Documentation

FastAPI-based REST API for logging meals and analyzing nutrition data using AI.

## Base URL

```
http://localhost:8000
```

## API Version

**v1** - Prefix: `/api/v1`

---

## Authentication

All protected endpoints require a JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer <your_access_token>
```

### Getting a Token

1. **Register** at `POST /api/v1/auth/register`
2. **Login** at `POST /api/v1/auth/login`
3. Use the returned `access_token` for subsequent requests

---

## Endpoints

### 1. Health Check

**GET** `/health`

Check if the API is running.

**Response:**
```json
{
  "status": "healthy",
  "service": "ai-nutrition-logger"
}
```

---

### 2. Register New User

**POST** `/api/v1/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "daily_calorie_goal": 2000
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Valid email address |
| `password` | string | Yes | 8-100 characters |
| `daily_calorie_goal` | integer | No | Target daily calories (500-10000), default: 2000 |

**Response (201 Created):**
```json
{
  "id": "uuid-string",
  "email": "user@example.com",
  "daily_calorie_goal": 2000,
  "created_at": "2026-04-02T10:00:00",
  "updated_at": "2026-04-02T10:00:00"
}
```

**Error Codes:**
- `400`: Email already registered

---

### 3. Login

**POST** `/api/v1/auth/login`

Authenticate and receive an access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Error Codes:**
- `401`: Incorrect email or password

---

### 4. Get Current User Profile

**GET** `/api/v1/users/me`

Get the authenticated user's profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "uuid-string",
  "email": "user@example.com",
  "daily_calorie_goal": 2000,
  "created_at": "2026-04-02T10:00:00",
  "updated_at": "2026-04-02T10:00:00"
}
```

---

### 5. Update User Settings

**PUT** `/api/v1/users/me`

Update current user's daily calorie goal.

**Request Body:**
```json
{
  "daily_calorie_goal": 2500,
  "sex": "MALE",
  "age": 30,
  "height_cm": 180.0,
  "weight_kg": 80.0,
  "activity_level": "MODERATE",
  "goal_direction": "LOSE",
  "goal_pace": "MODERATE"
}
```

All fields except `daily_calorie_goal` are optional. Omitted biometric fields keep their previously saved values (a goal-only update is a valid manual override). Enum and range validation returns `422` on invalid input.

**Response:**
Returns the updated `UserProfile` object.

---

### 5. Process Meal Text

**POST** `/api/v1/meals/text`

Process a text description of a meal using AI and log it to the database.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "meal_text": "2 eggs, 1 slice of toast with butter, and a cup of coffee",
  "meal_type": "BREAKFAST"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `meal_text` | string | Yes | 1-2000 characters, natural language description |
| `meal_type` | string | Yes | One of: `BREAKFAST`, `LUNCH`, `DINNER`, `SNACK` |

**Response:**
```json
{
  "id": "meal-uuid",
  "items": [
    {
      "original_item": {
        "name": "eggs",
        "quantity": 2.0,
        "unit": "large",
        "estimated_weight_g": 100.0,
        "is_ai_estimated": false
      },
      "macros": {
        "calories": 140.0,
        "protein": 12.0,
        "carbs": 1.0,
        "fats": 10.0,
        "fdc_id": "fdc-12345"
      },
      "is_ai_estimated": false
    }
  ],
  "total_calories": 250.0,
  "total_protein": 14.0,
  "total_carbs": 25.0,
  "total_fats": 12.0,
  "raw_input_text": "2 eggs, 1 slice of toast with butter, and a cup of coffee",
  "image_path": null,
  "meal_type": "BREAKFAST",
  "logged_at": "2026-04-02T10:00:00"
}
```

---

### 6. Process Meal Image

**POST** `/api/v1/meals/image`

Upload an image of a meal for AI analysis and logging.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Description |
|-------|------|-------------|
| `file` | file | Image file (JPEG, PNG, WebP) |
| `meal_type` | string | One of: `BREAKFAST`, `LUNCH`, `DINNER`, `SNACK` |

**Response:**
```json
{
  "id": "meal-uuid",
  "items": [
    {
      "original_item": {
        "name": "grilled chicken breast",
        "quantity": 1.0,
        "unit": "serving",
        "estimated_weight_g": 150.0,
        "is_ai_estimated": false
      },
      "macros": {
        "calories": 165.0,
        "protein": 31.0,
        "carbs": 0.0,
        "fats": 3.6,
        "fdc_id": "fdc-67890"
      },
      "is_ai_estimated": false
    }
  ],
  "total_calories": 450.0,
  "total_protein": 45.0,
  "total_carbs": 40.0,
  "total_fats": 15.0,
  "raw_input_text": "[Image: data/raw/20260402_100000_userid.jpg]",
  "image_path": "data/raw/20260402_100000_userid.jpg",
  "meal_type": "LUNCH",
  "logged_at": "2026-04-02T10:00:00"
}
```

**Error Codes:**
- `400`: Invalid file type (only JPEG, PNG, WebP allowed)

---

### 7. Update Meal Totals (Manual Override)

**PUT** `/api/v1/meals/{meal_id}/totals`

Update the total macro and calorie values for a meal record. This does not change the individual `meal_items` but overrides the pre-aggregated totals in the `meals` table.

**Headers:**
```
Authorization: Bearer <access_token>
```

**URL Parameter:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `meal_id` | UUID | UUID of the meal to update |

**Request Body:**
```json
{
  "total_calories": 520.5,
  "total_protein": 35.0,
  "total_carbs": 45.0,
  "total_fats": 22.0
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `total_calories` | float | Yes | Must be >= 0 |
| `total_protein` | float | Yes | Must be >= 0 |
| `total_carbs` | float | Yes | Must be >= 0 |
| `total_fats` | float | Yes | Must be >= 0 |

**Response (200 OK):**
Returns the full `ProcessedMealResponse` object with updated totals.

**Error Codes:**
- `403`: Not authorized to edit this meal
- `404`: Meal not found

---

### 8. Get Meals by Date

**GET** `/api/v1/meals/date/{target_date}`

Retrieve all meals logged on a specific date.

**Headers:**
```
Authorization: Bearer <access_token>
```

**URL Parameter:**
| Parameter | Format | Description |
|-----------|--------|-------------|
| `target_date` | YYYY-MM-DD | Date to query |

**Example:** `/api/v1/meals/date/2026-04-02`

**Response:**
```json
{
  "meals": [
    {
      "id": "meal-uuid",
      "items": [...],
      "total_calories": 650.0,
      "total_protein": 35.0,
      "total_carbs": 60.0,
      "total_fats": 25.0,
      "raw_input_text": "2 eggs and toast",
      "image_path": null,
      "meal_type": "BREAKFAST",
      "logged_at": "2026-04-02T08:00:00"
    }
  ],
  "total_count": 1,
  "date": "2026-04-02"
}
```

---

## Interactive Documentation

Access the interactive Swagger UI at:

```
http://localhost:8000/docs
```

Or the ReDoc alternative at:

```
http://localhost:8000/redoc
```

---

## Error Response Format

All errors follow this format:

```json
{
  "detail": "Error message description"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `500`: Internal Server Error