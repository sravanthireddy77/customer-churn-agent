from fastapi import APIRouter

from app.db.seed import seed

router = APIRouter(prefix="/seed", tags=["Database"])


@router.post("")
def seed_database() -> dict[str, str]:
    """Populate the database with sample customers and analyses."""
    try:
        seed()
        return {"status": "success", "message": "Database seeded with sample data"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
