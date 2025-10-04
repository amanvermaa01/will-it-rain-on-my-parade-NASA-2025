import os
import json
import logging
from typing import List, Any, Dict, Optional
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WeatherRecommendation:
    """Simple container for weather recommendation results.

    This avoids requiring pydantic at import time. We keep a minimal structure
    and provide a to_dict() helper for compatibility.
    """
    def __init__(self, summary: str, detailed_forecast: str, precautions: List[str], confidence_level: str):
        self.summary = summary
        self.detailed_forecast = detailed_forecast
        self.precautions = precautions
        self.confidence_level = confidence_level

    def to_dict(self):
        return {
            "summary": self.summary,
            "detailed_forecast": self.detailed_forecast,
            "precautions": self.precautions,
            "confidence_level": self.confidence_level,
        }

class OpenRouterClient:
    """Lightweight client for the OpenRouter API (no langchain dependency).

    Sends a chat completion request and returns the assistant text.
    """
    def __init__(self, api_key: Optional[str], model: str = "deepseek/deepseek-chat-v3.1:free", temperature: float = 0.7):
        self.api_key = api_key
        self.model = model
        self.temperature = temperature

    def chat(self, prompt: str) -> str:
        if not self.api_key:
            raise RuntimeError("OpenRouter API key not provided")

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        data = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": self.temperature
        }

        resp = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=data, timeout=60)
        try:
            resp.raise_for_status()
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"OpenRouter API request failed: {e} - {resp.text if resp is not None else ''}")

        data = resp.json()
        # Expect the assistant message in choices[0].message.content
        try:
            return data["choices"][0]["message"]["content"]
        except Exception:
            # Fallback: return raw text if structure unexpected
            return json.dumps(data)

class GenAIWeatherForecaster:
    """Class to handle GenAI-powered weather forecasting."""
    
    def __init__(self, api_key=None, model_name=None):
        """Initialize the forecaster with API key and model."""
        self.api_key = api_key or os.environ.get("OPENROUTER_API_KEY")
        self.model_name = model_name or os.environ.get("GENAI_MODEL_NAME", "deepseek/deepseek-chat-v3.1:free")
        
        if not self.api_key:
            logger.warning("No OpenRouter API key provided. Set OPENROUTER_API_KEY environment variable or pass api_key parameter. GenAI calls will fail without a valid key.")
        
        # Initialize lightweight OpenRouter client
        self.client = OpenRouterClient(api_key=self.api_key, model=self.model_name, temperature=0.7)

        # Prompt template (we'll format manually)
        self.prompt_template = (
            "You are an expert meteorologist and weather forecaster. Analyze the following weather data and generate a JSON object with keys: summary (string), detailed_forecast (string), precautions (array of strings), confidence_level (high|medium|low).\n\n"
            "HISTORICAL WEATHER DATA:\n{historical_data}\n\n"
            "FORECAST WEATHER DATA:\n{forecast_data}\n\n"
            "LOCATION: Latitude: {latitude}, Longitude: {longitude}\n\n"
            "DATE OF INTEREST: {date}\n\n"
            "Provide the response strictly as a JSON object. Avoid additional commentary.\n"
        )
    
    def generate_forecast(self, historical_data, forecast_data, latitude, longitude, date):
        """Generate a weather forecast with recommendations."""
        try:
            # Format the data for the prompt
            historical_data_str = json.dumps(historical_data, indent=2)
            forecast_data_str = json.dumps(forecast_data, indent=2)
            prompt = self.prompt_template.format(
                historical_data=historical_data_str,
                forecast_data=forecast_data_str,
                latitude=latitude,
                longitude=longitude,
                date=date
            )

            # Call OpenRouter
            resp_text = self.client.chat(prompt)

            # Try to parse JSON from model output
            try:
                parsed = json.loads(resp_text)
                # Validate expected keys
                if all(k in parsed for k in ("summary", "detailed_forecast", "precautions", "confidence_level")):
                    return parsed
                else:
                    # If keys missing, wrap into fallback
                    return {
                        "summary": parsed.get("summary", ""),
                        "detailed_forecast": parsed.get("detailed_forecast", str(parsed)),
                        "precautions": parsed.get("precautions", []),
                        "confidence_level": parsed.get("confidence_level", "low")
                    }
            except Exception:
                # Attempt to extract JSON substring
                try:
                    start = resp_text.find('{')
                    end = resp_text.rfind('}')
                    if start != -1 and end != -1 and end > start:
                        candidate = resp_text[start:end+1]
                        parsed = json.loads(candidate)
                        return parsed
                except Exception:
                    pass

            # Fallback simple response
            return {
                "summary": "Unable to parse model response.",
                "detailed_forecast": resp_text,
                "precautions": ["Refer to other weather services."],
                "confidence_level": "low"
            }
            
        except Exception as e:
            logger.error(f"Error generating forecast: {str(e)}")
            # Provide a fallback response if the AI fails
            return {
                "summary": "Unable to generate forecast at this time.",
                "detailed_forecast": "There was an error processing the weather data. Please try again later.",
                "precautions": ["Consider checking other weather sources for now."],
                "confidence_level": "low"
            }