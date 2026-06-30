class Job(db.Model):

    __tablename__ = "Job"

    jobId = db.Column(...)
    company = db.Column(...)
    title = db.Column(...)
    description = db.Column(...)