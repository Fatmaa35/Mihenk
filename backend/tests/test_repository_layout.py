"""Check the paths used by build and release tools after repository moves."""
from pathlib import Path
import re
import shlex

import yaml

ROOT = Path(__file__).resolve().parents[2]


def test_docker_copy_sources_exist_in_root_build_context():
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    for line in dockerfile.splitlines():
        if line.startswith("COPY ") and "--from=" not in line:
            for source in shlex.split(line)[1:-1]:
                assert (ROOT / source).exists(), f"Missing Docker COPY source: {source}"
    render = yaml.safe_load((ROOT / "render.yaml").read_text(encoding="utf-8"))
    web = next(service for service in render["services"] if service["type"] == "web")
    assert (ROOT / web["dockerfilePath"]).is_file()


def test_workflow_directories_and_dependency_cache_paths_exist():
    for path in (ROOT / ".github" / "workflows").glob("*.yml"):
        workflow = yaml.safe_load(path.read_text(encoding="utf-8"))
        default = workflow.get("defaults", {}).get("run", {}).get("working-directory", ".")
        for job in workflow["jobs"].values():
            job_default = job.get("defaults", {}).get("run", {}).get("working-directory", default)
            checked_out = False
            for step in job.get("steps", []):
                if step.get("uses", "").startswith("actions/checkout@"):
                    checked_out = True
                cache = step.get("with", {}).get("cache-dependency-path")
                if cache:
                    assert (ROOT / cache).is_file(), (path.name, cache)
                if "run" in step:
                    directory = step.get("working-directory", job_default)
                    assert (ROOT / directory).is_dir(), (path.name, directory)
                    assert directory == "." or checked_out, (path.name, "working directory before checkout")


def test_compose_build_and_environment_paths_resolve_from_infra():
    infra = ROOT / "infra"
    for name in ("docker-compose.yml", "compose.production.yml"):
        services = yaml.safe_load((infra / name).read_text(encoding="utf-8"))["services"]
        for service in services.values():
            if "build" in service:
                build = service["build"]
                context = (infra / build["context"]).resolve()
                assert context == ROOT
                assert (context / build["dockerfile"]).is_file()
            if "env_file" in service:
                env = infra / service["env_file"]
                assert Path(str(env) + ".example").is_file()
            for mount in service.get("volumes", []):
                source = mount.split(":", 1)[0]
                if source.startswith("."):
                    assert (infra / source).exists(), source


def test_frontend_build_and_bundle_check_target_served_static_directory():
    config = (ROOT / "frontend/vite.config.ts").read_text(encoding="utf-8")
    checker = (ROOT / "frontend/scripts/check-bundle-size.mjs").read_text(encoding="utf-8")
    output = re.search(r"outDir: resolve\(configDir, '([^']+)'", config).group(1)
    budget = re.search(r"resolve\(import.meta.dirname, '([^']+)'", checker).group(1)
    expected = (ROOT / "backend/app/static/generated").resolve()
    assert (ROOT / "frontend" / output).resolve() == expected
    assert (ROOT / "frontend/scripts" / budget).resolve() == expected
    assert expected.is_dir()
