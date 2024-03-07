import LunaDBAPIClient from "./client";
import LunaDBDocument, { DocumentTransaction } from "./document";

export { LunaDBDocument, DocumentTransaction };

export interface DocumentAPIClientBridge {
  createDocument(documentId: string): Promise<void>;
  deleteDocument(documentId: string): Promise<void>;
  loadDocument(documentId: string): Promise<LunaDBDocument>;
  syncDocument(
    document: LunaDBDocument,
    transaction: DocumentTransaction
  ): Promise<DocumentTransaction>;
}

export default class LunaDBAPIClientBridge implements DocumentAPIClientBridge {
  client: LunaDBAPIClient;

  constructor(db_url: string) {
    this.client = new LunaDBAPIClient(db_url);
  }

  async createDocument(documentId: string): Promise<void> {
    let resp = await this.client.v0betaCreateDocument(documentId);
    if (resp.isError()) {
      throw new Error("Failed to create document");
    }
  }

  async loadDocument(documentId: string): Promise<LunaDBDocument> {
    let resp = await this.client.v0betaLoadDocument(documentId);
    if (resp.isSuccess()) {
      return new LunaDBDocument(
        documentId,
        resp.content.contents,
        resp.content.hlc
      );
    } else {
      throw new Error("Failed to create document");
    }
  }

  async syncDocument(
    document: LunaDBDocument,
    transaction: DocumentTransaction
  ): Promise<DocumentTransaction> {
    let resp = await this.client.v0betaSyncDocument(
      document.documentId,
      transaction.baseTimestamp,
      transaction.changes
    );

    if (resp.isSuccess()) {
      let txn = new DocumentTransaction(resp.content.hlc, resp.content.changes);
      document.applyTransaction(txn);
      return txn;
    } else {
      throw new Error("Failed to sync document");
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    let resp = await this.client.v0betaDeleteDocument(documentId);
    if (resp.isError()) {
      throw new Error("Failed to create document");
    }
  }
}
