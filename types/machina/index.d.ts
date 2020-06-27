declare module 'machina' {

  export interface BehavioralFsmStatesMap {
    // [state: string]: {
    //   _onEnter: StateEventHandler|undefined,
    //   _onExit: StateEventHandler|undefined,
    //   [event: string]: StateEventHandler|undefined
    // }
    [state: string]: any
  }

  export interface BehavioralFsmDefinition {
    'namespace': string;
    initialState: string;
    states: BehavioralFsmStatesMap;

    handle: Function;
  }

  export class BehavioralFsm {
    constructor(definition: any);
    public transition(obj: any, event: string, ...args: any[]): void;
    public handle(obj: any, event: string, ...args: any[]): void;
    public deferUntilTransition(obj: any): void;
    public on(event: string, fn: Function): void;

    public start(obj: any): void;
    public speed(obj: any, ev: any): void;
    public color(obj: any, ev: any): void;
    public tile(obj: any, tileName: string): void;
  }
}
