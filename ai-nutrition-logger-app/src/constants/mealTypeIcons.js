export const MEAL_TYPE_ICONS = {
  BREAKFAST: 'wb_sunny',
  LUNCH: 'lunch_dining',
  DINNER: 'dinner_dining',
  SNACK: 'cookie',
  OTHER: 'more_horiz'
};

export const getMealIcon = (type) => {
  const upperType = type?.toUpperCase();
  return MEAL_TYPE_ICONS[upperType] || 'restaurant';
};
