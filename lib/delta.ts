import {
  compilePointer,
  operationDelete,
  operationIncrement,
  operationInsert,
  operationReplace,
  operationStringInsert,
  operationStringRemove,
  parsePointer,
  traverse,
} from "./patch";

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
  // The addition or removal of array elements will cause local operations to shift.
  if (remoteOp.op === "insert" || remoteOp.op === "delete") {
    let remotePtrTokens = parsePointer(remoteOp.pointer);
    let traversal = traverse(obj, remotePtrTokens);
    if (traversal !== null && Array.isArray(traversal.parent)) {
      let parentArrayPtr = compilePointer(remotePtrTokens.slice(0, -1));
      if (localOp.pointer.startsWith(parentArrayPtr + "/")) {
        let localPtrTokens = parsePointer(localOp.pointer);
        let localIdx = parseInt(localPtrTokens[remotePtrTokens.length - 1]);
        if (!isNaN(localIdx) && (traversal.leaf as number) <= localIdx) {
          if (remoteOp.op === "insert") {
            localPtrTokens[remotePtrTokens.length - 1] = (
              localIdx + 1
            ).toString();
          } else if (traversal.leaf != localIdx) {
            localPtrTokens[remotePtrTokens.length - 1] = (
              localIdx - 1
            ).toString();
          } else {
            // Deletions are idempotent.
            return null;
          }
          let ret = structuredClone(localOp);
          ret.pointer = compilePointer(localPtrTokens);
          return ret;
        }
      }
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

    // Updates to string content will require positional corrections.
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
      const localMax = localOp.idx + localOp.len - 1;
      const remoteMax = remoteOp.idx + remoteOp.len - 1;
      // local range is to the right of remote range
      if (localOp.idx > remoteMax) {
        let ret = structuredClone(localOp);
        ret.idx -= remoteOp.len;
        return ret;
      }
      // local range is subset of remote range
      else if (localOp.idx >= remoteOp.idx && localMax <= remoteMax) {
        return null;
      }
      // local range is a superset of remote range
      else if (localOp.idx <= remoteOp.idx && localMax >= remoteMax) {
        let ret = structuredClone(localOp);
        ret.len -= remoteOp.len;
        return ret;
      }
      // local range overlaps the left of remote range
      else if (localOp.idx < remoteOp.idx && localMax >= remoteOp.idx) {
        let ret = structuredClone(localOp);
        ret.len = remoteOp.idx - ret.idx;
        return ret;
      }
      // local range overlaps the right of remote range
      else if (localOp.idx > remoteOp.idx && localMax > remoteMax) {
        let ret = structuredClone(localOp);
        ret.len = localMax - remoteMax;
        ret.idx -= localOp.idx - remoteOp.idx;
        return ret;
      }
    }
  }

  return localOp;
}

export function applyOp(operation: DeltaOperation, obj: Object) {
  let ptr = parsePointer(operation.pointer);
  switch (operation.op) {
    case "insert":
      operationInsert(obj, ptr, operation.content);
      break;
    case "delete":
      operationDelete(obj, ptr);
      break;
    case "replace":
      operationReplace(obj, ptr, operation.content);
      break;
    case "incr":
      operationIncrement(obj, ptr, operation.diff);
      break;
    case "stringinsert":
      operationStringInsert(obj, ptr, operation.idx, operation.content);
      break;
    case "stringremove":
      operationStringRemove(obj, ptr, operation.idx, operation.len);
      break;
    default:
      throw new Error("Operation '" + operation + "' was unable to be applied");
  }
}
