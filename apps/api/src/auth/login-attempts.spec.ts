import { LoginAttemptTracker } from './login-attempts';

describe('LoginAttemptTracker', () => {
  it('locks an email after eight failures inside the window', () => {
    const tracker = new LoginAttemptTracker();
    const now = 1_000_000;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      tracker.assertAllowed('ada@example.edu', now);
      tracker.recordFailure('ada@example.edu', now);
    }

    expect(() => tracker.assertAllowed('ada@example.edu', now + 1_000)).toThrow(
      /Too many attempts/,
    );
    tracker.assertAllowed('other@example.edu', now);
  });

  it('forgets failures after the window and after a successful clear', () => {
    const tracker = new LoginAttemptTracker();
    const now = 1_000_000;
    tracker.recordFailure('ada@example.edu', now);
    tracker.clear('ada@example.edu');
    tracker.assertAllowed('ada@example.edu', now);

    for (let attempt = 0; attempt < 8; attempt += 1) {
      tracker.recordFailure('ada@example.edu', now);
    }
    tracker.assertAllowed('ada@example.edu', now + 15 * 60 * 1000);
  });
});
