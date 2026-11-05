import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  COMPONENTS_REPOSITORY,
  ComponentRecord,
  ComponentStatus,
  ComponentsRepository,
  NameTakenError,
} from './components.repository';

const MAX_NAME_LENGTH = 80;

function validName(input: unknown): string {
  const name = typeof input === 'string' ? input.trim() : '';
  if (!name) throw new BadRequestException('Enter a component name.');
  if (name.length > MAX_NAME_LENGTH) {
    throw new BadRequestException(`Use ${MAX_NAME_LENGTH} characters or fewer for the name.`);
  }
  return name;
}

function nameTaken(name: string): ConflictException {
  return new ConflictException(
    `A component named "${name}" already exists. The name was not changed. Choose a different name.`,
  );
}

@Injectable()
export class ComponentsService {
  constructor(@Inject(COMPONENTS_REPOSITORY) private readonly repo: ComponentsRepository) {}

  list(status?: ComponentStatus): Promise<ComponentRecord[]> {
    return this.repo.list(status);
  }

  async add(input: unknown): Promise<ComponentRecord> {
    const name = validName(input);
    try {
      return await this.repo.insert(name);
    } catch (error) {
      if (error instanceof NameTakenError) throw nameTaken(name);
      throw error;
    }
  }

  async rename(id: string, input: unknown): Promise<ComponentRecord> {
    const name = validName(input);
    const current = await this.require(id);
    if (current.status === 'retired') {
      throw new ConflictException(`${current.name} is retired and can't be renamed.`);
    }
    if (current.name === name) return current;
    try {
      return await this.repo.rename(id, name);
    } catch (error) {
      if (error instanceof NameTakenError) throw nameTaken(name);
      throw error;
    }
  }

  async retire(id: string): Promise<ComponentRecord> {
    const current = await this.require(id);
    if (current.status === 'retired') return current;
    const result = await this.repo.retireIfNotLastActive(id);
    if (result === 'last-active') {
      throw new ConflictException(
        `${current.name} can't be retired because it is the only active component. Add another component first.`,
      );
    }
    return result;
  }

  private async require(id: string): Promise<ComponentRecord> {
    const found = await this.repo.findById(id);
    if (!found) throw new NotFoundException('Component not found.');
    return found;
  }
}
