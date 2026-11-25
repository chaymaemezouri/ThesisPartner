import {
  isMasterSpaceEmail,
  masterSpaceEmails,
  masterSupervisorEmail,
  parseEmailList,
} from './master-space';

describe('master space allowlist', () => {
  it('defaults to Jihane and Ezziyyani', () => {
    expect(masterSpaceEmails({})).toEqual(['jihaneelmouden1@gmail.com', 'mezziyyani@uae.ac.ma']);
    expect(masterSupervisorEmail({})).toBe('mezziyyani@uae.ac.ma');
    expect(isMasterSpaceEmail('JihaneElMouden1@gmail.com', {})).toBe(true);
    expect(isMasterSpaceEmail('other@example.test', {})).toBe(false);
  });

  it('reads a comma-separated override', () => {
    const env = {
      MASTER_SPACE_EMAILS: 'alpha@example.test, Beta@example.test',
      MASTER_SUPERVISOR_EMAIL: 'Beta@example.test',
    };
    expect(masterSpaceEmails(env)).toEqual(['alpha@example.test', 'beta@example.test']);
    expect(masterSupervisorEmail(env)).toBe('beta@example.test');
    expect(parseEmailList('', ['kept@example.test'])).toEqual(['kept@example.test']);
  });
});
