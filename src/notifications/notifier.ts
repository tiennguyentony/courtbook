export interface Notifier {
  send(userId: string, message: string): void;
}
