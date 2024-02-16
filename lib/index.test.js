const { LunaDBClient, APIResponse } = require("./index.js");
const nock = require("nock");

test("v0beta: creates document", async () => {
    const client = new LunaDBClient("http://localhost");
    const scope = nock("http://localhost", { reqheaders: { "content-type": "application/json" } }).post("/api/v0beta/documents").reply(201);
    const resp = await client.v0betaCreateDocument("test");
    expect(resp.isSuccess()).toBe(true);
    expect(resp.status).toBe(201);
});