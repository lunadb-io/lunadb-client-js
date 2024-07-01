import { Delta, applyOp } from "./delta";
import { parsePointer, traverse } from "./patch";

export default class LunaDBDocument {
  documentId: string;
  baseContent: object;
  lastSynced: string;

  constructor(documentId: string, baseContent: object, lastSynced: string) {
    this.documentId = documentId;
    this.baseContent = baseContent;
    this.lastSynced = lastSynced;
  }

  applyTransaction(txn: DocumentTransaction) {
    this.lastSynced = txn.baseTimestamp;
    txn.changes.forEach((op) => {
      applyOp(op, this.baseContent);
    });
  }

  newTransaction() {
    return new DocumentTransaction(this.lastSynced, []);
  }

  get(pointer: string) {
    const frags = parsePointer(pointer);
    const results = traverse(this.baseContent, frags);
    if (results === null) {
      return undefined;
    } else {
      return results.parent[results.leaf];
    }
  }
}

export class DocumentTransaction {
  baseTimestamp: string;
  changes: Delta;

  constructor(baseTimestamp: string, changes: Delta) {
    this.baseTimestamp = baseTimestamp;
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
