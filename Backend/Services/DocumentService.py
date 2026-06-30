# Handles Database operations for AI-generated documents
from models.Document import Document
from Database import db


class DocumentService:
    """
    Handles all database operations
    for AI-generated documents.
    """

    def CreateDocument(
        self,
        userId,
        jobId,
        documentType,
        title,
        content
    ):

        try:

            document = Document(

                userId=userId,

                jobId=jobId,

                documentType=documentType,

                title=title,

                content=content,

                version=1

            )

            db.session.add(document)
            db.session.commit()

            return {

                "success": True,
                "document": document.ToDictionary(),
                "error": None

            }

        except Exception as error:

            db.session.rollback()

            return {

                "success": False,
                "document": None,
                "error": str(error)

            }

    def GetDocument(self, documentId):

        document = Document.query.get(documentId)

        if document is None:

            return {

                "success": False,
                "document": None,
                "error": "Document not found."

            }

        return {

            "success": True,
            "document": document.ToDictionary(),
            "error": None

        }

    def GetDocumentsByJob(self, jobId):

        documents = Document.query.filter_by(
            jobId=jobId
        ).all()

        return {

            "success": True,

            "documents": [

                document.ToDictionary()

                for document in documents

            ]

        }

    def GetDocumentsByUser(self, userId):

        documents = Document.query.filter_by(
            userId=userId
        ).all()

        return {

            "success": True,

            "documents": [

                document.ToDictionary()

                for document in documents

            ]

        }

    def UpdateDocument(
        self,
        documentId,
        title,
        content
    ):

        document = Document.query.get(documentId)

        if document is None:

            return {

                "success": False,
                "error": "Document not found."

            }

        try:

            document.title = title

            document.content = content

            document.version += 1

            db.session.commit()

            return {

                "success": True,

                "document": document.ToDictionary(),

                "error": None

            }

        except Exception as error:

            db.session.rollback()

            return {

                "success": False,

                "error": str(error)

            }

    def DeleteDocument(self, documentId):

        document = Document.query.get(documentId)

        if document is None:

            return {

                "success": False,
                "error": "Document not found."

            }

        try:

            db.session.delete(document)

            db.session.commit()

            return {

                "success": True,
                "error": None

            }

        except Exception as error:

            db.session.rollback()

            return {

                "success": False,

                "error": str(error)

            }