from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.cursos import router as cursos_router
from app.api.eventos import router as eventos_router
from app.api.grupos import router as grupos_router
from app.api.materias import router as materias_router
from app.api.me import router as me_router
from app.api.semestres import router as semestres_router

app = FastAPI(title="Conecta-U API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(me_router, prefix="/api")
app.include_router(semestres_router, prefix="/api")
app.include_router(cursos_router, prefix="/api")
app.include_router(eventos_router, prefix="/api")
app.include_router(materias_router, prefix="/api")
app.include_router(grupos_router, prefix="/api")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
