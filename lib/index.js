const HEADER_ANALYZE_QUERY = "x-analyze-query";

class LunaDBClient {
    constructor(db_url) {
        this.db_url = db_url.replace(/\/$/, "");
        this.headers = new Headers();
        this.headers.set("content-type", "application/json");
    }

    toggleQueryAnalysis(toggle) {
        if (bool) {
            this.headers.set(HEADER_ANALYZE_QUERY, "1");
        } else {
            this.headers.delete(HEADER_ANALYZE_QUERY);
        }
    }

    async v0betaCreateDocument(key) {
        return await this.request(
            "/api/v0beta/documents",
            "POST",
            { "key": key }
        );
    }

    async v0betaDeleteDocument(key) {
        return await this.request(
            "/api/v0beta/documents/" + key,
            "DELETE",
        );
    }

    async v0betaLoadDocument(key) {
        return await this.request(
            "/api/v0beta/documents/" + key,
            "GET",
        );
    }

    async v0betaSyncDocument(key, last_synced, deltaset) {
        let body = { "hlc": last_synced };
        if (deltaset) {
            body.deltaset = deltaset;
        }
        return await this.request(
            "/api/v0beta/documents/" + key,
            "PATCH",
            body
        );
    }

    async healthCheck() {
        return await this.request(
            "/sys/healthcheck",
            "GET",
        );
    }

    async request(endpoint, method, body) {
        const url = this.db_url + endpoint;
        let request = new Request(url, {
            method: method,
            headers: this.headers,
            body: body,
        });

        try {
            const response = await fetch(request);
            const body = await response.text();
            if (body == null || body.length == 0) {
                return new APIResponse(response.status);
            } else {
                try {
                    const content = JSON.parse(body);
                    return new APIResponse(response.status, content);
                } catch (error) {
                    console.error("LunaDB: Failed to deserialize response");
                    console.error(error);
                    return new APIResponse(-1);
                }
            }
        } catch (error) {
            console.error("LunaDB: Fetch failed");
            console.error(error);
            return new APIResponse(-1);
        }
    }
}

class APIResponse {
    constructor(status, content) {
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

module.exports = { LunaDBClient, APIResponse };