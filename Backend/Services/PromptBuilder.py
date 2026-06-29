# Builds prompts fromtemplate files in the prompts folder
from pathlib import Path


class PromptBuilder:

    def __init__(self):

        self.promptDirectory = Path("Prompts")

    def LoadTemplate(self, templateName):

        """
        Loads a prompt template from the Prompts folder.
        """

        templatePath = self.promptDirectory / templateName

        try:

            with open(templatePath, "r", encoding="utf-8") as file:

                return file.read()

        except FileNotFoundError:

            raise Exception(
                f"Prompt template '{templateName}' was not found."
            )

    def ReplaceVariables(self, template, variables):

        """
        Replaces placeholders inside a prompt template.

        Example:

        {{profile}}
        """

        completedPrompt = template

        for key, value in variables.items():

            completedPrompt = completedPrompt.replace(
                f"{{{{{key}}}}}",
                str(value)
            )

        return completedPrompt

    def BuildPrompt(self, templateName, variables):

        """
        Loads a template and fills in all placeholders.
        """

        template = self.LoadTemplate(templateName)

        return self.ReplaceVariables(
            template,
            variables
        )

    def BuildResumePrompt(
        self,
        profile,
        experience,
        education,
        skills,
        job
    ):

        variables = {

            "profile": profile,
            "experience": experience,
            "education": education,
            "skills": skills,
            "job": job

        }

        return self.BuildPrompt(
            "Resume.txt",
            variables
        )

    def BuildCoverLetterPrompt(
        self,
        profile,
        experience,
        education,
        skills,
        job
    ):

        variables = {

            "profile": profile,
            "experience": experience,
            "education": education,
            "skills": skills,
            "job": job

        }

        return self.BuildPrompt(
            "CoverLetter.txt",
            variables
        )

    def BuildRewritePrompt(
        self,
        documentType,
        rewriteType,
        content,
        job
    ):

        variables = {

            "documentType": documentType,
            "rewriteType": rewriteType,
            "content": content,
            "job": job

        }

        return self.BuildPrompt(
            "Rewrite.txt",
            variables
        )