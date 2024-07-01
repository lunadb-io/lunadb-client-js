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

interface TraversalResult {
  leaf: string | number;
  parent: any;
}

function traverse(obj: any, ptr: Array<string>): TraversalResult | null {
  let next = ptr[0];
  for (let i = 0; i < ptr.length - 1; i++) {
    if (Array.isArray(obj)) {
      let idx = parseInt(next);
      if (isNaN(idx)) {
        return null;
      } else {
        obj = obj[idx];
      }
    } else if (typeof obj === "object" && obj !== null && next in obj) {
      obj = obj[next];
    } else {
      return null;
    }

    next = ptr[i + 1];
  }

  if (Array.isArray(obj)) {
    let idx = parseInt(next);
    if (isNaN(idx) || idx > obj.length || idx < 0) {
      return null;
    } else {
      return {
        leaf: idx,
        parent: obj,
      };
    }
  } else if (typeof obj === "object" && obj !== null) {
    return {
      leaf: next,
      parent: obj,
    };
  } else {
    return null;
  }
}

export function operationInsert(
  obj: any,
  ptr: Array<string>,
  value: any
): boolean {
  if (ptr.length === 0) {
    // We don't allow total rewrites of the document in this way
    return false;
  }

  const results = traverse(obj, ptr);
  if (results === null) {
    return false;
  }

  results.parent[results.leaf] = value;
  return true;
}

export function operationDelete(obj: any, ptr: Array<string>): boolean {
  if (ptr.length === 0) {
    // We don't allow total rewrites of the document in this way
    return false;
  }

  const results = traverse(obj, ptr);
  if (results === null) {
    return false;
  }

  if (Array.isArray(results.parent)) {
    results.parent.splice(results.leaf as number, 1);
  } else {
    delete results.parent[results.leaf];
  }

  return true;
}

export function operationReplace(
  obj: any,
  ptr: Array<string>,
  value: any
): boolean {
  if (ptr.length === 0) {
    // We don't allow total rewrites of the document in this way
    return false;
  }

  const results = traverse(obj, ptr);
  if (results === null) {
    return false;
  }

  if (
    Array.isArray(results.parent) &&
    (results.leaf as number) < results.parent.length
  ) {
    results.parent[results.leaf] = value;
    return true;
  } else if (results.leaf in results.parent) {
    results.parent[results.leaf] = value;
    return true;
  }

  return false;
}

export function operationIncrement(
  obj: any,
  ptr: Array<string>,
  diff: number
): boolean {
  const results = traverse(obj, ptr);
  if (results === null) {
    return false;
  }

  if (
    Array.isArray(results.parent) &&
    (results.leaf as number) < results.parent.length &&
    typeof results.parent[results.leaf] === "number"
  ) {
    results.parent[results.leaf] += diff;
    return true;
  } else if (
    results.leaf in results.parent &&
    typeof results.parent[results.leaf] === "number"
  ) {
    results.parent[results.leaf] += diff;
    return true;
  }

  return false;
}

export function operationStringInsert(
  obj: any,
  ptr: Array<string>,
  idx: number,
  content: string
): boolean {
  // TODO: This is fine for small texts, but for large texts we will need
  // to provide a piece table or rope, since that will perform better.
  const results = traverse(obj, ptr);
  if (results === null) {
    return false;
  }

  if (
    Array.isArray(results.parent) &&
    (results.leaf as number) < results.parent.length &&
    typeof results.parent[results.leaf] === "string" &&
    idx <= results.parent[results.leaf].length
  ) {
    let newString = results.parent[results.leaf];
    newString = newString.slice(0, idx) + content + newString.slice(idx);
    results.parent[results.leaf] = newString;
    return true;
  } else if (
    results.leaf in results.parent &&
    typeof results.parent[results.leaf] === "string" &&
    idx <= results.parent[results.leaf].length
  ) {
    let newString = results.parent[results.leaf];
    newString = newString.slice(0, idx) + content + newString.slice(idx);
    results.parent[results.leaf] = newString;
    return true;
  }

  return false;
}

export function operationStringRemove(
  obj: any,
  ptr: Array<string>,
  idx: number,
  len: number
): boolean {
  // TODO: This is fine for small texts, but for large texts we will need
  // to provide a piece table or rope, since that will perform better.
  const results = traverse(obj, ptr);
  if (results === null) {
    return false;
  }

  if (
    Array.isArray(results.parent) &&
    (results.leaf as number) < results.parent.length &&
    typeof results.parent[results.leaf] === "string" &&
    idx < results.parent[results.leaf].length
  ) {
    let newString = results.parent[results.leaf];
    newString = newString.slice(0, idx) + newString.slice(idx + len);
    results.parent[results.leaf] = newString;
    return true;
  } else if (
    results.leaf in results.parent &&
    typeof results.parent[results.leaf] === "string" &&
    idx < results.parent[results.leaf].length
  ) {
    let newString = results.parent[results.leaf];
    newString = newString.slice(0, idx) + newString.slice(idx + len);
    results.parent[results.leaf] = newString;
    return true;
  }

  return false;
}
