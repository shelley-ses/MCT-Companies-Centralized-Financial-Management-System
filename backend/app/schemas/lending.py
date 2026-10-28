from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field
from decimal import Decimal


class LendingCalculateRequest(BaseModel):
    principal: Decimal = Field(..., ge=1.0)
    interest_rate: Decimal = Field(default=Decimal("20.00"), ge=0.0)
    payment_frequency: str = Field(default="Daily")
    term_days: Optional[int] = Field(default=40, ge=1)
    date_borrowed: Optional[str] = None
    due_date: Optional[str] = ""


class LendingCalculateResponse(BaseModel):
    principal: float
    interest_rate: float
    interest: float
    total_payable: float
    frequency: str
    cycle_count: int
    installment_target: float
    term_days: int = 40
    penalty_rate: float = 5.0
    penalty_per_cycle: float = 0.0
    date_borrowed: str
    due_date: str


class LendingFacilityCreateRequest(BaseModel):
    borrower_name: str = Field(..., min_length=1)
    borrower_contact: Optional[str] = ""
    borrower_address: Optional[str] = ""
    loan_amount: Decimal = Field(..., ge=1.0)
    interest_rate: Decimal = Field(default=Decimal("20.00"), ge=0.0)
    payment_frequency: str = Field(default="Daily")
    term_days: Optional[int] = Field(default=40, ge=1)
    date_borrowed: Optional[str] = None
    due_date: Optional[str] = ""
    notes: Optional[str] = ""


class LendingPaymentCreateRequest(BaseModel):
    facility_id: int
    payment_date: str
    amount: Decimal = Field(..., ge=1.0)
    method: str = Field(default="Cash")
    reference_no: Optional[str] = ""
    notes: Optional[str] = ""


class LendingTransactionCreateRequest(BaseModel):
    facility_id: int
    payment_date: str
    amount: Decimal = Field(..., ge=0.01)
    payment_method: str = Field(default="Cash")
    transaction_type: str = Field(default="Repayment")
    reference_no: Optional[str] = ""
    notes: Optional[str] = ""


class LendingTransactionOut(BaseModel):
    transaction_id: int
    facility_id: int
    transaction_ref_no: Optional[str] = None
    transaction_type: str = "Repayment"
    payment_date: str
    due_date: Optional[str] = None
    amount: float
    principal_portion: float = 0.0
    interest_portion: float = 0.0
    penalty_portion: float = 0.0
    remaining_balance: Optional[float] = None
    payment_method: str = "Cash"
    reference_no: Optional[str] = "-"
    status: str = "Completed"
    notes: Optional[str] = "-"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


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
    penalty: Optional[float] = 0.0


class LendingFacilityOut(BaseModel):
    id: str
    loanId: int
    loanRefNo: str
    borrowerName: str
    borrowerContact: Optional[str] = ""
    borrowerAddress: Optional[str] = ""
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
    termDays: int = 40
    penaltyRate: float = 5.0
    penaltyPerCycle: float = 0.0
    totalPenalties: float = 0.0
    advanceAmount: float = 0.0
    installmentTarget: float = 0.0
    complianceStatus: str = "Compliant"
    missedCyclesCount: int = 0
    notes: Optional[str] = ""
    dailyPayments: List[Dict[str, Any]] = []

    model_config = ConfigDict(from_attributes=True)


class LendingLedgerResponse(BaseModel):
    facility_id: str
    loan_ref_no: str
    borrower_name: str
    borrower_contact: Optional[str] = ""
    borrower_address: Optional[str] = ""
    payment_frequency: str
    principal: float
    interest_rate: float
    total_payable: float
    amount_paid: float
    remaining_balance: float
    date_borrowed: str
    due_date: str
    term_days: int = 40
    penalty_rate: float = 5.0
    penalty_per_cycle: float = 0.0
    total_penalties: float = 0.0
    advance_amount: float = 0.0
    installment_target: float = 0.0
    compliance_status: str = "Compliant"
    missed_cycles_count: int = 0
    ledger_items: List[Dict[str, Any]]
    monthly_progress: Optional[Dict[str, Any]] = None
    next_installment: Optional[Dict[str, Any]] = None
