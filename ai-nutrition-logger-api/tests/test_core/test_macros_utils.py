"""Tests for shared macro calculation helpers."""

import pytest
from src.core.macros_utils import scale_macros, calculate_totals, build_db_items
from src.models.nutrition_models import (
    ProcessedFoodItem,
    ProcessedMeal,
    FoodMacros,
    ExtractedFoodItem,
)


class TestScaleMacros:
    def test_scale_to_50g(self):
        per_100g = FoodMacros(calories=100, protein=10, carbs=20, fats=2)
        result = scale_macros(per_100g, 50)
        assert result.calories == 50.0
        assert result.protein == 5.0
        assert result.carbs == 10.0
        assert result.fats == 1.0

    def test_scale_to_100g_no_change(self):
        per_100g = FoodMacros(calories=100, protein=10, carbs=20, fats=2)
        result = scale_macros(per_100g, 100)
        assert result.calories == 100.0
        assert result.protein == 10.0
        assert result.carbs == 20.0
        assert result.fats == 2.0

    def test_scale_to_250g(self):
        per_100g = FoodMacros(calories=100, protein=10, carbs=20, fats=2)
        result = scale_macros(per_100g, 250)
        assert result.calories == 250.0
        assert result.protein == 25.0
        assert result.carbs == 50.0
        assert result.fats == 5.0

    def test_preserves_fdc_id(self):
        per_100g = FoodMacros(calories=100, protein=10, carbs=20, fats=2, fdc_id="12345")
        result = scale_macros(per_100g, 50)
        assert result.fdc_id == "12345"

    def test_zero_weight(self):
        per_100g = FoodMacros(calories=100, protein=10, carbs=20, fats=2)
        result = scale_macros(per_100g, 0)
        assert result.calories == 0.0
        assert result.protein == 0.0


class TestCalculateTotals:
    def test_empty_list(self):
        result = calculate_totals([])
        assert result.calories == 0
        assert result.protein == 0
        assert result.carbs == 0
        assert result.fats == 0

    def test_single_item(self):
        item = _make_processed_item(calories=200, protein=20, carbs=30, fats=10)
        result = calculate_totals([item])
        assert result.calories == 200
        assert result.protein == 20
        assert result.carbs == 30
        assert result.fats == 10

    def test_multiple_items(self):
        items = [
            _make_processed_item(calories=100, protein=10, carbs=20, fats=1),
            _make_processed_item(calories=200, protein=25, carbs=5, fats=15),
        ]
        result = calculate_totals(items)
        assert result.calories == 300
        assert result.protein == 35
        assert result.carbs == 25
        assert result.fats == 16


class TestBuildDbItems:
    def test_builds_correct_dicts(self):
        item = _make_processed_item(calories=150, protein=15, carbs=10, fats=8)
        db_items = build_db_items(
            ProcessedMeal(items=[item], total_calories=150, total_protein=15,
                          total_carbs=10, total_fats=8, raw_input_text="egg")
        )
        assert len(db_items) == 1
        assert db_items[0]["original_name"] == "egg"
        assert db_items[0]["quantity"] == 2.0
        assert db_items[0]["unit"] == "pieces"
        assert db_items[0]["calories"] == 150.0
        assert db_items[0]["protein"] == 15.0
        assert db_items[0]["carbs"] == 10.0
        assert db_items[0]["fats"] == 8.0

    def test_empty_meal(self):
        db_items = build_db_items(
            ProcessedMeal(items=[], total_calories=0, total_protein=0,
                          total_carbs=0, total_fats=0, raw_input_text="")
        )
        assert db_items == []


def _make_processed_item(calories, protein, carbs, fats) -> ProcessedFoodItem:
    """Helper to create a ProcessedFoodItem test fixture."""
    return ProcessedFoodItem(
        original_item=ExtractedFoodItem(
            name="egg", quantity=2.0, unit="pieces", estimated_weight_g=100.0
        ),
        macros=FoodMacros(calories=calories, protein=protein, carbs=carbs, fats=fats),
        is_ai_estimated=False,
    )
