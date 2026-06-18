from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.churn_analysis import ChurnAnalysis
from app.schemas.churn import ChurnAnalysisResponse


class ChurnAnalysisRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, payload: ChurnAnalysisResponse) -> ChurnAnalysis:
        analysis = ChurnAnalysis(**payload.model_dump())
        self.db.add(analysis)
        self.db.commit()
        self.db.refresh(analysis)
        return analysis

    def list(self) -> list[ChurnAnalysis]:
        return list(self.db.scalars(select(ChurnAnalysis).order_by(ChurnAnalysis.created_at.desc())).all())

    def latest_for_customer(self, customer_id: str) -> ChurnAnalysis | None:
        return self.db.scalar(
            select(ChurnAnalysis)
            .where(ChurnAnalysis.customer_id == customer_id)
            .order_by(ChurnAnalysis.created_at.desc())
            .limit(1)
        )
