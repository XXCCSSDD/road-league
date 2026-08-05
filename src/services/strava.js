export class StravaService {
  constructor({ clientId, clientSecret }) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  isConfigured() {
    return Boolean(this.clientId && this.clientSecret);
  }
}
