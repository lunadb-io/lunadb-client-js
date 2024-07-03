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
const ARRAY_SHIFT_OPERATIONS = ["insert", "delete"];
const IN_PLACE_OPERATIONS = ["incr", "stringinsert", "stringremove"];
const STRING_OPERATIONS = ["stringinsert", "stringremove"];

export function rebase(
  localOp: DeltaOperation,
  remoteOp: DeltaOperation,
  obj: Object
): DeltaOperation | null {
  const equalPointer = localOp.pointer === remoteOp.pointer;

  if (DESTRUCTIVE_OPERATIONS.includes(remoteOp.op)) {
    if (equalPointer && IN_PLACE_OPERATIONS.includes(localOp.op)) {
      // In-place operations are fully invalidated by a destructive operation.
      return null;
    } else if (localOp.pointer.startsWith(remoteOp.pointer + "/")) {
      // localOp operations on a subtree of the destructive operation.
      // Means that localOp gets invalidated.
      // TODO: Would love to make this "optional" when we add support
      // for auto-creating subtrees that don't exist.
      return null;
    }
  }

  // The addition or removal of array elements will cause local operations to shift.
  if (ARRAY_SHIFT_OPERATIONS.includes(remoteOp.op)) {
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

  if (
    equalPointer &&
    STRING_OPERATIONS.includes(remoteOp.op) &&
    STRING_OPERATIONS.includes(localOp.op)
  ) {
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
