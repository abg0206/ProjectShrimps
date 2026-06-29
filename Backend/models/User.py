class User(db.Model):

    __tablename__ = "User"

    userId = db.Column(...)
    firstName = db.Column(...)
    lastName = db.Column(...)
    email = db.Column(...)