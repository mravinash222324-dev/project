# In ai_microservice/main.py

from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline
import uvicorn

print("Loading AI models into memory...")

# --- Load Model at Startup ---
# We load this model *once* when the server starts.
# "aggregation_strategy=simple" groups words like "machine" and "learning" 
# into a single tag: "machine learning".
try:
    keyword_extractor = pipeline(
        "token-classification", 
        model="ml6team/keyphrase-extraction-distilbert-inspec", 
        aggregation_strategy="simple"
    )
    print("Keyword extraction model loaded successfully.")
except Exception as e:
    print(f"Error loading keyword model: {e}")
    keyword_extractor = None

# Initialize FastAPI app
app = FastAPI()

# Define the input data model
class TextIn(BaseModel):
    text: str

# --- Define API Endpoints ---

@app.get("/")
def read_root():
    return {"status": "AI Microservice is running."}

@app.post("/extract-keywords")
def extract_keywords(data: TextIn):
    if not keyword_extractor:
        return {"error": "Keyword model is not available."}

    try:
        # Run the model
        keywords = keyword_extractor(data.text)

        # Process the result to get a clean list of strings
        # The model returns dicts like: {'entity_group': 'KEY', 'word': '...', ...}
        keyword_list = [k['word'] for k in keywords]

        return {"keywords": keyword_list}

    except Exception as e:
        return {"error": f"Failed to extract keywords: {str(e)}"}

if __name__ == "__main__":
    print("Starting FastAPI server on http://127.0.0.1:8001")
    uvicorn.run(app, host="127.0.0.1", port=8001)