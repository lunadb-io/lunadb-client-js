import { Delta } from "../base/delta";
import {
  HTTPError,
  HTTPResponse,
  LunaDBRequest,
  RequestOptions,
} from "./common";

export async function v0betaCreateDocument(
  domain: string,
  key: string,
  options?: RequestOptions
): Promise<HTTPResponse> {
  let url: string;
  try {
    url = new URL("api/v0beta/document", domain).toString();
  } catch (e) {
    throw new HTTPError(-1, domain, "post", "Invalid domain");
  }
  const req = new LunaDBRequest(url, "post", options);
  return await req.execute({ key: key });
}

export async function v0betaDeleteDocument(
  domain: string,
  key: string,
  options?: RequestOptions
): Promise<HTTPResponse> {
  let url: string;
  try {
    url = new URL("api/v0beta/document/" + key, domain).toString();
  } catch (e) {
    throw new HTTPError(-1, domain, "delete", "Invalid domain");
  }
  const req = new LunaDBRequest(url, "delete", options);
  return await req.execute();
}

export async function v0betaGetDocumentContent(
  domain: string,
  key: string,
  options?: RequestOptions
): Promise<HTTPResponse> {
  let url: string;
  try {
    url = new URL("api/v0beta/document/" + key, domain).toString();
  } catch (e) {
    throw new HTTPError(-1, domain, "get", "Invalid domain");
  }
  const req = new LunaDBRequest(url, "get", options);
  return await req.execute(null, true);
}

export async function v0betaSyncDocument(
  domain: string,
  key: string,
  baseTimestamp?: string,
  delta?: Delta,
  excludeRebased?: boolean,
  sessionId?: string,
  sessionState?: string,
  sessionMetadata?: any,
  fetchAllPresenceData?: boolean,
  fetchNoPresenceData?: boolean,
  options?: RequestOptions
) {
  let url: string;
  try {
    url = new URL("api/v0beta/document/" + key, domain).toString();
  } catch (e) {
    throw new HTTPError(-1, domain, "PATCH", "Invalid domain");
  }
  // this is case-sensitive
  const req = new LunaDBRequest(url, "PATCH", options);
  let body: any = {
    hlc: baseTimestamp,
    fetch_all_presence_data: fetchAllPresenceData,
    exclude_presence: fetchNoPresenceData,
    changes: delta,
    exclude_rebased: excludeRebased,
  };
  if (sessionId) {
    body.presence = {
      id: sessionId,
      state: sessionState || "joined",
      metadata: sessionMetadata,
    };
  }
  return await req.execute(body, true);
}
