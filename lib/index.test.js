const { LunaDBClient, APIResponse } = require("./index.js");
const nock = require("nock");

test("v0beta: creates document", async () => {
  const client = new LunaDBClient("http://localhost");
  const scope = nock("http://localhost", {
    reqheaders: { "content-type": "application/json" },
  })
    .post("/api/v0beta/documents")
    .reply(201);
  const resp = await client.v0betaCreateDocument("test");
  expect(resp.isSuccess()).toBe(true);
  expect(resp.status).toBe(201);
});

test("v0beta: deletes document", async () => {
  const client = new LunaDBClient("http://localhost");
  const scope = nock("http://localhost")
    .delete("/api/v0beta/documents/test")
    .reply(204);
  const resp = await client.v0betaDeleteDocument("test");
  expect(resp.isSuccess()).toBe(true);
  expect(resp.status).toBe(204);
});

test("v0beta: loads document", async () => {
  const client = new LunaDBClient("http://localhost");
  const scope = nock("http://localhost")
    .defaultReplyHeaders({ "Content-Type": "application/json" })
    .get("/api/v0beta/documents/test")
    .reply(200, {});
  const resp = await client.v0betaLoadDocument("test");
  expect(resp.isSuccess()).toBe(true);
  expect(resp.status).toBe(200);
  expect(resp.content).toStrictEqual({});
});

test("v0beta: syncs document empty", async () => {
  const client = new LunaDBClient("http://localhost");
  const scope = nock("http://localhost")
    .defaultReplyHeaders({ "Content-Type": "application/json" })
    .patch("/api/v0beta/documents/test")
    .reply(200, {
      hlc: 1,
      changes: [{ op: "insert", pointer: "/a", content: "hello!" }],
    });
  const resp = await client.v0betaSyncDocument("test", 0);
  expect(resp.isSuccess()).toBe(true);
  expect(resp.status).toBe(200);
  expect(resp.content).toStrictEqual({
    hlc: 1,
    changes: [{ op: "insert", pointer: "/a", content: "hello!" }],
  });
});

test("v0beta: syncs document non-empty", async () => {
  const client = new LunaDBClient("http://localhost");
  const scope = nock("http://localhost")
    .defaultReplyHeaders({ "Content-Type": "application/json" })
    .patch("/api/v0beta/documents/test")
    .reply(200, {
      hlc: 1,
      changes: [{ op: "insert", pointer: "/a", content: "hello!" }],
    });
  const resp = await client.v0betaSyncDocument("test", 0, [
    { op: "insert", pointer: "/a", content: "test" },
  ]);
  expect(resp.isSuccess()).toBe(true);
  expect(resp.status).toBe(200);
  expect(resp.content).toStrictEqual({
    hlc: 1,
    changes: [{ op: "insert", pointer: "/a", content: "hello!" }],
  });
});
