from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

from Config import Config

db = SQLAlchemy()


def CreateApp():

    app = Flask(__name__)

    app.config["SQLALCHEMY_DATABASE_URI"] = Config.databaseUri
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = (
        Config.sqlAlchemyTrackModifications
    )

    CORS(app)

    db.init_app(app)

    # Register Blueprints
    #
    # from Routes.Ai import aiBlueprint
    # from Routes.Documents import documentsBlueprint
    #
    # app.register_blueprint(aiBlueprint, url_prefix="/api/ai")
    # app.register_blueprint(documentsBlueprint, url_prefix="/api/documents")

    @app.route("/")
    def Home():

        return {
            "message": "ATS Backend Running",
            "version": "Sprint 2"
        }

    @app.route("/health")
    def Health():

        return {
            "status": "healthy"
        }

    return app


app = CreateApp()

if __name__ == "__main__":
    app.run(debug=True)