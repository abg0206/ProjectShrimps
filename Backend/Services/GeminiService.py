from google import genai
from google.genai import types

from Config import Config


class GeminiService:

    def __init__(self):

        self.client = genai.Client(
            api_key=Config.GEMINI_API_KEY
        )

        self.modelName = "gemini-2.5-flash"

    def GenerateContent(self, prompt):


        try:

            response = self.client.models.generate_content(
                model=self.modelName,
                contents=prompt
            )

            return {
                "success": True,
                "content": response.text,
                "error": None
            }

        except Exception as error:

            return {
                "success": False,
                "content": None,
                "error": str(error)
            }

    def GenerateResume(self, prompt):


        return self.GenerateContent(prompt)

    def GenerateCoverLetter(self, prompt):


        return self.GenerateContent(prompt)

    def RewriteDocument(self, prompt):

        return self.GenerateContent(prompt)

    def TestConnection(self):


        try:

            response = self.client.models.generate_content(
                model=self.modelName,
                contents="Reply with the word Connected."
            )

            return {
                "success": True,
                "message": response.text
            }

        except Exception as error:

            return {
                "success": False,
                "message": str(error)
            }