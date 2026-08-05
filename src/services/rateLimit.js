export class RateLimitState {
  constructor() {
    this.blockedUntil = 0;
  }

  blockFor(milliseconds) {
    this.blockedUntil = Date.now() + milliseconds;
  }

  isBlocked() {
    return Date.now() < this.blockedUntil;
  }
}
