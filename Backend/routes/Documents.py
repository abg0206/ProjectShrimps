from flask import Blueprint
from flask import jsonify
from flask import request

from Services.DocumentService import DocumentService


documentsBlueprint = Blueprint(

    "Documents",

    __name__

)

documentService = DocumentService()


@documentsBlueprint.route("/", methods=["POST"])
def CreateDocument():

    data = request.get_json()

    result = documentService.CreateDocument(

        userId=data.get("userId"),

        jobId=data.get("jobId"),

        documentType=data.get("documentType"),

        title=data.get("title"),

        content=data.get("content")

    )

    if result["success"]:

        return jsonify(result), 201

    return jsonify(result), 400


@documentsBlueprint.route("/<int:documentId>", methods=["GET"])
def GetDocument(documentId):

    result = documentService.GetDocument(documentId)

    if result["success"]:

        return jsonify(result)

    return jsonify(result), 404


@documentsBlueprint.route("/job/<int:jobId>", methods=["GET"])
def GetDocumentsByJob(jobId):

    result = documentService.GetDocumentsByJob(jobId)

    return jsonify(result)


@documentsBlueprint.route("/user/<int:userId>", methods=["GET"])
def GetDocumentsByUser(userId):

    result = documentService.GetDocumentsByUser(userId)

    return jsonify(result)


@documentsBlueprint.route("/<int:documentId>", methods=["PUT"])
def UpdateDocument(documentId):

    data = request.get_json()

    result = documentService.UpdateDocument(

        documentId=documentId,

        title=data.get("title"),

        content=data.get("content")

    )

    if result["success"]:

        return jsonify(result)

    return jsonify(result), 404


@documentsBlueprint.route("/<int:documentId>", methods=["DELETE"])
def DeleteDocument(documentId):

    result = documentService.DeleteDocument(documentId)

    if result["success"]:

        return jsonify(result)

    return jsonify(result), 404