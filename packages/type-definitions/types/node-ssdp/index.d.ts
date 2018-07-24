declare module 'node-ssdp' {

  export class Base {
    constructor(opts: any);

    addUSN(device: any): void;

  }

  export class Client {
    constructor(opts?: any);

    search(serviceType: any): any;

    start(cb: any, ...args: any[]): any;

    stop(): void;

    addListener(type: any, listener: any): any;

    addUSN(device: any): void;

    emit(type: any, args: any): any;

    eventNames(): any;

    getMaxListeners(): any;

    listenerCount(type: any): any;

    listeners(type: any): any;

    on(type: any, listener: any): any;

    once(type: any, listener: any): any;

    prependListener(type: any, listener: any): any;

    prependOnceListener(type: any, listener: any): any;

    rawListeners(type: any): any;

    removeAllListeners(type: any, ...args: any[]): any;

    removeListener(type: any, listener: any): any;

    setMaxListeners(n: any): any;

  }

  export class Server {
    constructor(opts: any);

    advertise(alive: any): void;

    start(cb?: any, ...args: any[]): any;

    stop(): void;

    addListener(type: any, listener: any): any;

    addUSN(device: any): void;

    emit(type: any, args: any): any;

    eventNames(): any;

    getMaxListeners(): any;

    listenerCount(type: any): any;

    listeners(type: any): any;

    on(type: any, listener: any): any;

    once(type: any, listener: any): any;

    prependListener(type: any, listener: any): any;

    prependOnceListener(type: any, listener: any): any;

    rawListeners(type: any): any;

    removeAllListeners(type: any, ...args: any[]): any;

    removeListener(type: any, listener: any): any;

    setMaxListeners(n: any): any;

  }

  export namespace Base {
    function addListener(type: any, listener: any): any;

    function addUSN(device: any): void;

    function emit(type: any, args: any): any;

    function eventNames(): any;

    function getMaxListeners(): any;

    function listenerCount(type: any): any;

    function listeners(type: any): any;

    function on(type: any, listener: any): any;

    function once(type: any, listener: any): any;

    function prependListener(type: any, listener: any): any;

    function prependOnceListener(type: any, listener: any): any;

    function rawListeners(type: any): any;

    function removeAllListeners(type: any, ...args: any[]): any;

    function removeListener(type: any, listener: any): any;

    function setMaxListeners(n: any): any;

    namespace addListener {
      const prototype: {
      };

    }

    namespace addUSN {
      const prototype: {
      };

    }

    namespace emit {
      const prototype: {
      };

    }

    namespace eventNames {
      const prototype: {
      };

    }

    namespace getMaxListeners {
      const prototype: {
      };

    }

    namespace listenerCount {
      const prototype: {
      };

    }

    namespace listeners {
      const prototype: {
      };

    }

    namespace on {
      const prototype: {
      };

    }

    namespace once {
      const prototype: {
      };

    }

    namespace prependListener {
      const prototype: {
      };

    }

    namespace prependOnceListener {
      const prototype: {
      };

    }

    namespace rawListeners {
      const prototype: {
      };

    }

    namespace removeAllListeners {
      const prototype: {
      };

    }

    namespace removeListener {
      const prototype: {
      };

    }

    namespace setMaxListeners {
      const prototype: {
      };

    }

  }

  export namespace Client {
    function addListener(type: any, listener: any): any;

    function addUSN(device: any): void;

    function emit(type: any, args: any): any;

    function eventNames(): any;

    function getMaxListeners(): any;

    function listenerCount(type: any): any;

    function listeners(type: any): any;

    function on(type: any, listener: any): any;

    function once(type: any, listener: any): any;

    function prependListener(type: any, listener: any): any;

    function prependOnceListener(type: any, listener: any): any;

    function rawListeners(type: any): any;

    function removeAllListeners(type: any, ...args: any[]): any;

    function removeListener(type: any, listener: any): any;

    function search(serviceType: any): any;

    function setMaxListeners(n: any): any;

    function start(cb: any, ...args: any[]): any;

    function stop(): void;

    namespace addListener {
      const prototype: {
      };

    }

    namespace addUSN {
      const prototype: {
      };

    }

    namespace emit {
      const prototype: {
      };

    }

    namespace eventNames {
      const prototype: {
      };

    }

    namespace getMaxListeners {
      const prototype: {
      };

    }

    namespace listenerCount {
      const prototype: {
      };

    }

    namespace listeners {
      const prototype: {
      };

    }

    namespace on {
      const prototype: {
      };

    }

    namespace once {
      const prototype: {
      };

    }

    namespace prependListener {
      const prototype: {
      };

    }

    namespace prependOnceListener {
      const prototype: {
      };

    }

    namespace rawListeners {
      const prototype: {
      };

    }

    namespace removeAllListeners {
      const prototype: {
      };

    }

    namespace removeListener {
      const prototype: {
      };

    }

    namespace search {
      const prototype: {
      };

    }

    namespace setMaxListeners {
      const prototype: {
      };

    }

    namespace start {
      const prototype: {
      };

    }

    namespace stop {
      const prototype: {
      };

    }

  }

  export namespace Server {
    function addListener(type: any, listener: any): any;

    function addUSN(device: any): void;

    function advertise(alive: any): void;

    function emit(type: any, args: any): any;

    function eventNames(): any;

    function getMaxListeners(): any;

    function listenerCount(type: any): any;

    function listeners(type: any): any;

    function on(type: any, listener: any): any;

    function once(type: any, listener: any): any;

    function prependListener(type: any, listener: any): any;

    function prependOnceListener(type: any, listener: any): any;

    function rawListeners(type: any): any;

    function removeAllListeners(type: any, ...args: any[]): any;

    function removeListener(type: any, listener: any): any;

    function setMaxListeners(n: any): any;

    function start(cb: any, ...args: any[]): any;

    function stop(): void;

    namespace addListener {
      const prototype: {
      };

    }

    namespace addUSN {
      const prototype: {
      };

    }

    namespace advertise {
      const prototype: {
      };

    }

    namespace emit {
      const prototype: {
      };

    }

    namespace eventNames {
      const prototype: {
      };

    }

    namespace getMaxListeners {
      const prototype: {
      };

    }

    namespace listenerCount {
      const prototype: {
      };

    }

    namespace listeners {
      const prototype: {
      };

    }

    namespace on {
      const prototype: {
      };

    }

    namespace once {
      const prototype: {
      };

    }

    namespace prependListener {
      const prototype: {
      };

    }

    namespace prependOnceListener {
      const prototype: {
      };

    }

    namespace rawListeners {
      const prototype: {
      };

    }

    namespace removeAllListeners {
      const prototype: {
      };

    }

    namespace removeListener {
      const prototype: {
      };

    }

    namespace setMaxListeners {
      const prototype: {
      };

    }

    namespace start {
      const prototype: {
      };

    }

    namespace stop {
      const prototype: {
      };

    }

  }

}
