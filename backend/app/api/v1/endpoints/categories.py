from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.finance import Category
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate

router = APIRouter()

@router.get("", response_model=List[CategoryOut], summary="List all categories")
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()

@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED, summary="Create a new category")
def create_category(category_in: CategoryCreate, db: Session = Depends(get_db)):
    new_cat = Category(**category_in.model_dump())
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return new_cat

@router.get("/{category_id}", response_model=CategoryOut, summary="Get category by ID")
def get_category(category_id: int, db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.category_id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat
