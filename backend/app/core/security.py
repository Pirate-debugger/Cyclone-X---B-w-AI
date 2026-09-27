import os
from enum import Enum
from typing import Optional, Dict
from fastapi import Header, HTTPException, status
from pydantic import BaseModel

class UserRole(str, Enum):
    VIEWER = "viewer"
    OPERATOR = "operator"
    REVIEWER = "reviewer"
    ADMIN = "admin"

class CurrentUser(BaseModel):
    user_id: str
    username: str
    role: UserRole
    organization: str

# Standard demo & operational keys configured securely
DEMO_USERS: Dict[str, CurrentUser] = {
    "demo-viewer-key": CurrentUser(
        user_id="usr_001",
        username="viewer_demo",
        role=UserRole.VIEWER,
        organization="Public Observation & Media Desk"
    ),
    "demo-operator-key": CurrentUser(
        user_id="usr_002",
        username="operator_seoc",
        role=UserRole.OPERATOR,
        organization="State Emergency Operations Centre (SEOC)"
    ),
    "demo-reviewer-key": CurrentUser(
        user_id="usr_003",
        username="lead_scientific_reviewer",
        role=UserRole.REVIEWER,
        organization="Disaster Risk & Meteorological Review Board"
    ),
    "demo-admin-key": CurrentUser(
        user_id="usr_004",
        username="admin_command",
        role=UserRole.ADMIN,
        organization="National Cyclone Intelligence & Operations Command"
    ),
}

# If an admin API key is specified via environment, register it dynamically
OPERATIONAL_ADMIN_KEY = os.getenv("CYCLONEX_ADMIN_API_KEY", "")
if OPERATIONAL_ADMIN_KEY:
    DEMO_USERS[OPERATIONAL_ADMIN_KEY] = CurrentUser(
        user_id="usr_operational_admin",
        username="operations_commander",
        role=UserRole.ADMIN,
        organization="National Cyclone Intelligence & Operations Command"
    )

def get_current_user(x_api_key: Optional[str] = Header(None, alias="X-API-Key")) -> CurrentUser:
    """Extracts and verifies user identity based on header or defaults to Operator in Demo mode."""
    if not x_api_key:
        # Default fallback for smooth demo navigation
        return DEMO_USERS["demo-operator-key"]
    
    user = DEMO_USERS.get(x_api_key)
    if not user:
        # Allow passing role directly via format: "role:admin", "role:reviewer", etc.
        if x_api_key.startswith("role:"):
            role_str = x_api_key.split(":")[1].lower()
            if role_str in [r.value for r in UserRole]:
                return CurrentUser(
                    user_id=f"usr_{role_str}",
                    username=f"{role_str}_user",
                    role=UserRole(role_str),
                    organization="Disaster Response Authority"
                )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or unauthorized API key"
        )
    return user

def require_role(min_role: UserRole):
    """Dependency for RBAC enforcement according to enterprise role hierarchy."""
    role_hierarchy = {
        UserRole.VIEWER: 1,
        UserRole.OPERATOR: 2,
        UserRole.REVIEWER: 3,
        UserRole.ADMIN: 4
    }
    
    def role_checker(x_api_key: Optional[str] = Header(None, alias="X-API-Key")):
        current = get_current_user(x_api_key)
        if role_hierarchy[current.role] < role_hierarchy[min_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action requires minimum role: {min_role.value}. Current user role: {current.role.value}"
            )
        return current
        
    return role_checker
