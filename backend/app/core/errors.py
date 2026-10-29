"""Safer error responses (security audit, 2026-10-30)."""
from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


async def validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    FastAPI's default 422 body repeats the submitted value in an `input` field. That echoes things like
    passwords back to the caller, and a value such as NaN cannot be turned into JSON, so the error response
    itself crashed. Only the location, message and type are returned.
    """
    errors = [
        {"loc": list(err.get("loc", ())), "msg": str(err.get("msg", "Invalid value")), "type": str(err.get("type", "value_error"))}
        for err in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": errors})
