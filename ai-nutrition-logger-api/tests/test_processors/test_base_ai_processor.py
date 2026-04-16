"""Tests for base AI processor shared utilities."""

import pytest
from src.processors.base_ai_processor import BaseAIProcessor
from src.models.nutrition_models import FoodMacros


class TestParseJsonResponse:
    def test_clean_json(self):
        text = '{"calories": 100, "protein": 10, "carbs": 5, "fats": 2}'
        result = BaseAIProcessor._parse_json_response(text)
        assert result == {"calories": 100, "protein": 10, "carbs": 5, "fats": 2}

    def test_strip_markdown_code_block(self):
        text = '```json\n{"calories": 100}\n```'
        result = BaseAIProcessor._parse_json_response(text)
        assert result == {"calories": 100}

    def test_strip_code_block_no_language(self):
        text = '```\n{"calories": 200}\n```'
        result = BaseAIProcessor._parse_json_response(text)
        assert result == {"calories": 200}

    def test_invalid_json_raises_error(self):
        with pytest.raises(Exception):
            BaseAIProcessor._parse_json_response("not json at all")


class TestNoApiKey:
    def test_init_without_key_sets_no_client(self, monkeypatch):
        monkeypatch.setenv("GOOGLE_API_KEY", "")
        processor = BaseAIProcessor(api_key=None)
        assert processor.client is None
        assert not processor.api_key

    def test_estimate_without_client_returns_zeros(self, monkeypatch):
        monkeypatch.setenv("GOOGLE_API_KEY", "")
        processor = BaseAIProcessor(api_key=None)
        result = processor.estimate_nutrition_text("apple", 100.0)
        assert isinstance(result, FoodMacros)
        assert result.calories == 0
        assert result.protein == 0
        assert result.carbs == 0
        assert result.fats == 0
