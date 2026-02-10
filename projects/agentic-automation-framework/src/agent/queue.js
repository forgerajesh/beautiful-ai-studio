export class RunQueue {
  constructor({ worker, concurrency = 2, retries = 1, onResult = () => {} }) {
    this.worker = worker;
    this.concurrency = concurrency;
    this.retries = retries;
    this.onResult = onResult;
    this.queue = [];
    this.active = 0;
  }

  add(job) {
    this.queue.push({ ...job, attempt: 0 });
    this._drain();
  }

  _drain() {
    while (this.active < this.concurrency && this.queue.length) {
      const job = this.queue.shift();
      this._run(job);
    }
  }

  async _run(job) {
    this.active++;
    let result;
    try {
      result = await this.worker(job);
      if (!result?.ok && job.attempt < this.retries) {
        this.queue.push({ ...job, attempt: job.attempt + 1 });
      } else {
        this.onResult(result, job);
      }
    } catch (e) {
      if (job.attempt < this.retries) {
        this.queue.push({ ...job, attempt: job.attempt + 1 });
      } else {
        this.onResult({ ok: false, error: String(e), name: job.name || "job" }, job);
      }
    } finally {
      this.active--;
      this._drain();
    }
  }
}
