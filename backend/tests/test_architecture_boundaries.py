from pathlib import Path


ROOT = Path(__file__).parents[1]


def line_count(path: Path) -> int:
    return len(path.read_text(encoding="utf-8").splitlines())


def test_fastapi_composition_root_stays_small() -> None:
    assert line_count(ROOT / "app" / "main.py") < 100
    for name in ("auth", "catalog", "recommendations", "community", "pricing", "admin", "library"):
        assert (ROOT / "app" / "routers" / f"{name}.py").exists()


def test_supabase_repository_is_feature_scoped() -> None:
    assert line_count(ROOT / "app" / "supabase_repository.py") < 100
    package = ROOT / "app" / "repositories" / "supabase"
    for name in ("auth", "catalog", "recommendations", "community", "pricing", "admin", "library"):
        assert (package / f"{name}.py").exists()


def test_frontend_is_a_single_react_app_without_the_legacy_shell() -> None:
    frontend = ROOT.parent / "frontend"
    entry = (frontend / "src" / "spa" / "index.html").read_text(encoding="utf-8")
    assert entry.count('type="module"') == 1
    assert not (frontend / "src" / "legacy").exists()
    assert not (ROOT / "app" / "static" / "index.html").exists()
    assert not (ROOT / "app" / "static" / "styles.css").exists()
    for page in (frontend / "src" / "spa" / "pages").glob("*.tsx"):
        assert line_count(page) < 400, f"{page.name} bölünmeli"
    assert line_count(frontend / "src" / "features" / "growth" / "ProductGrowthHub.tsx") < 900
    assert line_count(frontend / "src" / "features" / "growth" / "ClubWorkspace.tsx") < 900
