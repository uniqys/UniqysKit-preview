import { takeSemaphoreAsync } from '.'
import { promisify } from 'util'
import Semaphore from 'semaphore'

test('take semaphore async', (done) => {
  const semaphore = Semaphore(1)
  takeSemaphoreAsync(semaphore, async () => {
    await promisify(setTimeout)(50)
  }).then(() => {
    expect(semaphore.available(1)).toBeTruthy()
    done()
  }).catch(err => done.fail(err))
  expect(semaphore.available(1)).not.toBeTruthy()
})
