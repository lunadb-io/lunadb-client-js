// Object patching utilities
export function parsePointer(ptr: string): Array<string> {
  if (ptr === "") {
    return [];
  }
  if (ptr.charAt(0) !== "/") {
    throw new Error("Invalid JSON pointer: " + ptr);
  }
  return ptr
    .substring(1)
    .split("/")
    .map((s) => {
      // Order is really important here, see RFC 6901
      return s.replace("~1", "/").replace("~0", "~");
    });
}

export function compilePointer(ptr: Array<string>): string {
  return ptr
    .map((s) => {
      return s.replace("/", "~1").replace("~", "~0");
    })
    .join("/");
}

export function insert(obj: any, ptr: Array<string>, value: any): boolean {
  if (ptr.length === 0) {
    // We don't allow total rewrites of the document in this way
    return false;
  }

  let next = ptr[0];
  for (let i = 0; i < ptr.length - 1; i++) {
    if (Array.isArray(obj)) {
      let idx = parseInt(next);
      if (isNaN(idx)) {
        return false;
      } else {
        obj = obj[idx];
      }
    } else if (typeof obj === "object" && obj !== null && next in obj) {
      obj = obj[next];
    } else {
      return false;
    }

    next = ptr[i + 1];
  }

  if (Array.isArray(obj)) {
    let idx = parseInt(next);
    if (isNaN(idx) || idx > obj.length || idx < 0) {
      return false;
    } else {
      obj[idx] = value;
    }
  } else if (typeof obj === "object" && obj !== null) {
    obj[next] = value;
  } else {
    return false;
  }

  return true;
}
