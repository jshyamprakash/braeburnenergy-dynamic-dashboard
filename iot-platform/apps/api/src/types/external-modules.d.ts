// Type stubs for industrial protocol packages (node-bacnet, node-ethernet-ip).
// These packages are installed at runtime; stubs silence TypeScript until
// the packages are available in node_modules.

declare module 'node-bacnet' {
  interface BacnetOptions {
    adpuTimeout?: number;
    port?: number;
  }
  class BACnet {
    constructor(options?: BacnetOptions);
    readProperty(
      address: string,
      objectId: { type: number; instance: number },
      propertyId: number,
      options: null,
      callback: (err: any, value: any) => void
    ): void;
    on(event: string, listener: (...args: any[]) => void): this;
    close(): void;
  }
  export default BACnet;
}

declare module 'node-ethernet-ip' {
  class Tag {
    constructor(tagName: string, program?: string, datatype?: number);
    value: any;
  }
  class Controller {
    connect(host: string, slot?: number): Promise<void>;
    readTag(tag: Tag): Promise<void>;
    destroy(): void;
  }
  export { Tag, Controller };
}
