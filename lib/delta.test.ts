import { expect, test } from "vitest";
import {
  IncrementOperation,
  InsertOperation,
  StringInsertOperation,
  StringRemoveOperation,
  rebase,
} from "./delta";

test("concurrent array inserts causing pointer shift", () => {
  const obj = { arr: ["baz"] };
  const local: InsertOperation = {
    op: "insert",
    pointer: "/arr/1",
    content: "foo",
  };
  const remote: InsertOperation = {
    op: "insert",
    pointer: "/arr/1",
    content: "bar",
  };
  expect(rebase(local, remote, obj)).toStrictEqual({
    op: "insert",
    pointer: "/arr/2",
    content: "foo",
  });
});

test("concurrent array inserts without pointer shift", () => {
  const obj = { arr: ["baz"] };
  const local: InsertOperation = {
    op: "insert",
    pointer: "/arr/1",
    content: "foo",
  };
  const remote: InsertOperation = {
    op: "insert",
    pointer: "/arr/2",
    content: "bar",
  };
  expect(rebase(local, remote, obj)).toStrictEqual({
    op: "insert",
    pointer: "/arr/1",
    content: "foo",
  });
});

test("concurrent array inserts with local as nested child", () => {
  const obj = { arr: ["baz", { key: "nil" }] };
  const local: InsertOperation = {
    op: "insert",
    pointer: "/arr/1/key",
    content: "foo",
  };
  const remote: InsertOperation = {
    op: "insert",
    pointer: "/arr/0",
    content: "bar",
  };
  expect(rebase(local, remote, obj)).toStrictEqual({
    op: "insert",
    pointer: "/arr/2/key",
    content: "foo",
  });
});

test("concurrent inserts discriminate between arrays and objects", () => {
  const obj = { obj: { 1: "one" } };
  const local: InsertOperation = {
    op: "insert",
    pointer: "/arr/1",
    content: "foo",
  };
  const remote: InsertOperation = {
    op: "insert",
    pointer: "/arr/0",
    content: "bar",
  };
  expect(rebase(local, remote, obj)).toStrictEqual({
    op: "insert",
    pointer: "/arr/1",
    content: "foo",
  });
});

test("local increments are blown out by remote replacements", () => {
  const obj = { i: 0 };
  const local: IncrementOperation = {
    op: "incr",
    pointer: "/i",
    diff: 1,
  };
  const remote: InsertOperation = {
    op: "insert",
    pointer: "/i",
    content: 100,
  };
  expect(rebase(local, remote, obj)).toStrictEqual(null);
});

test("local string ops are blown out by remote replacements", () => {
  const obj = { s: "" };
  const localInsert: StringInsertOperation = {
    op: "stringinsert",
    pointer: "/s",
    idx: 0,
    content: "inserted",
  };
  const localRemove: StringRemoveOperation = {
    op: "stringremove",
    pointer: "/s",
    idx: 0,
    len: 5,
  };
  const remote: InsertOperation = {
    op: "insert",
    pointer: "/s",
    content: "replaced!",
  };
  expect(rebase(localInsert, remote, obj)).toStrictEqual(null);
  expect(rebase(localRemove, remote, obj)).toStrictEqual(null);
});

test("concurrent text edits with index shift", () => {
  const obj = { s: "" };
  const localInsert: StringInsertOperation = {
    op: "stringinsert",
    pointer: "/s",
    idx: 10,
    content: "local",
  };
  const localRemove: StringRemoveOperation = {
    op: "stringremove",
    pointer: "/s",
    idx: 10,
    len: 5,
  };
  const remoteInsert: StringInsertOperation = {
    op: "stringinsert",
    pointer: "/s",
    idx: 10,
    content: "remote",
  };
  const remoteRemove: StringRemoveOperation = {
    op: "stringremove",
    pointer: "/s",
    idx: 10,
    len: 5,
  };
  expect(rebase(localInsert, remoteInsert, obj)).toStrictEqual({
    op: "stringinsert",
    pointer: "/s",
    idx: 16,
    content: "local",
  });
  expect(rebase(localInsert, remoteRemove, obj)).toStrictEqual({
    op: "stringinsert",
    pointer: "/s",
    idx: 5,
    content: "local",
  });
  expect(rebase(localRemove, remoteInsert, obj)).toStrictEqual({
    op: "stringremove",
    pointer: "/s",
    idx: 16,
    len: 5,
  });
  // concurrent removes are handled in separate test
});

// todo: arrays
test("concurrent text removes are idempotent", () => {
  const obj = { s: "" };
  const samples = [
    [[10, 5], null],
    [[11, 3], null],
    [
      [9, 7],
      [9, 1],
    ],
    [
      [5, 5],
      [5, 5],
    ],
    [
      [15, 5],
      [10, 5],
    ],
    [
      [8, 5],
      [8, 2],
    ],
    [
      [13, 5],
      [10, 3],
    ],
  ];

  for (const sample of samples) {
    let local: StringRemoveOperation = {
      op: "stringremove",
      pointer: "/s",
      // @ts-ignore
      idx: sample[0][0],
      // @ts-ignore
      len: sample[0][1],
    };
    let remote: StringRemoveOperation = {
      op: "stringremove",
      pointer: "/s",
      idx: 10,
      len: 5,
    };

    if (sample[1]) {
      expect(rebase(local, remote, obj)).toStrictEqual({
        op: "stringremove",
        pointer: "/s",
        // @ts-ignore
        idx: sample[1][0],
        // @ts-ignore
        len: sample[1][1],
      });
    } else {
      expect(rebase(local, remote, obj)).toStrictEqual(null);
    }
  }
});
