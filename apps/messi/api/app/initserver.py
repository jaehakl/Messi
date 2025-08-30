from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db import Base, engine
from dotenv import load_dotenv
from fastapi.staticfiles import StaticFiles
import os

from settings import settings
from oauth import router as auth_router
#from routers.word_images import router as word_images_router


def server():
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # When service starts.
        await start()
    
        yield
        
        # When service is stopped.
        shutdown()

    app = FastAPI(lifespan=lifespan)

    origins = [
        "http://localhost",
        "http://localhost:5173",
        settings.app_base_url
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origins=origins,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
    )
    if settings.STATIC_DIR and settings.STATIC_DIR != "":
        if not os.path.exists(settings.STATIC_DIR):
            os.makedirs(settings.STATIC_DIR)
        app.mount(settings.STATIC_ROUTE, StaticFiles(directory=settings.STATIC_DIR), name="static_files")

    async def start():
        app.state.progress = 0
        # 확장(있으면 생성, 없으면 무시)
        #with engine.begin() as conn:
        #    try:
        #        conn.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS citext;")
        #        conn.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
        #    except Exception:
        #        pass
        Base.metadata.create_all(bind=engine)
        if settings.google_client_id and settings.google_client_secret and settings.google_redirect_uri:            
            app.include_router(auth_router)
            print("Google OAuth is configured.")

        print("service is started.")

    def shutdown():
        print("service is stopped.")

    return app