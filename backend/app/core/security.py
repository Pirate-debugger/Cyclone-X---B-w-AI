from enum import Enum
from typing import Optional
from fastapi import Header, HTTPException, status
from pydantic import BaseModel

class UserRole(str, Enum):
    VIEWER = "viewer"
    OPERATOR = "operator"
    ADMIN = "admin"

class CurrentUser(BaseModel):
    user_id: str
    username: str
    role: UserRole
    organization: str

# Pre-seeded users for DEMO MODE and Authorized Operations Keys
DEMO_USERS = {
    "cb1_3zqt_1_dc5d1212b00788ce3409d182": CurrentUser(
        user_id="usr_chief_commander",
        username="lead_operations_commander",
        role=UserRole.ADMIN,
        organization="National Cyclone Intelligence & Operations Command"
    ),
    "demo-viewer-key": CurrentUser(
        user_id="usr_001",
        username="viewer_demo",
        role=UserRole.VIEWER,
        organization="Public Observation Desk"
    ),
    "demo-operator-key": CurrentUser(
        user_id="usr_002",
        username="operator_odisha",
        role=UserRole.OPERATOR,
        organization="State Emergency Operations Centre (SEOC)"
    ),
    "demo-admin-key": CurrentUser(
        user_id="usr_003",
        username="admin_sys",
        role=UserRole.ADMIN,
        organization="Disaster Management Authority"
    ),
}

def get_current_user(x_api_key: Optional[str] = Header(None)) -> CurrentUser:
    """Extracts and verifies user identity based on header or defaults to Operator in Demo mode."""
    if not x_api_key:
        # Default fallback for smooth demo navigation
        return DEMO_USERS["demo-operator-key"]
    
    user = DEMO_USERS.get(x_api_key)
    if not user:
        # Allow passing role directly via demo key format: e.g. "role:admin"
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
    """Dependency for RBAC enforcement."""
    role_hierarchy = {
        UserRole.VIEWER: 1,
        UserRole.OPERATOR: 2,
        UserRole.ADMIN: 3
    }
    
    def role_checker(user: CurrentUser = Header(None, alias="X-API-Key")):
        current = get_current_user(user)
        if role_hierarchy[current.role] < role_hierarchy[min_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action requires minimum role: {min_role.value}. Current role: {current.role.value}"
            )
        return current
        
    return role_checker
