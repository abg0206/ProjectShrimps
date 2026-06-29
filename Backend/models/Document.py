class Document(db.Model):

    __tablename__ = "Document"

    documentId
    userId
    jobId
    documentType
    title
    content
    version
    createdAt
    updatedAt