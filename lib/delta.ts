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
