from datetime import UTC, datetime


def aware_utc(valor: datetime) -> datetime:
    """UTC consciente de zona; SQLite devuelve datetimes naive, que se asumen UTC."""
    if valor.tzinfo is None:
        return valor.replace(tzinfo=UTC)
    return valor.astimezone(UTC)
