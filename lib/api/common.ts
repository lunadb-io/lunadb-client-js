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
  method: string;

  constructor(
    status: number,
    url: string,
    method: string,
    message: string | null = null
  ) {
    this.status = status;
    this.url = url;
    this.method = method;
    this.message = message;
  }
}

export interface RequestOptions {
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
    this.headers.set("content-type", "application/json");

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
    let response;
    try {
      response = await fetch(req);
    } catch (e) {
      throw new HTTPError(-1, this.url, this.method, e.message);
    }

    if (!response.ok) {
      throw new HTTPError(
        response.status,
        this.url,
        this.method,
        response.statusText
      );
    }

    if (expectJson) {
      try {
        const body = await response.json();
        return new HTTPResponse(response.status, body);
      } catch (e) {
        throw new HTTPError(
          response.status,
          this.url,
          this.method,
          "Failed to parse body as JSON"
        );
      }
    } else {
      return new HTTPResponse(response.status, undefined);
    }
  }
}
