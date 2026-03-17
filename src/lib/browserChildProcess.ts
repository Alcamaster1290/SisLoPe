export function spawn(): never {
  throw new Error("child_process is not available in the browser runtime.");
}

export default {
  spawn,
};
