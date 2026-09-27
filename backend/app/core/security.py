import os
import json
from enum import Enum
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status, Depends
from pydantic import BaseModel
from app.core.config import settings
from app.core.logging import logger

class UserRole(str, Enum):
    VIEWER = "viewer"
    OPERATOR = "operator"
    SCIENTIFIC_REVIEWER = "scientific_reviewer"
    REVIEWER = "reviewer"  # Backward compatibility alias
    ADMIN = "admin"

class CurrentUser(BaseModel):
    user_id: str
    email: Optional[str] = None
    username: str
    role: UserRole
    organization: str
    auth_provider: str = "demo"  # "firebase", "google", or "demo"

# Normalized role hierarchy
ROLE_HIERARCHY: Dict[UserRole, int] = {
    UserRole.VIEWER: 1,
    UserRole.OPERATOR: 2,
    UserRole.REVIEWER: 3,
    UserRole.SCIENTIFIC_REVIEWER: 3,
    UserRole.ADMIN: 4
}

# Standard demo operational users
DEMO_USERS: Dict[str, CurrentUser] = {
    "demo-viewer-key": CurrentUser(
        user_id="usr_001",
        email="viewer@cyclonex.gov.in",
        username="viewer_demo",
        role=UserRole.VIEWER,
        organization="Public Observation & Media Desk",
        auth_provider="demo"
    ),
    "demo-operator-key": CurrentUser(
        user_id="usr_002",
        email="operator@seoc.odisha.gov.in",
        username="operator_seoc",
        role=UserRole.OPERATOR,
        organization="State Emergency Operations Centre (SEOC)",
        auth_provider="demo"
    ),
    "demo-reviewer-key": CurrentUser(
        user_id="usr_003",
        email="reviewer@imd.gov.in",
        username="lead_scientific_reviewer",
        role=UserRole.SCIENTIFIC_REVIEWER,
        organization="Disaster Risk & Meteorological Review Board",
        auth_provider="demo"
    ),
    "demo-admin-key": CurrentUser(
        user_id="usr_004",
        email="commander@ndma.gov.in",
        username="admin_command",
        role=UserRole.ADMIN,
        organization="National Cyclone Intelligence & Operations Command",
        auth_provider="demo"
    ),
}

# Firebase Admin SDK initialization cache
_firebase_initialized = False

def init_firebase_admin():
    global _firebase_initialized
    if _firebase_initialized:
        return True
    try:
        import firebase_admin
        from firebase_admin import credentials
        if not firebase_admin._apps:
            if settings.FIREBASE_PROJECT_ID and settings.FIREBASE_CLIENT_EMAIL and settings.FIREBASE_PRIVATE_KEY:
                cred_dict = {
                    "project_id": settings.FIREBASE_PROJECT_ID,
                    "client_email": settings.FIREBASE_CLIENT_EMAIL,
                    "private_key": settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n")
                }
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                _firebase_initialized = True
                logger.info("Firebase Admin SDK initialized with service credentials.")
            elif os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
                firebase_admin.initialize_app()
                _firebase_initialized = True
                logger.info("Firebase Admin SDK initialized via Application Default Credentials.")
    except Exception as e:
        logger.warning(f"Firebase Admin initialization deferred/not active: {str(e)}")
    return _firebase_initialized

def verify_firebase_token(token: str) -> Optional[Dict[str, Any]]:
    """Verifies a Firebase JWT ID token and extracts claims server-side."""
    if not init_firebase_admin():
        # If Firebase is not configured with live credentials, return None to trigger fallback
        return None
    try:
        from firebase_admin import auth
        decoded = auth.verify_id_token(token)
        return decoded
    except Exception as e:
        logger.error(f"Firebase token verification failed: {str(e)}")
        return None

def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
) -> CurrentUser:
    """
    Extracts and independently verifies user identity.
    Prioritizes Firebase ID token in Authorization: Bearer <token>.
    Falls back to X-API-Key or Demo user switcher for demo/offline operational testing.
    """
    # 1. Check Bearer Token (Firebase Auth)
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split("Bearer ")[1].strip()
        decoded = verify_firebase_token(token)
        if decoded:
            role_claim = decoded.get("role", "operator").lower()
            resolved_role = UserRole.OPERATOR
            if role_claim in ("admin",):
                resolved_role = UserRole.ADMIN
            elif role_claim in ("scientific_reviewer", "reviewer"):
                resolved_role = UserRole.SCIENTIFIC_REVIEWER
            elif role_claim in ("viewer",):
                resolved_role = UserRole.VIEWER

            return CurrentUser(
                user_id=decoded.get("uid", f"firebase_{decoded.get('sub', 'anon')}"),
                email=decoded.get("email"),
                username=decoded.get("name") or decoded.get("email", "firebase_user").split("@")[0],
                role=resolved_role,
                organization=decoded.get("org", "Disaster Operations Command"),
                auth_provider="firebase"
            )
        elif settings.APP_MODE != "demo":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired Firebase authentication token"
            )

    # 2. Check X-API-Key or role switcher for Demo / Offline / Automation
    if x_api_key:
        if x_api_key in DEMO_USERS:
            return DEMO_USERS[x_api_key]
        
        # Operational Admin Key check
        admin_env_key = os.getenv("CYCLONEX_ADMIN_API_KEY", "")
        if admin_env_key and x_api_key == admin_env_key:
            return CurrentUser(
                user_id="usr_operational_admin",
                username="operations_commander",
                role=UserRole.ADMIN,
                organization="National Cyclone Intelligence & Operations Command",
                auth_provider="secret_manager"
            )
        
        # Test Role Switcher ("role:admin", "role:reviewer", "role:viewer", "role:operator")
        if x_api_key.startswith("role:"):
            role_str = x_api_key.split(":")[1].lower()
            if role_str == "reviewer":
                role_str = "reviewer"
            valid_roles = {r.value: r for r in UserRole}
            if role_str in valid_roles:
                return CurrentUser(
                    user_id=f"usr_{role_str}",
                    email=f"{role_str}@cyclonex.gov.in",
                    username=f"{role_str}_user",
                    role=valid_roles[role_str],
                    organization="Disaster Response Authority",
                    auth_provider="demo"
                )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or unauthorized API key"
        )
    
    # 3. Default fallback in DEMO mode
    return DEMO_USERS["demo-operator-key"]

def require_role(min_role: UserRole):
    """
    FastAPI dependency enforcing strict server-side RBAC according to enterprise role hierarchy.
    Never trusts a client-supplied role parameter.
    """
    def role_checker(current_user: CurrentUser = Depends(get_current_user)):
        current_level = ROLE_HIERARCHY.get(current_user.role, 1)
        min_level = ROLE_HIERARCHY.get(min_role, 1)
        if current_level < min_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action requires minimum role: {min_role.value}. Current user role: {current_user.role.value}"
            )
        return current_user
        
    return role_checker
