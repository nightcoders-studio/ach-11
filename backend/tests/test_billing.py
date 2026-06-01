# tests/test_billing.py
import pytest
from app.services.billing import calculate_cost

def test_calculate_cost_gemini_flash():
    # Model: gemini/gemini-1.5-flash
    # input_price_per_1k = 0.000075, output_price_per_1k = 0.000300, markup = 1.20
    pricing = {
        "model_id": "gemini/gemini-1.5-flash",
        "input_price_per_1k": 0.000075,
        "output_price_per_1k": 0.000300,
        "markup_rate": 1.20,
        "provider": "google"
    }

    cost_usd, cost_deducted = calculate_cost(pricing, prompt_tokens=1000, completion_tokens=500)
    # (1000 / 1000 * 0.000075) + (500 / 1000 * 0.000300) = 0.000075 + 0.000150 = 0.000225 USD
    assert cost_usd == pytest.approx(0.000225)
    # 0.000225 * 1.20 = 0.000270 USD
    assert cost_deducted == pytest.approx(0.000270)

def test_calculate_cost_zero_tokens():
    pricing = {
        "model_id": "openai/gpt-3.5-turbo",
        "input_price_per_1k": 0.000500,
        "output_price_per_1k": 0.001500,
        "markup_rate": 1.20,
        "provider": "openai"
    }
    cost_usd, cost_deducted = calculate_cost(pricing, prompt_tokens=0, completion_tokens=0)
    assert cost_usd == 0.0
    assert cost_deducted == 0.0
