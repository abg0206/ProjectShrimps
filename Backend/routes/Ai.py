from flask import Blueprint
from flask import jsonify
from flask import request

from Models.User import User
from Models.Job import Job

from Services.GeminiService import GeminiService
from Services.PromptBuilder import PromptBuilder


aiBlueprint = Blueprint(
    "Ai",
    __name__
)

geminiService = GeminiService()

promptBuilder = PromptBuilder()


@aiBlueprint.route("/resume", methods=["POST"])
def GenerateResume():

    data = request.get_json()

    if data is None:

        return jsonify({

            "success": False,

            "error": "Request body is missing."

        }), 400

    userId = data.get("userId")
    jobId = data.get("jobId")

    if userId is None or jobId is None:

        return jsonify({

            "success": False,

            "error": "userId and jobId are required."

        }), 400

    user = User.query.get(userId)

    job = Job.query.get(jobId)

    if user is None:

        return jsonify({

            "success": False,

            "error": "User not found."

        }), 404

    if job is None:

        return jsonify({

            "success": False,

            "error": "Job not found."

        }), 404

    #
    # Replace these with your actual database fields
    #

    profile = user.profile

    experience = user.experience

    education = user.education

    skills = user.skills

    jobDescription = job.description

    prompt = promptBuilder.BuildResumePrompt(

        profile,

        experience,

        education,

        skills,

        jobDescription

    )

    result = geminiService.GenerateResume(prompt)

    return jsonify(result)


@aiBlueprint.route("/coverletter", methods=["POST"])
def GenerateCoverLetter():

    data = request.get_json()

    if data is None:

        return jsonify({

            "success": False,

            "error": "Request body is missing."

        }), 400

    userId = data.get("userId")
    jobId = data.get("jobId")

    user = User.query.get(userId)

    job = Job.query.get(jobId)

    if user is None or job is None:

        return jsonify({

            "success": False,

            "error": "User or Job not found."

        }), 404

    profile = user.profile

    experience = user.experience

    education = user.education

    skills = user.skills

    jobDescription = job.description

    prompt = promptBuilder.BuildCoverLetterPrompt(

        profile,

        experience,

        education,

        skills,

        jobDescription

    )

    result = geminiService.GenerateCoverLetter(prompt)

    return jsonify(result)


@aiBlueprint.route("/rewrite", methods=["POST"])
def RewriteDocument():

    data = request.get_json()

    if data is None:

        return jsonify({

            "success": False,

            "error": "Request body is missing."

        }), 400

    prompt = promptBuilder.BuildRewritePrompt(

        documentType=data.get("documentType"),

        rewriteType=data.get("rewriteType"),

        content=data.get("content"),

        job=data.get("job", "")

    )

    result = geminiService.RewriteDocument(prompt)

    return jsonify(result)