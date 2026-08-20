from app.config import settings
from app.repository_factory import create_repository


def main() -> None:
    repository = create_repository(settings)
    print({"notifications_created": repository.evaluate_price_alerts()})


if __name__ == "__main__":
    main()
