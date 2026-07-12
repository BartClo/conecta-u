from fastapi import FastAPI

app = FastAPI(title="Conecta-U API")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
