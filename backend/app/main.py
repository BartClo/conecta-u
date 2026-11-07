from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import DataError, StatementError

from app.api.creditos import router as creditos_router
from app.api.cursos import router as cursos_router
from app.api.desafios import router as desafios_router
from app.api.eventos import router as eventos_router
from app.api.grupos import router as grupos_router
from app.api.ia import router as ia_router
from app.api.materias import router as materias_router
from app.api.me import router as me_router
from app.api.semestres import router as semestres_router
from app.api.tests import router as tests_router
from app.core.config import Settings, get_settings


def _datos_rechazados_por_la_db(request: Request, exc: StatementError) -> JSONResponse:
    # Texto mas largo que la columna (DataError) o con NUL (psycopg2 lanza ValueError):
    # es un error del cliente en cualquier endpoint. El resto sigue siendo un 500.
    if isinstance(exc, DataError) or isinstance(exc.orig, ValueError):
        return JSONResponse(status_code=422, content={"detail": "Datos no válidos"})
    raise exc


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    app = FastAPI(title="Conecta-U API")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_exception_handler(StatementError, _datos_rechazados_por_la_db)
    for router in (
        me_router,
        semestres_router,
        cursos_router,
        eventos_router,
        materias_router,
        grupos_router,
        tests_router,
        creditos_router,
        desafios_router,
        ia_router,
    ):
        app.include_router(router, prefix="/api")

    if settings.auth_mode == "test":
        # Import y montaje condicionales: fuera de modo test la ruta no existe.
        from app.api.test_auth import router as test_auth_router

        app.include_router(test_auth_router, prefix="/api")

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
