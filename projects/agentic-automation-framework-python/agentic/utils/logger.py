from datetime import datetime, UTC


def log(*args):
    print(datetime.now(UTC).isoformat(), "|", *args)


def err(*args):
    print(datetime.now(UTC).isoformat(), "|", *args)
