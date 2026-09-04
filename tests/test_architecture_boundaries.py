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


def test_frontend_has_one_vite_entry_and_bounded_growth_components() -> None:
    static = ROOT / "app" / "static"
    html = (static / "index.html").read_text(encoding="utf-8")
    assert "/static/app.js" not in html
    assert html.count('/static/generated/product-ui.js') == 1
    assert not (static / "app.js").exists()
    assert line_count(ROOT / "frontend" / "src" / "ProductGrowthHub.tsx") < 900
    assert line_count(ROOT / "frontend" / "src" / "features" / "growth" / "ClubWorkspace.tsx") < 900
