# User Guide: AI Nutrition Logger API

A step-by-step guide to using the AI Nutrition Logger API.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Navigating the API](#navigating-the-api)
3. [Creating a New User Account](#creating-a-new-user-account)
4. [Logging In](#logging-in)
5. [Estimating Calories from Text](#estimating-calories-from-text)
6. [Estimating Calories from Images](#estimating-calories-from-images)
7. [Viewing Your Meal History](#viewing-your-meal-history)
8. [Understanding the Response Data](#understanding-the-response-data)

---

## Quick Start

1. **Start the API server:**
   ```bash
   .venv\Scripts\python.exe -m uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
   ```

2. **Open the interactive docs:**
   ```
   http://localhost:8000/docs
   ```

3. **Register a new user** (see Step 3)

4. **Login** to get your access token (see Step 4)

5. **Process meals** using your token (see Steps 5-6)

---

## Navigating the API

### Using the Interactive Documentation (Recommended)

The easiest way to navigate is through the built-in **Swagger UI**:

1. Start the server: `uvicorn src.api.main:app --reload`
2. Open browser: `http://localhost:8000/docs`
3. Click on any endpoint to expand it
4. Click **"Try it out"** to test the endpoint
5. Fill in the parameters and click **Execute**

### Using the API Programmatically

All API requests go to: `http://localhost:8000`

Protected endpoints require the header:
```
Authorization: Bearer <your_access_token>
```

---

## Creating a New User Account

### Step 1: Register

Make a POST request to `/api/v1/auth/register`:

```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "mypassword123",
    "daily_calorie_goal": 2000
  }'
```

**Or use the interactive docs:**
1. Expand `POST /api/v1/auth/register`
2. Click "Try it out"
3. Enter email, password, and daily calorie goal
4. Click "Execute"

### Step 2: Save Your User ID

The response includes your user ID (UUID). Keep this handy:

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "john@example.com",
  "daily_calorie_goal": 2000,
  "created_at": "2026-04-02T10:00:00",
  "updated_at": "2026-04-02T10:00:00"
}
```

---

## Logging In

### Get Your Access Token

Make a POST request to `/api/v1/auth/login`:

```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "mypassword123"
  }'
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Using the Token

Include the token in all protected requests:

```bash
curl -X GET "http://localhost:8000/api/v1/users/me" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**In the interactive docs:**
1. Click the **"Authorize"** button at the top
2. Enter your token in the `BearerAuth` field
3. Click "Authorize" - now all requests will include your token automatically

---

## Estimating Calories from Text

### The Endpoint

**POST** `/api/v1/meals/text`

### How It Works

1. You provide a natural language description of your meal
2. AI analyzes the text and extracts individual food items
3. The app searches the USDA database for nutritional data
4. If no match is found, AI estimates the nutritional values
5. The meal is saved to the database with calculated totals

### Example Request

```bash
curl -X POST "http://localhost:8000/api/v1/meals/text" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "meal_text": "2 eggs scrambled with cheese, 1 slice of toast with butter",
    "meal_type": "BREAKFAST"
  }'
```

### Meal Type Options

| Value | Description |
|-------|-------------|
| `BREAKFAST` | Morning meal |
| `LUNCH` | Mid-day meal |
| `DINNER` | Evening meal |
| `SNACK` | Snacks between meals |

### Example Responses

**With USDA Match:**
```json
{
  "items": [
    {
      "original_item": {
        "name": "scrambled eggs with cheese",
        "quantity": 2.0,
        "unit": "eggs",
        "estimated_weight_g": 100.0,
        "is_ai_estimated": false
      },
      "macros": {
        "calories": 180.0,
        "protein": 14.0,
        "carbs": 2.0,
        "fats": 13.0,
        "fdc_id": "fdc-171205"
      },
      "is_ai_estimated": false
    }
  ],
  "total_calories": 280.0,
  "total_protein": 16.0,
  "total_carbs": 24.0,
  "total_fats": 15.0
}
```

**With AI Estimation (No USDA Match):**
```json
{
  "items": [
    {
      "original_item": {
        "name": "homemade smoothie",
        "quantity": 1.0,
        "unit": "glass",
        "estimated_weight_g": 300.0,
        "is_ai_estimated": true
      },
      "macros": {
        "calories": 150.0,
        "protein": 5.0,
        "carbs": 30.0,
        "fats": 2.0,
        "fdc_id": null
      },
      "is_ai_estimated": true
    }
  ],
  "total_calories": 150.0,
  "total_protein": 5.0,
  "total_carbs": 30.0,
  "total_fats": 2.0
}
```

The `is_ai_estimated: true` flag indicates the nutritional values were estimated by AI because no exact match was found in the USDA database.

---

## Estimating Calories from Images

### The Endpoint

**POST** `/api/v1/meals/image`

### How It Works

1. Upload a photo of your meal
2. AI vision analyzes the image to identify food items
3. The app extracts food items and estimates portion sizes
4. Nutritional data is fetched from USDA or estimated by AI
5. The meal is saved with the image path

### Example Request (cURL)

```bash
curl -X POST "http://localhost:8000/api/v1/meals/image" \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/meal-photo.jpg" \
  -F "meal_type=LUNCH"
```

### Example Request (Python)

```python
import requests

url = "http://localhost:8000/api/v1/meals/image"
headers = {"Authorization": "Bearer <token>"}
files = {"file": open("meal-photo.jpg", "rb")}
data = {"meal_type": "LUNCH"}

response = requests.post(url, headers=headers, files=files, data=data)
print(response.json())
```

### Allowed File Types

- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- WebP (`.webp`)

### Image Storage

Uploaded images are saved to: `data/raw/`

---

## Viewing Your Meal History

### The Endpoint

**GET** `/api/v1/meals/date/{target_date}`

### Example

Get all meals for today:

```bash
curl -X GET "http://localhost:8000/api/v1/meals/date/2026-04-02" \
  -H "Authorization: Bearer <token>"
```

### Response

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
      "meal_type": "BREAKFAST",
      "logged_at": "2026-04-02T08:00:00"
    },
    {
      "id": "meal-uuid-2",
      "items": [...],
      "total_calories": 800.0,
      "total_protein": 50.0,
      "total_carbs": 80.0,
      "total_fats": 30.0,
      "raw_input_text": "Grilled chicken salad",
      "meal_type": "LUNCH",
      "logged_at": "2026-04-02T12:30:00"
    }
  ],
  "total_count": 2,
  "date": "2026-04-02"
}
```

---

## Understanding the Response Data

### Food Items

Each meal contains a list of `items` - individual food components:

| Field | Description |
|-------|-------------|
| `name` | Food item name (e.g., "eggs", "toast") |
| `quantity` | Amount (e.g., 2.0) |
| `unit` | Unit of measure (e.g., "slices", "pieces") |
| `estimated_weight_g` | AI-estimated weight in grams |
| `is_ai_estimated` | True if nutrition was AI-estimated (no USDA match) |

### Nutritional Macros

| Field | Description |
|-------|-------------|
| `calories` | Energy in kcal |
| `protein` | Protein in grams |
| `carbs` | Carbohydrates in grams |
| `fats` | Fats in grams |
| `fdc_id` | USDA FoodData Central ID (if matched) |

### Total Meal Macros

The `total_*` fields show the sum of all items in the meal:
- `total_calories`
- `total_protein`
- `total_carbs`
- `total_fats`

---

## Complete Workflow Example

### 1. Register a new user
```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email": "jane@example.com", "password": "securepass123"}'
```

### 2. Login to get token
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "jane@example.com", "password": "securepass123"}'
```
*Copy the `access_token` from the response*

### 3. Check your profile
```bash
curl -X GET "http://localhost:8000/api/v1/users/me" \
  -H "Authorization: Bearer <your_token>"
```

### 4. Log breakfast
```bash
curl -X POST "http://localhost:8000/api/v1/meals/text" \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"meal_text": "1 cup oatmeal with banana and honey", "meal_type": "BREAKFAST"}'
```

### 5. Log lunch with an image
```bash
curl -X POST "http://localhost:8000/api/v1/meals/image" \
  -H "Authorization: Bearer <your_token>" \
  -F "file=@salad.jpg" \
  -F "meal_type=LUNCH"
```

### 6. View today's meals
```bash
curl -X GET "http://localhost:8000/api/v1/meals/date/2026-04-02" \
  -H "Authorization: Bearer <your_token>"
```

---

## Tips for Better Results

### Writing Meal Descriptions

**Be specific:**
- ✅ "2 large eggs, 1 slice whole wheat toast with 1 tsp butter"
- ❌ "eggs and toast"

**Include amounts:**
- ✅ "150g grilled chicken breast"
- ❌ "chicken"

**Common units work well:**
- pieces, slices, cups, tablespoons, grams, ounces

### Taking Food Photos

- Use good lighting
- Take photos from above or at a 45-degree angle
- Include a reference object (fork, spoon) for scale
- Avoid blurry images

---

## Troubleshooting

### "401 Unauthorized"
- Your token may have expired - login again to get a new token
- Make sure you're including the `Authorization: Bearer <token>` header

### "400 Invalid file type"
- Only JPEG, PNG, and WebP images are allowed
- Check your file extension

### "500 Internal Server Error"
- Check the server logs for details
- The AI service or USDA API may be temporarily unavailable

### Empty meal items
- The AI couldn't identify food in the text/image
- Try being more specific in your descriptions