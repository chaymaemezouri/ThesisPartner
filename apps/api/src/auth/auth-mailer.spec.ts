import { AppException } from '../common/errors/app.exception';
import { AuthMailer } from './auth-mailer';

describe('AuthMailer', () => {
  const mail = {
    to: 'supervisor@example.test',
    subject: 'Thesis Flow invitation — Coastal ecosystems',
    text: 'Ouvrez http://localhost:5173/invitation?token=secret-token-value',
  };

  it('stores mail in test without logging the body or token', async () => {
    const logger = { write: jest.fn() };
    const mailer = new AuthMailer(
      { NODE_ENV: 'test', SMTP_HOST: undefined } as never,
      logger as never,
    );

    await mailer.send(mail);

    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.html).toContain('Thesis Flow');
    expect(logger.write).not.toHaveBeenCalled();
    expect(JSON.stringify(logger.write.mock.calls)).not.toContain('secret-token-value');
  });

  it('throws when production has no SMTP host and does not log the token', async () => {
    const logger = { write: jest.fn() };
    const mailer = new AuthMailer(
      { NODE_ENV: 'production', SMTP_HOST: undefined, SMTP_FROM: 'noreply@example.test' } as never,
      logger as never,
    );

    await expect(mailer.send(mail)).rejects.toBeInstanceOf(AppException);
    expect(logger.write).toHaveBeenCalledWith(
      expect.objectContaining({ msg: 'mail.unconfigured', toDomain: 'example.test' }),
    );
    expect(JSON.stringify(logger.write.mock.calls)).not.toContain('secret-token-value');
  });
});
