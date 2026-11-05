import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthModule } from '../auth/auth.module';
import { TOKEN_VERIFIER } from '../auth/principal';
import { MeController } from '../me/me.controller';
import { ComponentsController } from './components.controller';
import { COMPONENTS_REPOSITORY } from './components.repository';
import { ComponentsService } from './components.service';
import { InMemoryComponentsRepository } from './in-memory-components.repository.fake';

const lead = { Authorization: 'Bearer lead-token' };
const reporter = { Authorization: 'Bearer reporter-token' };

let app: INestApplication;
let repo: InMemoryComponentsRepository;

beforeEach(async () => {
  repo = new InMemoryComponentsRepository();
  const module = await Test.createTestingModule({
    imports: [AuthModule],
    controllers: [ComponentsController, MeController],
    providers: [ComponentsService, { provide: COMPONENTS_REPOSITORY, useValue: repo }],
  })
    .overrideProvider(TOKEN_VERIFIER)
    .useValue({
      verify: async (token: string) =>
        token === 'lead-token'
          ? { id: 'l', roles: ['Lead'] }
          : token === 'reporter-token'
            ? { id: 'r', roles: [] }
            : null,
    })
    .compile();
  app = module.createNestApplication();
  await app.init();
});

afterEach(() => app.close());

describe('components API guards', () => {
  it('rejects a request with no valid token with 401', async () => {
    await request(app.getHttpServer()).get('/components').expect(401);
    await request(app.getHttpServer())
      .get('/components')
      .set('Authorization', 'Bearer nope')
      .expect(401);
  });

  it('refuses add, rename and retire for a non-Lead and leaves the list unchanged (AC1)', async () => {
    const created = await repo.insert('Billing');
    const before = await repo.list();
    const http = request(app.getHttpServer());

    await http.post('/components').set(reporter).send({ name: 'Payments' }).expect(403);
    await http.patch(`/components/${created.id}`).set(reporter).send({ name: 'X' }).expect(403);
    await http.post(`/components/${created.id}/retire`).set(reporter).expect(403);

    expect(await repo.list()).toEqual(before);
  });

  it('lets a Lead add, rename and retire', async () => {
    const http = request(app.getHttpServer());
    const a = (await http.post('/components').set(lead).send({ name: 'Billing' }).expect(201)).body;
    await http.post('/components').set(lead).send({ name: 'Legacy' }).expect(201);
    await http.patch(`/components/${a.id}`).set(lead).send({ name: 'Payments' }).expect(200);
    const active = await http.get('/components?status=active').set(reporter).expect(200);
    expect(active.body.map((c: { name: string }) => c.name)).toEqual(['Legacy', 'Payments']);
  });

  it('answers 409 for a duplicate name and for retiring the last active component', async () => {
    const http = request(app.getHttpServer());
    const a = await repo.insert('Billing');
    await http.post('/components').set(lead).send({ name: 'billing' }).expect(409);
    await http.post(`/components/${a.id}/retire`).set(lead).expect(409);
  });

  it('rejects a malformed id and an unknown status filter with 4xx', async () => {
    const http = request(app.getHttpServer());
    await http.patch('/components/not-a-uuid').set(lead).send({ name: 'X' }).expect(400);
    await http.get('/components?status=bogus').set(lead).expect(400);
  });
});

describe('GET /me', () => {
  it('reports whether the caller is a Lead', async () => {
    const http = request(app.getHttpServer());
    expect((await http.get('/me').set(lead)).body).toEqual({ isLead: true });
    expect((await http.get('/me').set(reporter)).body).toEqual({ isLead: false });
    await http.get('/me').expect(401);
  });
});
