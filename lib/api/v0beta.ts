import { Delta } from "../base/delta";
import {
  HTTPError,
  HTTPResponse,
  LunaDBRequest,
  RequestOptions,
} from "./common";

export async function createDocument(
  domain: string,
  key: string,
  options?: RequestOptions
): Promise<HTTPResponse> {
  let url: string;
  try {
    url = new URL("api/v0beta/document", domain).toString();
  } catch (e) {
    throw new HTTPError(-1, domain, "Invalid domain");
  }
  const req = new LunaDBRequest(url, "post", options);
  return await req.execute({ key: key });
}

export async function deleteDocument(
  domain: string,
  key: string,
  options?: RequestOptions
): Promise<HTTPResponse> {
  let url: string;
  try {
    url = new URL("api/v0beta/document/" + key, domain).toString();
  } catch (e) {
    throw new HTTPError(-1, domain, "Invalid domain");
  }
  const req = new LunaDBRequest(url, "delete", options);
  return await req.execute();
}

export async function getDocumentContent(
  domain: string,
  key: string,
  options?: RequestOptions
): Promise<HTTPResponse> {
  let url: string;
  try {
    url = new URL("api/v0beta/document/" + key, domain).toString();
  } catch (e) {
    throw new HTTPError(-1, domain, "Invalid domain");
  }
  const req = new LunaDBRequest(url, "get", options);
  return await req.execute(null, true);
}

export async function syncDocument(
  domain: string,
  key: string,
  baseTimestamp?: string,
  delta?: Delta,
  sessionId?: string,
  sessionMetadata?: any,
  fetchAllPresenceData?: boolean,
  fetchNoPresenceData?: boolean,
  options?: RequestOptions
) {
  let url: string;
  try {
    url = new URL("api/v0beta/document/" + key, domain).toString();
  } catch (e) {
    throw new HTTPError(-1, domain, "Invalid domain");
  }
  const req = new LunaDBRequest(url, "patch", options);
  return await req.execute(
    {
      hlc: baseTimestamp,
      changes: delta,
      presence: {
        id: sessionId,
        metadata: sessionMetadata,
      },
      fetch_all_presence_data: fetchAllPresenceData,
      exclude_presence: fetchNoPresenceData,
    },
    true
  );
}
