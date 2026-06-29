from Services.PromptBuilder import PromptBuilder

builder = PromptBuilder()

prompt = builder.BuildResumePrompt(
    profile="John Smith",
    experience="Software Engineer at Google",
    education="BS Computer Science",
    skills="Python, Flask, PostgreSQL",
    job="Backend Developer"
)

print(prompt)