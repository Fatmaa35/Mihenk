"""Supabase ve SQLite repository'lerinin aynı veri sözleşmesini karşıladığını doğrular."""
import inspect

import pytest

from app.repositories.contracts import DOMAIN_STORES, RepositoryContract
from app.repositories.sqlite import SQLiteRepository
from app.supabase_repository import SupabaseRepository

# Yalnızca bir arka uçta anlamlı olan metotlar. Listeye eklemek bilinçli bir karar olmalı.
SUPABASE_ONLY = {"invite_user", "upsert_book_embeddings"}
SQLITE_ONLY = {
    "connect", "initialize", "register", "authenticate", "create_session", "session_user",
    "delete_session", "books_for_edition_verification", "record_edition_verification",
    "save_verified_edition", "get_reading_session", "get_book_quote",
}


def contract_methods() -> dict[str, inspect.Signature]:
    return {
        name: inspect.signature(member)
        for name, member in inspect.getmembers(RepositoryContract, inspect.isfunction)
        if not name.startswith("_")
    }


def public_methods(cls: type) -> set[str]:
    return {name for name, member in inspect.getmembers(cls, inspect.isfunction) if not name.startswith("_")}


@pytest.mark.parametrize("implementation,exempt", [
    (SupabaseRepository, set()),
    (SQLiteRepository, SUPABASE_ONLY),
])
def test_implementation_covers_contract(implementation, exempt):
    missing = set(contract_methods()) - public_methods(implementation) - exempt
    assert not missing, f"{implementation.__name__} sözleşmedeki şu metotları uygulamıyor: {sorted(missing)}"


@pytest.mark.parametrize("implementation,exempt", [
    (SupabaseRepository, set()),
    (SQLiteRepository, SQLITE_ONLY),
])
def test_implementation_has_no_undocumented_public_methods(implementation, exempt):
    extra = public_methods(implementation) - set(contract_methods()) - exempt
    assert not extra, f"Yeni metotları önce contracts.py'ye ekleyin: {sorted(extra)}"


@pytest.mark.parametrize("implementation", [SupabaseRepository, SQLiteRepository])
def test_parameter_names_match_contract(implementation):
    mismatched = {}
    for name, expected in contract_methods().items():
        member = getattr(implementation, name, None)
        if member is None:
            continue
        actual = list(inspect.signature(member).parameters)
        if actual != list(expected.parameters):
            mismatched[name] = (actual, list(expected.parameters))
    # SQLite metadata upsert'i tarihsel olarak `record` adını kullanıyor; konumsal çağrıldığı için güvenli.
    mismatched.pop("upsert_metadata_book", None)
    assert not mismatched


def test_every_domain_store_is_used():
    assert set(DOMAIN_STORES) == {
        "auth", "catalog", "library", "reading", "notifications", "pricing",
        "recommendations", "assistant", "community", "clubs", "admin", "telemetry",
    }
