import { AsyncLoop } from '.'

describe('async loop', () => {
  it('can start and stop loop', (done) => {
    let i = 0
    const loop = new AsyncLoop(async () => { i++ })
    expect(() => { loop.start() }).not.toThrow()
    setTimeout(() => {
      expect(i).toBeGreaterThan(0)
      loop.stop()
    }, 10)
    loop.on('end', done)
  })
  it('can stop in loop', (done) => {
    let i = 0
    const loop: AsyncLoop = new AsyncLoop(async () => {
      i++
      if (i === 10) loop.stop()
    })
    loop.start()
    loop.on('end', done) // stopped
  })
  it('emit error event on reject', (done) => {
    const loop = new AsyncLoop(() => Promise.reject(new Error(':(')))
    const handler = jest.fn()
    loop.start()
    loop.on('error', handler)
    loop.on('end', () => {
      expect(handler).toBeCalled()
      done()
    })
  })
  it('emit end event once when stop many times', () => {
    const loop = new AsyncLoop(() => Promise.resolve())
    const handler = jest.fn()
    loop.start()
    loop.on('end', handler)
    loop.stop()
    loop.stop()
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
