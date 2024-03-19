import { expect, test } from "vitest";
import Nock from "nock";
import LunaDBAPIClientBridge from ".";
import LunaDBDocument, { DocumentTransaction } from "./document";

test("create document", async () => {
  const client = new LunaDBAPIClientBridge("http://localhost");
  const scope = Nock("http://localhost", {
    reqheaders: { "content-type": "application/json" },
  })
    .post("/api/v0beta/document")
    .reply(201);
  await client.createDocument("test");
});

test("delete document", async () => {
  const client = new LunaDBAPIClientBridge("http://localhost");
  const scope = Nock("http://localhost", {
    reqheaders: { "content-type": "application/json" },
  })
    .delete("/api/v0beta/document/test")
    .reply(204);
  await client.deleteDocument("test");
});

test("load document", async () => {
  const client = new LunaDBAPIClientBridge("http://localhost");
  const scope = Nock("http://localhost")
    .defaultReplyHeaders({ "Content-Type": "application/json" })
    .get("/api/v0beta/document/test")
    .reply(200, { hlc: "1234", contents: { hello: "world" } });
  const doc = await client.loadDocument("test");
  expect(doc.lastSynced).toEqual("1234");
  expect(doc.baseContent).toEqual({ hello: "world" });
  expect(doc.get("/hello")).toEqual("world");
});

test("sync document", async () => {
  const client = new LunaDBAPIClientBridge("http://localhost");
  const scope = Nock("http://localhost")
    .defaultReplyHeaders({ "Content-Type": "application/json" })
    .patch("/api/v0beta/document/test")
    .reply(201, {
      hlc: "1234",
      changes: [{ op: "insert", pointer: "/a", content: "hello!" }],
    });
  let doc = new LunaDBDocument("test", {}, "0");
  const resolved = await client.syncDocument(doc, doc.newTransaction());
  expect(doc.lastSynced).toEqual("1234");
  expect(doc.baseContent).toEqual({ a: "hello!" });
  expect(resolved.changes).toEqual([
    { op: "insert", pointer: "/a", content: "hello!" },
  ]);
});
