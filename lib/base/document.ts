import { Delta } from "./delta";

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
