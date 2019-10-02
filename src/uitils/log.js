

export function log_error(msg = "") {
  throw new Error(`${NAME}：${msg}`);
}

export function log(msg = "") {
  console.log(msg);
}
