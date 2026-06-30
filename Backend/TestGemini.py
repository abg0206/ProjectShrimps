from Services.GeminiService import GeminiService

service = GeminiService()

response = service.GenerateResume(
    "Write a one sentence resume for a software engineer."
)

print(response)