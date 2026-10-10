// Services throw DomainErrors and never know about HTTP. The single error
// handler in app.ts maps each code to a status.
export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFound extends DomainError {
  constructor(what: string) {
    super('NOT_FOUND', `${what} not found`);
  }
}

export class Unauthorized extends DomainError {
  constructor() {
    super('UNAUTHORIZED', 'Login required');
  }
}

export class Forbidden extends DomainError {
  constructor(message = 'Not allowed') {
    super('FORBIDDEN', message);
  }
}

export class SlotUnavailable extends DomainError {
  constructor(slotId: string) {
    super('SLOT_UNAVAILABLE', `Slot ${slotId} is not available`);
  }
}

export class HoldExpired extends DomainError {
  constructor(bookingId: string) {
    super('HOLD_EXPIRED', `Hold on booking ${bookingId} has expired`);
  }
}

export class InvalidTransition extends DomainError {
  constructor(from: string, to: string) {
    super('INVALID_TRANSITION', `Cannot move booking from ${from} to ${to}`);
  }
}

export class ScheduleLocked extends DomainError {
  constructor(date: string) {
    super('SCHEDULE_LOCKED', `Schedule for ${date} has confirmed bookings`);
  }
}

export const HTTP_STATUS_BY_CODE: Record<string, number> = {
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  SLOT_UNAVAILABLE: 409,
  HOLD_EXPIRED: 409,
  INVALID_TRANSITION: 409,
  SCHEDULE_LOCKED: 409,
};
