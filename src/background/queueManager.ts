/**
 * Concurrency limiter and queue manager for bulk operations and pagination.
 * Caps background concurrent requests at 4 to prevent network throttling.
 */

export class QueueManager {
  private concurrency: number
  private running: number = 0
  private queue: (() => Promise<void>)[] = []

  constructor(concurrency: number = 4) {
    this.concurrency = concurrency
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task = async () => {
        this.running++
        try {
          const res = await fn()
          resolve(res)
        } catch (err) {
          reject(err)
        } finally {
          this.running--
          this.next()
        }
      }

      if (this.running < this.concurrency) {
        task()
      } else {
        this.queue.push(task)
      }
    })
  }

  private next(): void {
    if (this.queue.length > 0 && this.running < this.concurrency) {
      const nextTask = this.queue.shift()
      if (nextTask) {
        nextTask()
      }
    }
  }

  /**
   * Run an array of tasks with controlled concurrency and progress callback.
   */
  async mapAll<T, R>(
    items: T[],
    fn: (item: T, index: number) => Promise<R>,
    onProgress?: (completed: number, total: number, item: T) => void
  ): Promise<R[]> {
    let completed = 0
    const results: R[] = new Array(items.length)

    const promises = items.map((item, index) =>
      this.run(async () => {
        const res = await fn(item, index)
        results[index] = res
        completed++
        if (onProgress) {
          onProgress(completed, items.length, item)
        }
        return res
      })
    )

    await Promise.all(promises)
    return results
  }
}

export const defaultQueue = new QueueManager(4)
