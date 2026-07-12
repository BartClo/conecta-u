from fastapi import FastAPI

from app.api.me import router as me_router

app = FastAPI(title="Conecta-U API")
app.include_router(me_router, prefix="/api")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
