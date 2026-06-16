# AI Nutrition Logger - Application Context

## Overview

**AI Nutrition Logger** is an application that allows users to seamlessly log their meals by providing text descriptions or uploading photos of their food. The app analyzes this input to break down the meal into specific food items and quantities, fetches nutritional data from an external API, and provides comprehensive insights into the user's diet.

## Core Functionality

1. **Text & Image Input** - Users can type a description of what they ate or provide a file path to an image of their meal.
2. **AI-Powered Item Extraction** - A free AI model analyzes the input (text description or image) to extract individual food items and their specific quantities (e.g., "bread: 1 piece", "cheese: 2 slices").
3. **Nutritional API Integration** - The application uses a nutrition API to search for the extracted food items, passing along the specific identified quantities to get accurate data.
4. **Macro Fetching & Database Logging** - Nutritional macros (calories, protein, carbs, fats) are fetched from the API for each matched item and added to the application's Database for historical tracking.
5. **Results Display** - The detailed breakdown of food items, quantities, and their corresponding nutritional information is displayed to the user.
7. **Manual Macro Overrides** - Users have the power to manually adjust the total calories and macronutrients of any logged meal, allowing for corrections when AI estimations or API data are slightly off.
8. **AI Summaries** - The application generates AI-powered summaries of the user's nutritional intake for both the day and the week, offering personalized insights.

## Target Users

- Health-conscious individuals tracking their daily calorie and macronutrient intake.
- Fitness enthusiasts monitoring their nutrition precisely.
- Anyone wanting a fast, assisted logging experience without the hassle of manually searching for every single food ingredient.

## Technical Flow

```text
User provides a text description (or uploads an image)
        ↓
Input is sent to a free AI model for analysis
        ↓
AI extracts a list of food items and their specific quantities
(e.g., "egg: 2 large", "butter: 1 tablespoon")
        ↓
App searches a Nutrition API using the extracted items and quantities
        ↓
Macros and calorie data are fetched from the API
        ↓
Nutritional data is saved to the Database and displayed to the user
        ↓
AI periodically generates daily and weekly diet summaries
```

## Data Storage

- **Database**: Stores logged meals, extracted food items, quantities, and their macronutrient breakdowns. Image paths are also stored with each meal entry.
- **Raw images**: `data/raw/`
- **Processed data**: `data/processed/`
- **Logs**: `logs/`

## Future Considerations

- User authentication and multi-user support.
- Exporting nutritional data to external health and fitness platforms.
- Mobile companion application.