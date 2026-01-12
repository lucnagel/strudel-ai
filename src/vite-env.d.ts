/// <reference types="vite/client" />

declare module '@strudel/web' {
  interface StrudelRepl {
    evaluate: (code: string) => Promise<unknown>
    stop: () => void
  }

  export function initStrudel(options?: {
    prebake?: () => Promise<void>
    drawContext?: CanvasRenderingContext2D
    autodraw?: boolean
    miniAllStrings?: boolean
  }): Promise<StrudelRepl>
  export function samples(source: string): Promise<void>
  export function silence(): void
  export const webaudioOutput: unknown
  export const s: (sound: string) => Pattern
  export const note: (n: string | number) => Pattern
  export const n: (n: string | number) => Pattern
  export const stack: (...patterns: Pattern[]) => Pattern
  export const sequence: (...patterns: Pattern[]) => Pattern
  export const cat: (...patterns: Pattern[]) => Pattern
  export const slowcat: (...patterns: Pattern[]) => Pattern
  export const fastcat: (...patterns: Pattern[]) => Pattern

  interface Pattern {
    play(): Pattern
    stop(): void
    fast(n: number): Pattern
    slow(n: number): Pattern
    rev(): Pattern
    jux(fn: (p: Pattern) => Pattern): Pattern
    sometimes(fn: (p: Pattern) => Pattern): Pattern
    often(fn: (p: Pattern) => Pattern): Pattern
    rarely(fn: (p: Pattern) => Pattern): Pattern
    lpf(freq: number): Pattern
    hpf(freq: number): Pattern
    gain(g: number): Pattern
    speed(s: number): Pattern
    room(r: number): Pattern
    delay(d: number): Pattern
    pan(p: number): Pattern
    n(num: string | number): Pattern
    note(n: string | number): Pattern
    struct(s: string): Pattern
    every(n: number, fn: (p: Pattern) => Pattern): Pattern
    layer(...fns: ((p: Pattern) => Pattern)[]): Pattern
    off(t: number, fn: (p: Pattern) => Pattern): Pattern
    add(n: number): Pattern
    sub(n: number): Pattern
    mul(n: number): Pattern
    div(n: number): Pattern
    // Allow any other method
    [key: string]: unknown
  }
}

declare module '@strudel/webaudio' {
  export const webaudioOutput: unknown
  export function initAudioOnFirstClick(): void
  export function getAudioContext(): AudioContext
}

declare module '@lezer/highlight' {
  export interface Tag {
    set: Tag[]
  }
  export const tags: {
    keyword: Tag
    string: Tag
    number: Tag
    comment: Tag
    operator: Tag
    variableName: Tag
    propertyName: Tag
    function: (tag: Tag) => Tag
    definition: (tag: Tag) => Tag
    bracket: Tag
    punctuation: Tag
    bool: Tag
    null: Tag
    regexp: Tag
    [key: string]: Tag | ((tag: Tag) => Tag)
  }
}
