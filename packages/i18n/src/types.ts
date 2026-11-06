/** Same shape as a source catalog, with any string as value: a translation must cover every key and add none. */
export type Translation<T> = { [K in keyof T]: T[K] extends string ? string : Translation<T[K]> }
