from concurrent.futures import ThreadPoolExecutor


class RunQueue:
    def __init__(self, worker, concurrency=2, retries=1, on_result=None):
        self.worker = worker
        self.concurrency = concurrency
        self.retries = retries
        self.on_result = on_result or (lambda result, job: None)
        self.pool = ThreadPoolExecutor(max_workers=concurrency)

    def add(self, job):
        self.pool.submit(self._run_with_retry, job)

    def _run_with_retry(self, job):
        attempt = 0
        result = None
        while attempt <= self.retries:
            result = self.worker(job)
            if result.get("ok"):
                break
            attempt += 1
        self.on_result(result, job)
