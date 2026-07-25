from fastapi import Depends, HTTPException, status
from app.models.admin import Admin
from app.utils.dependencies import get_current_admin


def require_role(*roles: str):
    def checker(current_admin: Admin = Depends(get_current_admin)) -> Admin:
        if current_admin.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(roles)}",
            )
        return current_admin
    return checker
