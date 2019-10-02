// 兼容
export const indexedDB = indexedDB || window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
export const IDBTransaction =IDBTransaction|| window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
export const IDBKeyRange =IDBKeyRange|| window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;