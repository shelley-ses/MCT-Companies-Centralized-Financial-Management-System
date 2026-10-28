from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from decimal import Decimal


class LendingCalculateRequest(BaseModel):
    principal: Decimal = Field(..., ge=1.0)
    interest_rate: Decimal = Field(default=Decimal("0.00"), ge=0.0)
    payment_frequency: str = Field(default="Daily")
    date_borrowed: str
    due_date: str


class LendingCalculateResponse(BaseModel):
    principal: float
    interest_rate: float
    interest: float
    total_payable: float
    frequency: str
    cycle_count: int
    installment_target: float
    date_borrowed: str
    due_date: str


class LendingFacilityCreateRequest(BaseModel):
    borrower_name: str = Field(..., min_length=1)
    loan_amount: Decimal = Field(..., ge=1.0)
    interest_rate: Decimal = Field(default=Decimal("0.00"), ge=0.0)
    payment_frequency: str = Field(default="Daily")
    date_borrowed: str
    due_date: str
    notes: Optional[str] = ""
    company_id: Optional[int] = None


class LendingPaymentCreateRequest(BaseModel):
    facility_id: int
    payment_date: str
    amount: Decimal = Field(..., ge=1.0)
    method: str = Field(default="Cash")
    reference_no: Optional[str] = ""
    notes: Optional[str] = ""


class DailyPaymentRecordOut(BaseModel):
    id: str
    date: str
    amount: float
    method: str
    referenceNo: Optional[str] = "-"
    notes: Optional[str] = "-"
    status: str
    timestamp: str
    isLocked: Optional[bool] = False


class LendingFacilityOut(BaseModel):
    id: str
    loanId: int
    loanRefNo: str
    borrowerName: str
    loanAmount: float
    interestRate: float
    interestAmount: float
    totalAmountPayable: float
    amountPaid: float
    remainingBalance: float
    dateBorrowed: str
    dueDate: str
    status: str
    paymentFrequency: str
    notes: Optional[str] = ""
    dailyPayments: List[Dict[str, Any]] = []

    model_config = ConfigDict(from_attributes=True)


class LendingLedgerResponse(BaseModel):
    facility_id: str
    loan_ref_no: str
    borrower_name: str
    payment_frequency: str
    principal: float
    interest_rate: float
    total_payable: float
    amount_paid: float
    remaining_balance: float
    date_borrowed: str
    due_date: str
    ledger_items: List[Dict[str, Any]]
    monthly_progress: Optional[Dict[str, Any]] = None
    next_installment: Optional[Dict[str, Any]] = None
