import google.generativeai as genai
from sentence_transformers import SentenceTransformer, util
from django.conf import settings
import whisper
import re
import numpy as np
import torch

# Create a global instance of the analyzer
analyzer = None

class ProjectAnalyzer:
    def __init__(self):
        # Configure the Gemini API (FOR ALL LOGIC)
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.llm_model = genai.GenerativeModel("gemini-2.0-flash") 

        # LOCAL EMBEDDING MODEL: Retained only to satisfy model field but not used for comparison
        self.embedding_model = SentenceTransformer('all-mpnet-base-v2')  
        
    def get_embedding(self, text):
        """Generates a vector embedding using the local SBERT model (Free)."""
        # Returns a Python list.
        return self.embedding_model.encode(text, convert_to_tensor=True).tolist()

    def check_plagiarism_and_suggest_features(self, title, abstract, existing_submissions):
        """
        AI Gatekeeper: Performs semantic similarity check and reliably identifies the most similar project using an index.
        """
        highest_similarity = 0.0
        most_similar_project = None

        if existing_submissions:
            # Create a numbered list of abstracts for the AI to reference
            numbered_abstracts = ""
            for i, sub in enumerate(existing_submissions):
                numbered_abstracts += f"{i}: \"{sub['abstract_text']}\"\n---\n"

            similarity_prompt = f"""
            You are a semantic analysis engine. A new project idea has been submitted.

            **NEW IDEA:** "{abstract}"

            **ARCHIVED IDEAS (Numbered List):**
            {numbered_abstracts}

            Your tasks are:
            1. Calculate the conceptual similarity score between the NEW IDEA and EACH of the ARCHIVED IDEAS.
            2. Identify the single project from the numbered list that is MOST similar.

            Respond with two things on a single line, separated by a pipe:
            1. The single highest similarity SCORE you found (e.g., 0.92).
            2. The INDEX number of the most similar abstract from the list above.

            Format your response EXACTLY like this: SCORE: [highest_score] | INDEX: [number]
            """
            
            try:
                response = self.llm_model.generate_content(similarity_prompt)
                
                # Robust parsing for the new format
                score_match = re.search(r"SCORE:\s*(\d+\.\d+)", response.text)
                index_match = re.search(r"INDEX:\s*(\d+)", response.text)

                if score_match:
                    highest_similarity = float(score_match.group(1))
                
                if index_match:
                    similar_project_index = int(index_match.group(1))
                    # Use the index to reliably get the project details
                    if 0 <= similar_project_index < len(existing_submissions):
                        similar_sub = existing_submissions[similar_project_index]
                        most_similar_project = {
                            'title': similar_sub['title'],
                            'student': similar_sub['student__username'],
                            'abstract_text': similar_sub['abstract_text']
                        }

            except Exception as e:
                print(f"Error during AI similarity check: {e}")
                highest_similarity = 0.0
                most_similar_project = None

        # Step 2: Proceed with scoring and suggestion logic
        if highest_similarity > 0.60:
            originality_status = "BLOCKED_HIGH_SIMILARITY"
            suggestion_prompt = f"The project '{title}' is **too similar** to existing college projects (Similarity Score: {highest_similarity:.2f}). Generate 5-6 new, unique features or architectural pivots to fully differentiate this project and make it original."
        else:
            originality_status = "ORIGINAL_PASSED"
            suggestion_prompt = f"The project idea '{title}' is original. Generate 5 suggestions for **non-essential, advanced features** to enhance its innovation and scope."
            
        analysis_prompt = f"""
        You are a college professor analyzing a project idea. Provide scores and the final analysis.
        Project Title: {title}
        Abstract: {abstract}
        Originality Check: {originality_status}. Similarity Score: {highest_similarity:.2f}
        
        Based on the above context, provide the final analysis:
        
        1. **SCORES (Rate 1-10):**
           - Relevance: [Score]
           - Feasibility: [Score]
           - Innovation: [Score]
           
        2. **SUGGESTIONS:** {suggestion_prompt}
        
        Note: If any score is 0.0, the analysis must state why.
        """
        
        try:
            final_response = self.llm_model.generate_content(analysis_prompt)
            final_text = final_response.text.strip()
            
            relevance_match = re.search(r"[Rr]elevance.*:\s*(\d+(\.\d+)?)", final_text)
            feasibility_match = re.search(r"[Ff]easibility.*:\s*(\d+(\.\d+)?)", final_text)
            innovation_match = re.search(r"[Ii]nnovation.*:\s*(\d+(\.\d+)?)", final_text)
            
            return {
                "originality_status": originality_status,
                "similarity_score": highest_similarity,
                "relevance": float(relevance_match.group(1)) if relevance_match else 0.0,
                "feasibility": float(feasibility_match.group(1)) if feasibility_match else 0.0,
                "innovation": float(innovation_match.group(1)) if innovation_match else 0.0,
                "full_report": final_text,
                "most_similar_project": most_similar_project
            }
        except Exception as e:
            return {
                "originality_status": "API_FAIL",
                "similarity_score": highest_similarity,
                "relevance": 0.0, "feasibility": 0.0, "innovation": 0.0,
                "full_report": f"AI analysis failed during final scoring. Error: {e}",
                "most_similar_project": most_similar_project
            }


    def transcribe_audio(self, audio_file_path):
        """Transcribes an audio file into text using the local Whisper model."""
        try:
            whisper_model = whisper.load_model("tiny")
            result = whisper_model.transcribe(audio_file_path)
            return result["text"]
        except Exception as e:
            print(f"Error during audio transcription: {e}")
            return None

    def find_similar_ideas(self, new_embedding, existing_embeddings, threshold=0.85):
        """Compares a new idea to existing ones using embeddings (still available if needed)."""
        similarities = util.cos_sim(new_embedding, existing_embeddings)[0]
        duplicate_indices = [i for i, score in enumerate(similarities) if score > threshold]
        return duplicate_indices

    def get_chat_response(self, prompt, context="", conversation_history=[]):
        """
        Generates a chat response using the Gemini API, now with a clear persona and instructions.
        """
        
        full_prompt = ""

        # Construct a rich prompt with context if available
        if context:
            full_prompt = f"""
            Your Name is Kali You are a helpful AI assistant for a college professor.
            Your role is to answer questions about a specific project based ONLY on the context provided below.
            Answer in a natural, conversational, and helpful manner. 
            Do NOT return raw JSON or Markdown.

            ---
            SYSTEM CONTEXT (Project Database):
            {context}
            ---

            USER QUESTION:
            {prompt}
            """
        else:
            # General prompt if no context is found (for the student's general chat)
            full_prompt = f"""
            You are a helpful AI technical assistant for a college student. 
            Answer the user's question in a conversational and helpful manner.

            USER QUESTION:
            {prompt}
            """

        try:
            # We'll use a fresh chat session for each inquiry
            chat_session = self.llm_model.start_chat(history=conversation_history)
            response = chat_session.send_message(full_prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Error during Gemini API call: {e}")
            return "Sorry, I am currently unable to access the project details right now. Please try again later."
        
    def analyze_idea(self, title, abstract):
        """Analyzes an idea using the Gemini API."""
        prompt = f"""
        Analyze the following project idea for a college project.
        Title: {title}
        Abstract: {abstract}
        
        Provide a detailed analysis including:
        - Relevance (1-10)
        - Feasibility (1-10)
        - Innovation (1-10)
        """
        try:
            response = self.llm_model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Error during Gemini API call: {e}")
            return "Failed to analyze the project."

    def generate_viva_questions(self, title, abstract, progress_percentage, latest_update_text=None):
        """
        Generates 5 viva questions.
        - Questions are simpler and more direct.
        - Questions are NOW based on the student's LATEST text update.
        - Uses a more robust newline-based parsing method.
        """
        
        # Start building the prompt for the AI
        prompt = f"""
        You are a helpful and encouraging college professor. Your goal is to check a student's understanding.
        Ask 5 simple, direct questions. Do not ask extremely complex, deeply technical "gotcha" questions.
        Keep the questions short and clear, like a real teacher would.

        Here is the project information:
        [PROJECT ABSTRACT]: "{abstract}"
        [CURRENT OVERALL PROGRESS]: {progress_percentage}%
        """

        # If we have the student's latest text update, add it to the prompt
        if latest_update_text:
            prompt += f"""
        The student *just* submitted this progress log:
        [LATEST UPDATE]: "{latest_update_text}"
        
        **IMPORTANT: Base your questions *directly* on the student's LATEST UPDATE.**
        For example, if the update says "finished login," ask "What technology did you use for the login?"
        If the update says "deployed to Vercel," ask "Why did you choose Vercel?"
        """
        else:
            # If there's no text update, fall back to the old logic
            prompt += f"""
            **IMPORTANT: The student has not provided a text update, so ask *general* questions based on their progress percentage.**
            """
        
        # This part remains to guide the *topic* of the questions
        prompt += "\n[QUESTION TOPIC FOCUS]:\n"
        
        if progress_percentage <= 30:
            prompt += "Focus on: Project idea, feasibility, and planned technology stack. (e.g., 'What is the main goal of your project?')"
        elif progress_percentage <= 60:
            prompt += "Focus on: Core implementation, database structure, and any problems faced. (e.g., 'What was the hardest part you've built so far?')"
        else:
            prompt += "Focus on: Testing, optimization, and final features. (e.g., 'How are you testing your code?')"
            
        # --- (NEW, SIMPLER INSTRUCTION) ---
        prompt += """
        
        Return ONLY the 5 questions, each on a new line.
        Do not add numbers, bullet points, conversational text, or JSON formatting.
        
        Example of a perfect response:
        What is the main goal of your project?
        How did you implement the login feature?
        Why did you choose this database?
        What was your biggest challenge this week?
        What is your next step?
        """
        
        try:
            response = self.llm_model.generate_content(prompt)
            final_text = response.text.strip()
            
            # --- (NEW PARSING LOGIC) ---
            # Split by newline and clean up
            questions_list = []
            for line in final_text.split('\n'):
                # Clean up line, remove potential numbering/bullets
                cleaned_line = re.sub(r'^\s*(\d+\.|-|\*)\s*', '', line).strip()
                
                # Make sure it's a real question
                if cleaned_line and len(cleaned_line) > 10:
                    questions_list.append(cleaned_line)

            # Check if we got anything
            if not questions_list or len(questions_list) < 3:
                # If parsing fails, fall back
                raise ValueError("AI response was not in the expected format or had too few questions.")

            return questions_list[:5] # Return max 5 questions

        except Exception as e:
            print(f"Error generating viva questions: {e}")
            # Return simple fallback questions on error
            return ["What is the main goal of your project?", "What progress have you made so far?", "What challenges have you faced?", "What is your plan for the next step?", "What technologies are you using?"]

    def evaluate_viva_answer(self, question, answer, abstract):
        """Evaluates a student's viva answer using Gemini API."""
        if answer.strip() == question.strip():
            return {"score": "0/10", "feedback": "Your answer is just the question repeated."}

        prompt = f"""
        Project Abstract: {abstract}
        Question: {question}
        Answer: {answer}

        Evaluate the answer (Score out of 10) and give feedback:
        """
        try:
            response = self.llm_model.generate_content(prompt)
            evaluation_text = response.text.strip()
            score_match = re.search(r"Score:\s*(\d+(\.\d+)?)\s*/10", evaluation_text)
            feedback_match = re.search(r"Feedback:([\s\S]*)", evaluation_text)

            score = score_match.group(1).strip() if score_match else 'N/A'
            feedback = feedback_match.group(1).strip().strip('**') if feedback_match else 'No feedback provided.'
            
            return {"score": score, "feedback": feedback}
        except Exception as e:
            print(f"Error during Gemini API call: {e}")
            return {"score": "N/A", "feedback": "Failed to evaluate the answer."}
    def analyze_progress_update(self, project_abstract, update_text):
        """
        Analyzes a student's text update against the project abstract
        to determine a new total progress percentage.
        """
        prompt = f"""
        You are a strict college project evaluator.
        
        A student's project goal is defined by this abstract:
        ---
        [PROJECT ABSTRACT]: "{project_abstract}"
        ---
        
        The student has just submitted this progress update:
        ---
        [PROGRESS UPDATE]: "{update_text}"
        ---
        
        Based *only* on the student's update, analyze how much of the *total* project (as described in the abstract) is now complete.
        
        Respond with ONLY an integer number (0-100) representing the new total estimated progress percentage.
        
        Example response:
        25
        """
        
        try:
            response = self.llm_model.generate_content(prompt)
            final_text = response.text.strip()
            
            # Find the first number in the response
            match = re.search(r"(\d+)", final_text)
            
            if match:
                percentage = int(match.group(1))
                return max(0, min(100, percentage)) # Clamp value between 0-100
            else:
                return 0 # Default if AI fails to return a number
                
        except Exception as e:
            print(f"Error during progress analysis: {e}")
            return 0

# Create a single instance
analyzer = ProjectAnalyzer()
