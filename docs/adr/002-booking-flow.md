# ADR-002: Booking flow

**Status:** Accepted

## Context

Players need to book a slot and pay for it. We want the flow to be as short
as possible on mobile.

## Decision

A single request books a slot: `POST /bookings` with a `slotId` creates the
booking in status `CONFIRMED` and charges the slot's price immediately. There
is no intermediate state.

Cancelling sets the booking to `CANCELLED` and refunds according to the
cancellation policy.

## Consequences

- One round trip from "pick a slot" to "booked".
- If payment fails, the booking request fails as a whole.
- Two players racing for the same slot: the second gets a 409.
