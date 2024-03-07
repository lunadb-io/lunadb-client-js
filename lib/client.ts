import { Delta } from "./delta";

const HEADER_ANALYZE_QUERY = "x-analyze-query";

export default class LunaDBAPIClient {
  db_url: string;
  headers: Headers;

  constructor(db_url: string) {
    this.db_url = db_url.replace(/\/$/, "");
    this.headers = new Headers();
    this.headers.set("content-type", "application/json");
  }

  enableQueryAnalysis() {
    this.headers.set(HEADER_ANALYZE_QUERY, "1");
  }

  disableQueryAnalysis() {
    this.headers.delete(HEADER_ANALYZE_QUERY);
  }

  async v0betaCreateDocument(key: string) {
    return await this.request("/api/v0beta/document", "POST", { key: key });
  }

  async v0betaDeleteDocument(key: string) {
    return await this.request(
      "/api/v0beta/document/" + key,
      "DELETE",
      undefined
    );
  }

  async v0betaLoadDocument(key: string) {
    return await this.request("/api/v0beta/document/" + key, "GET", undefined);
  }

  async v0betaSyncDocument(key: string, last_synced: string, deltaset: Delta) {
    let body: any = { hlc: last_synced };
    if (deltaset) {
      body.changes = deltaset;
    }
    return await this.request("/api/v0beta/document/" + key, "PATCH", body);
  }

  async healthCheck() {
    return await this.request("/sys/healthcheck", "GET", undefined);
  }

  async request(endpoint: string, method: string, body: object | undefined) {
    const url = this.db_url + endpoint;
    let config: any = {
      method: method,
      headers: this.headers,
    };
    if (body !== undefined) {
      config.body = JSON.stringify(body);
    }

    let request = new Request(url, config);

    try {
      const response = await fetch(request);

      try {
        const body = await response.json();
        return new APIResponse(response.status, body);
      } catch (e) {
        return new APIResponse(response.status, undefined);
      }
    } catch (e) {
      return new APIResponse(-1, undefined);
    }
  }
}

export class APIResponse {
  status: number;
  content: any | undefined;

  constructor(status: number, content: any | undefined) {
    this.status = status;
    this.content = content;
  }

  isError() {
    return this.status < 0;
  }

  isSuccess() {
    return this.status >= 200 && this.status < 300;
  }
}
