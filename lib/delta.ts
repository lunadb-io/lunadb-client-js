// @ts-ignore
import JsonPointer from "json-pointer";

export interface InsertOperation {
  op: "insert";
  pointer: string;
  content: any;
}

export interface DeleteOperation {
  op: "delete";
  pointer: string;
}

export interface ReplaceOperation {
  op: "replace";
  pointer: string;
  content: any;
}

export interface IncrementOperation {
  op: "incr";
  pointer: string;
  diff: number;
}

export interface StringInsertOperation {
  op: "stringinsert";
  pointer: string;
  idx: number;
  content: string;
}

export interface StringRemoveOperation {
  op: "stringremove";
  pointer: string;
  idx: number;
  len: number;
}

export type DeltaOperation =
  | InsertOperation
  | DeleteOperation
  | ReplaceOperation
  | IncrementOperation
  | StringInsertOperation
  | StringRemoveOperation;

export type Delta = Array<DeltaOperation>;

const DESTRUCTIVE_OPERATIONS = ["insert", "delete", "replace"];
const UPDATE_IN_PLACE_OPERATIONS = ["incr", "stringinsert", "stringremove"];

export function rebase(
  localOp: DeltaOperation,
  remoteOp: DeltaOperation,
  obj: Object
): DeltaOperation | null {
  if (remoteOp.op === "insert" || remoteOp.op === "delete") {
    try {
      let remotePtrTokens: Array<string> = JsonPointer.parse(remoteOp.pointer);
      let parentArrayPtr = JsonPointer.compile(remotePtrTokens.slice(0, -1));
      let val = JsonPointer.get(obj, parentArrayPtr);
      if (
        Array.isArray(val) &&
        localOp.pointer.startsWith(parentArrayPtr + "/")
      ) {
        let localPtrTokens: Array<string> = JsonPointer.parse(localOp.pointer);
        let remoteIdx = parseInt(remotePtrTokens[remotePtrTokens.length - 1]);
        let localIdx = parseInt(localPtrTokens[remotePtrTokens.length - 1]);
        if (!isNaN(remoteIdx) && !isNaN(localIdx) && remoteIdx <= localIdx) {
          if (remoteOp.op === "insert") {
            localPtrTokens[remotePtrTokens.length - 1] = (
              localIdx + 1
            ).toString();
          } else if (remoteOp.op === "delete" && remoteIdx != localIdx) {
            localPtrTokens[remotePtrTokens.length - 1] = (
              localIdx - 1
            ).toString();
          } else if (remoteOp.op === "delete" && remoteIdx === localIdx) {
            return null;
          }
          let ret = structuredClone(localOp);
          ret.pointer = "/" + localPtrTokens.join("/");
          return ret;
        }
      }
    } catch (e) {
      // no-op
    }
  }

  if (localOp.pointer === remoteOp.pointer) {
    // If a remote update completely replaces the value a local operation
    // updates, then the local operation might not make sense anymore.
    // So when we rebase we tell the local update to get lost.
    const remoteDestructive = DESTRUCTIVE_OPERATIONS.includes(remoteOp.op);
    const localUpdates = UPDATE_IN_PLACE_OPERATIONS.includes(localOp.op);
    if (localUpdates && remoteDestructive) {
      return null;
    }

    if (
      (localOp.op === "stringinsert" || localOp.op === "stringremove") &&
      remoteOp.op === "stringinsert"
    ) {
      let ret = structuredClone(localOp);
      if (remoteOp.idx <= ret.idx) {
        ret.idx += remoteOp.content.length;
      }
      return ret;
    } else if (
      localOp.op === "stringinsert" &&
      remoteOp.op === "stringremove"
    ) {
      let ret = structuredClone(localOp);
      if (remoteOp.idx <= ret.idx) {
        ret.idx -= remoteOp.len;
      }
      return ret;
    } else if (
      localOp.op === "stringremove" &&
      remoteOp.op === "stringremove"
    ) {
      let ret = structuredClone(localOp);
      const localMax = localOp.idx + localOp.len - 1;
      const remoteMax = remoteOp.idx + remoteOp.len - 1;
      // local range is to the left of remote range
      if (localMax < remoteOp.idx) {
        return ret;
      }
      // local range is to the right of remote range
      if (localOp.idx > remoteMax) {
        ret.idx -= remoteOp.len;
        return ret;
      }
      // local range is subset of remote range
      if (localOp.idx >= remoteOp.idx && localMax <= remoteMax) {
        return null;
      }
      // local range is a superset of remote range
      if (localOp.idx <= remoteOp.idx && localMax >= remoteMax) {
        ret.len -= remoteOp.len;
      }
      // local range overlaps the left of remote range
      if (localOp.idx < remoteOp.idx && localMax >= remoteOp.idx) {
        ret.len = remoteOp.idx - ret.idx;
        return ret;
      }
      // local range overlaps the right of remote range
      if (localOp.idx > remoteOp.idx && localMax > remoteMax) {
        ret.len = localMax - remoteMax;
        ret.idx -= localOp.idx - remoteOp.idx;
        return ret;
      }
      return ret;
    }
  }

  return structuredClone(localOp);
}

export function applyOp(operation: DeltaOperation, obj: Object) {
  switch (operation.op) {
    case "insert":
      try {
        JsonPointer.set(this.baseContent, operation.pointer, operation.content);
      } catch (e) {}
      break;
    case "delete":
      try {
        JsonPointer.delete(this.baseContent, operation.pointer);
      } catch (e) {}
      break;
    case "replace":
      try {
        JsonPointer.set(this.baseContent, operation.pointer, operation.content);
      } catch (e) {}
      break;
    case "incr":
      try {
        let num = JsonPointer.get(this.baseContent, operation.pointer);
        if (typeof num === "number") {
          num += operation.diff;
        }
      } catch (e) {}
      break;
    case "stringinsert":
      try {
        let strins = JsonPointer.get(this.baseContent, operation.pointer);
        if (typeof strins === "string") {
          strins =
            strins.slice(0, operation.idx) +
            operation.content +
            strins.slice(operation.idx);
          JsonPointer.set(this.baseContent, operation.pointer, strins);
        }
      } catch (e) {}
      break;
    case "stringremove":
      try {
        let strrem = JsonPointer.get(this.baseContent, operation.pointer);
        if (typeof strrem === "string") {
          strrem =
            strrem.slice(0, operation.idx) +
            strrem.slice(operation.idx + operation.len);
          JsonPointer.set(this.baseContent, operation.pointer, strrem);
        }
      } catch (e) {}
      break;
    default:
      throw new Error("Operation '" + operation + "' was unable to be applied");
  }
}
