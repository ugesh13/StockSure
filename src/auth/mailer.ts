export interface Mailer {
  sendPasswordReset(toEmail: string, resetLink: string): Promise<void>;
}

export class ConsoleMailer implements Mailer {
  async sendPasswordReset(toEmail: string, resetLink: string): Promise<void> {
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      console.log(`[DEV Mailer] Password reset link for ${toEmail}: ${resetLink}`);
    }
    // In production or test, do not log tokens, links, or secrets.
  }
}

export const defaultMailer: Mailer = new ConsoleMailer();
