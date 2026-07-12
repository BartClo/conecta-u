from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import TokenPayload, get_current_token
from app.schemas.user import UserOut
from app.services.user_service import get_or_create_user

router = APIRouter()


@router.get("/me", response_model=UserOut)
def read_me(
    token: TokenPayload = Depends(get_current_token),
    db: Session = Depends(get_db),
) -> UserOut:
    user = get_or_create_user(db, token)
    return UserOut.model_validate(user)
