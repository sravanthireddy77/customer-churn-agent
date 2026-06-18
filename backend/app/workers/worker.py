from redis import Redis
from rq import Queue, Worker

from app.core.config import get_settings


def run() -> None:
    settings = get_settings()
    connection = Redis.from_url(settings.redis_url)
    worker = Worker([Queue("campaigns", connection=connection)], connection=connection)
    worker.work()


if __name__ == "__main__":
    run()
