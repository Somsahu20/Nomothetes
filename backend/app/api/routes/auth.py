from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
import logging


from app.db.session import get_db
from app.models.user import User, RefreshToken
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserUpdate,
    UserResponse,
    TokenResponse,
    RefreshTokenResponse,
    MessageResponse,
    RegisterResponse
)
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    validate_password_strength
)
from app.core.config import settings
from app.api.deps import get_current_user

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: Request,
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new user account.
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered"
        )

    # Create new user
    new_user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        full_name=user_data.full_name,
        organization=user_data.organization
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info(f"New user registered: {new_user.user_id}")

    return RegisterResponse(
        message="Registration successful",
        user_id=new_user.user_id
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: UserLogin,
    response: Response,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Authenticate user and return access/refresh tokens.
    """
    # Find user by email
    user = db.query(User).filter(User.email == login_data.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    # Check if account is locked
    if user.is_locked():
        remaining = (user.locked_until - datetime.utcnow()).seconds // 60
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Account locked. Try again in {remaining} minutes."
        )

    # Verify password
    if not verify_password(login_data.password, user.password_hash):
        # Increment failed attempts
        user.failed_login_attempts += 1

        # Lock account if too many attempts
        if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
            user.locked_until = datetime.utcnow() + timedelta(minutes=settings.LOCKOUT_MINUTES)
            logger.warning(f"Account locked due to failed attempts: {user.user_id}")

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated"
        )

    # Reset failed attempts on successful login
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()

    # Create tokens
    access_token = create_access_token(str(user.user_id), user.email)
    refresh_token_value = create_refresh_token()

    # Store refresh token in database
    refresh_token = RefreshToken(
        user_id=user.user_id,
        token=refresh_token_value,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(refresh_token)
    db.commit()

    # Set refresh token as httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token_value,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )

    logger.info(f"User logged in: {user.user_id}")

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user)
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    response: Response,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Logout user and invalidate refresh token.
    """
    # Get refresh token from cookie
    refresh_token_value = request.cookies.get("refresh_token")

    if refresh_token_value:
        # Revoke the refresh token
        refresh_token = db.query(RefreshToken).filter(
            RefreshToken.token == refresh_token_value,
            RefreshToken.user_id == current_user.user_id
        ).first()

        if refresh_token:
            refresh_token.revoked = True
            db.commit()

    # Clear the cookie
    response.delete_cookie(key="refresh_token")

    logger.info(f"User logged out: {current_user.user_id}")

    return MessageResponse(message="Logged out successfully")


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token from cookie.
    """
    refresh_token_value = request.cookies.get("refresh_token")

    if not refresh_token_value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found"
        )

    # Find refresh token in database
    refresh_token = db.query(RefreshToken).filter(
        RefreshToken.token == refresh_token_value
    ).first()

    if not refresh_token or not refresh_token.is_valid():
        response.delete_cookie(key="refresh_token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    # Get user
    user = db.query(User).filter(User.user_id == refresh_token.user_id).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    # Create new access token
    access_token = create_access_token(str(user.user_id), user.email)

    # Optionally rotate refresh token (for enhanced security)
    # Revoke old token
    refresh_token.revoked = True

    # Create new refresh token
    new_refresh_token_value = create_refresh_token()
    new_refresh_token = RefreshToken(
        user_id=user.user_id,
        token=new_refresh_token_value,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(new_refresh_token)
    db.commit()

    # Update cookie
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token_value,
        httponly=True,
        secure=not settings.DEBUG,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )

    return RefreshTokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user information.
    """
    return UserResponse.model_validate(current_user)


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's profile.
    """
    if update_data.full_name is not None:
        current_user.full_name = update_data.full_name

    if update_data.organization is not None:
        current_user.organization = update_data.organization

    current_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(current_user)

    logger.info(f"Profile updated: {current_user.user_id}")

    return UserResponse.model_validate(current_user)


@router.post("/logout-all", response_model=MessageResponse)
async def logout_all_sessions(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Logout from all sessions by revoking all refresh tokens.
    """
    # Revoke all refresh tokens for this user
    db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.user_id
    ).update({"revoked": True})

    db.commit()

    # Clear current session cookie
    response.delete_cookie(key="refresh_token")

    logger.info(f"All sessions logged out: {current_user.user_id}")

    return MessageResponse(message="Logged out from all sessions")
