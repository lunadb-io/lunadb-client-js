// @ts-ignore
import JsonPointer from "json-pointer";

import { Delta, DeltaOperation } from "./delta";

export default class LunaDBDocument {
  documentId: string;
  baseContent: object;
  lastSynced: string;

  constructor(documentId: string, baseContent: object, lastSynced: string) {
    this.documentId = documentId;
    this.baseContent = baseContent;
    this.lastSynced = lastSynced;
  }

  applyDelta(delta: Delta) {
    delta.forEach((op) => {
      this.applyOp(op);
    });
  }

  applyOp(operation: DeltaOperation) {
    switch (operation.op) {
      case "insert":
        try {
          JsonPointer.set(
            this.baseContent,
            operation.pointer,
            operation.content
          );
        } catch (e) {}
        break;
      case "delete":
        try {
          JsonPointer.delete(this.baseContent, operation.pointer);
        } catch (e) {}
        break;
      case "replace":
        try {
          JsonPointer.set(
            this.baseContent,
            operation.pointer,
            operation.content
          );
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
          }
        } catch (e) {}
        break;
      default:
        throw new Error(
          "Operation '" + operation + "' was unable to be applied"
        );
    }
  }
}

export class DocumentTransaction {
  changes: Delta;

  constructor(changes: Delta) {
    this.changes = changes;
  }

  insert(pointer: string, content: any) {
    this.changes.push({
      op: "insert",
      pointer: pointer,
      content: content,
    });
  }

  delete(pointer: string) {
    this.changes.push({
      op: "delete",
      pointer: pointer,
    });
  }

  replace(pointer: string, content: any) {
    this.changes.push({
      op: "replace",
      pointer: pointer,
      content: content,
    });
  }

  increment(pointer: string, diff: number) {
    this.changes.push({
      op: "incr",
      pointer: pointer,
      diff: diff,
    });
  }

  stringInsert(pointer: string, idx: number, content: string) {
    this.changes.push({
      op: "stringinsert",
      pointer: pointer,
      idx: idx,
      content: content,
    });
  }

  stringRemove(pointer: string, idx: number, len: number) {
    this.changes.push({
      op: "stringremove",
      pointer: pointer,
      idx: idx,
      len: len,
    });
  }
}
