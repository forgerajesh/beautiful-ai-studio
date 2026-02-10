from concurrent.futures import ThreadPoolExecutor, as_completed


def run_distributed(tasks: list, max_workers: int = 4):
    results = []
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futs = [pool.submit(fn, *args, **kwargs) for fn, args, kwargs in tasks]
        for f in as_completed(futs):
            try:
                results.append({"ok": True, "result": f.result()})
            except Exception as e:
                results.append({"ok": False, "error": str(e)})
    return results
