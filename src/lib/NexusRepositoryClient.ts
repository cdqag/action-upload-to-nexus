import { URL } from 'node:url';
import { existsSync, openAsBlob } from 'node:fs';

import * as core from '@actions/core';

import { Client, FormData } from 'undici'

import { InvalidURLProtocolException } from './errors/InvalidURLProtocolException';
import { FileDoesNotExistException } from './errors/FileDoesNotExistException';
import { normalizeDestPath, basicAuthHeader } from './utils';

const USER_AGENT = 'cdqag/action-upload-to-nexus'

export class NexusRepositoryClient {
  private instanceUrl: URL;
  private repository: string;
  private defaultDestination: string;
  private authHeader: string;
  
  private client: Client;

  constructor(
    instanceUrl: string,
    repository: string,
    defaultDestination: string = '',
    username: string = '',
    password: string = ''
  ) {
    this.instanceUrl = new URL(instanceUrl);
    if (this.instanceUrl.protocol !== 'http:' && this.instanceUrl.protocol !== 'https:') {
      throw new InvalidURLProtocolException(this.instanceUrl.protocol);
    }

    this.repository = repository;
    this.defaultDestination = defaultDestination;

    this.client = new Client(this.instanceUrl);

    this.authHeader = username !== '' ? basicAuthHeader(username, password) : '';
  }

  get apiV1(): string {
    return `/service/rest/v1`;
  }

  // https://help.sonatype.com/en/components-api.html#components-api
  get apiV1components(): string {
    return `${this.apiV1}/components`;
  }

  get headers(): Record<string, string> {
    const h = {
      'User-Agent': USER_AGENT
    };

    if (this.authHeader !== '') {
      h['Authorization'] = this.authHeader;
    }

    return h;
  }

  private async requestPost(path: string, body: FormData) {
    return this.client.request({
      method: 'POST',
      path,
      headers: this.headers,
      body
    });
  }

  async uploadFile(src: string, dest: string) {
    if (!existsSync(src)) {
      throw new FileDoesNotExistException(src);
    }
    
    const destPath = normalizeDestPath(`${this.defaultDestination}/${dest}`);
    const destDir = destPath.substring(0, destPath.lastIndexOf('/'));
    const destFile = destPath.substring(destPath.lastIndexOf('/') + 1);

    // https://help.sonatype.com/en/components-api.html#raw
    const formData = new FormData();
    formData.append('raw.directory', destDir);
    formData.append('raw.asset0', await openAsBlob(src));
    formData.append('raw.asset0.filename', destFile);

    core.info(`➡️ Uploading file '${src}' to '${destPath}'`);
    const { statusCode, body } = await this.requestPost(`${this.apiV1components}?repository=${this.repository}`, formData)
    const bodyText = await body.text();
    
    let errorMessage = '';
    switch (statusCode) {
      case 204:
        return 'OK';

      case 401:
        errorMessage = 'Server responded with 401 - Unauthorized. Please check if the username and password are correct.';
        break;

      case 404:
        errorMessage = `Server responded with 404 - Not Found. Please check if the instance URL is correct and repository '${this.repository}' exists.`;
        break;

      default:
        errorMessage = `Server responded with ${statusCode}`;
        break;
    }

    if (bodyText !== '') {
      errorMessage += `\n${bodyText}`;
    }

    throw new Error(errorMessage);
  }

}
