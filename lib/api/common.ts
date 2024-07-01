// export class LunaDBHTTPClient {
//   url: string;
//   constructor(url: string) {
//     this.url = url.replace(/\/$/, "");
//   }
// }

export class HTTPResponse {
  status: number;
  content: any;

  constructor(status: number, content: any) {
    this.status = status;
    this.content = content;
  }
}

export class HTTPError {
  status: number;
  message: string | null;
  url: string;

  constructor(status: number, url: string, message: string | null = null) {
    this.status = status;
    this.url = url;
    this.message = message;
  }
}

export interface RequestOptions {
  contentType: string | undefined;
  basicAuth: string | undefined;
}

export class LunaDBRequest {
  url: string;
  method: string;
  headers: Headers;

  constructor(url: string, method: string, options?: RequestOptions) {
    this.url = url;
    this.method = method;
    this.headers = new Headers();

    if (options?.contentType) {
      this.headers.set("content-type", options.contentType);
    }
    if (options?.basicAuth) {
      this.headers.set("authorization", "Basic " + options.basicAuth);
    }
  }

  async execute(
    body?: any,
    expectJson: boolean = false
  ): Promise<HTTPResponse> {
    let config: any = {
      method: this.method,
      headers: this.headers,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    let req = new Request(this.url, config);
    try {
      const response = await fetch(req);

      if (expectJson) {
        try {
          const body = await response.json();
          return new HTTPResponse(response.status, body);
        } catch (e) {
          throw new HTTPError(
            response.status,
            this.url,
            "Failed to parse body as JSON"
          );
        }
      } else {
        return new HTTPResponse(response.status, undefined);
      }
    } catch (e) {
      throw new HTTPError(0, this.url, e.toString());
    }
  }
}
