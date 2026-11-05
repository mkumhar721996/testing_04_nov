import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFECT_REPOSITORY } from './defect.repository';
import { DefectsController } from './defects.controller';
import { InMemoryDefectRepository } from './in-memory-defect.repository';
import { StatusMoveService } from './status-move.service';

// vitest's transform does not emit decorator metadata, so declare the constructor injection.
Reflect.defineMetadata('design:paramtypes', [StatusMoveService], DefectsController);

describe('DefectsController comments', () => {
  let app: INestApplication;
  let id: string;

  beforeEach(async () => {
    const repo = new InMemoryDefectRepository();
    id = repo.seed({ status: 'Triaged', ownerId: null, ownerName: null }).id;
    const mod = await Test.createTestingModule({
      controllers: [DefectsController],
      providers: [StatusMoveService, { provide: DEFECT_REPOSITORY, useValue: repo }],
    }).compile();
    app = mod.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    delete process.env.AUTH_DEV_ACTOR;
    await app.close();
  });

  it('posts a comment for a signed-in actor (AC1)', async () => {
    process.env.AUTH_DEV_ACTOR = 'true';
    const res = await request(app.getHttpServer())
      .post(`/defects/${id}/comments`)
      .send({ text: 'Retest on Chrome 120' });
    expect(res.status).toBe(201);
    expect(res.body.comments.map((c: { body: string }) => c.body)).toEqual(['Retest on Chrome 120']);
  });

  it('answers 401 when nobody is signed in', async () => {
    const res = await request(app.getHttpServer())
      .post(`/defects/${id}/comments`)
      .send({ text: 'hi' });
    expect(res.status).toBe(401);
  });

  it('refuses blank text with 400 (AC9)', async () => {
    process.env.AUTH_DEV_ACTOR = 'true';
    const res = await request(app.getHttpServer()).post(`/defects/${id}/comments`).send({ text: '  ' });
    expect(res.status).toBe(400);
  });

  it.each(['put', 'patch', 'delete'] as const)('has no %s route for a comment (AC6)', async (m) => {
    process.env.AUTH_DEV_ACTOR = 'true';
    const res = await request(app.getHttpServer())[m](`/defects/${id}/comments/c1`);
    expect(res.status).toBe(404);
  });
});
