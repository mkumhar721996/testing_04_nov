import { DirectoryUser, UserDirectory } from './defect.repository';
import { Role } from './workflow';

/** Test double for UserDirectory; only users with the Developer role are ever returned. */
export class InMemoryUserDirectory implements UserDirectory {
  constructor(private readonly users: (DirectoryUser & { role: Role })[] = []) {}

  async listDevelopers() {
    return this.users
      .filter((u) => u.role === 'Developer')
      .map(({ id, name }) => ({ id, name }));
  }

  async findDeveloper(id: string) {
    return (await this.listDevelopers()).find((u) => u.id === id) ?? null;
  }
}
