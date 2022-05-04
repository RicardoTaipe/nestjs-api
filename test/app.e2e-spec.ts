import { EditBookmarkDTO } from './../src/bookmark/dto/edit-bookmark.dto';
import { CreateBookmarkDTO } from './../src/bookmark/dto/create-bookmark.dto';
import { EditUserDTO } from './../src/user/dto/edit-user.dto';
import { AuthDTO } from '../src/auth/dto/auth.dto';
import { PrismaService } from '../src/prisma/prisma.service';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import * as pactum from 'pactum';

describe('App e2e', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    await app.listen(3000);

    prisma = app.get(PrismaService);
    await prisma.cleanDB();

    pactum.request.setBaseUrl('http://localhost:3000');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Auth', () => {
    const dto: AuthDTO = {
      email: 'test@gmail.com',
      password: 'test',
    };
    describe('SigUp', () => {
      test('should throw error if email empty', async () => {
        await pactum
          .spec()
          .post('/auth/signup')
          .withBody({ password: dto.password })
          .expectStatus(400);
      });

      test('should throw error if password empty', async () => {
        await pactum
          .spec()
          .post('/auth/signup')
          .withBody({ email: dto.email })
          .expectStatus(400);
      });
      test('should throw error if no body provided', async () => {
        await pactum.spec().post('/auth/signup').expectStatus(400);
      });

      test('should sigunp', async () => {
        await pactum
          .spec()
          .post('/auth/signup')
          .withBody(dto)
          .expectStatus(201);
      });
    });

    describe('SigIn', () => {
      test('should throw error if email empty', async () => {
        await pactum
          .spec()
          .post('/auth/signin')
          .withBody({ password: dto.password })
          .expectStatus(400);
      });

      test('should throw error if password empty', async () => {
        await pactum
          .spec()
          .post('/auth/signin')
          .withBody({ email: dto.email })
          .expectStatus(400);
      });
      test('should throw error if no body provided', async () => {
        await pactum.spec().post('/auth/signin').expectStatus(400);
      });

      test('should sigin', async () => {
        await pactum
          .spec()
          .post('/auth/signin')
          .withBody(dto)
          .expectStatus(200)
          .stores('user_token', 'access_token');
      });
    });
  });

  describe('User', () => {
    describe('Get me', () => {
      test('should get current user', async () => {
        await pactum
          .spec()
          .get('/users/me')
          .withHeaders({ Authorization: `Bearer $S{user_token}` })
          .expectStatus(200);
      });
    });

    describe('Edit User', () => {
      const dto: EditUserDTO = {
        firstName: 'Joe',
        email: 'joe@gmail.com',
      };
      test('should edit user', async () => {
        await pactum
          .spec()
          .patch('/users')
          .withHeaders({ Authorization: `Bearer $S{user_token}` })
          .withBody(dto)
          .expectStatus(200)
          .expectBodyContains(dto.firstName)
          .expectBodyContains(dto.email);
      });
    });
  });

  describe('Bookmark', () => {
    describe('Get empty bookmarks', () => {
      test('should get bookmarks', async () => {
        await pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{user_token}',
          })
          .expectStatus(200)
          .expectBody([]);
      });
    });

    describe('Create bookmark', () => {
      const dto: CreateBookmarkDTO = {
        title: 'First Bookmark',
        link: 'https://www.youtube.com/watch?v=d6WC5n9G_sM',
      };
      it('should create bookmark', async () => {
        await pactum
          .spec()
          .post('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{user_token}',
          })
          .withBody(dto)
          .expectStatus(201)
          .stores('bookmarkId', 'id');
      });
    });

    describe('Get bookmarks', () => {
      test('should get bookmarks', async () => {
        await pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{user_token}',
          })
          .expectStatus(200)
          .expectJsonLength(1);
      });
    });

    describe('Get bookmark by id', () => {
      test('should get bookmark by id', async () => {
        await pactum
          .spec()
          .get('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{user_token}',
          })
          .expectStatus(200)
          .expectBodyContains('$S{bookmarkId}');
      });
    });

    describe('Edit bookmark by id', () => {
      const dto: EditBookmarkDTO = {
        title:
          'Kubernetes Course - Full Beginners Tutorial (Containerize Your Apps!)',
        description:
          'Learn how to use Kubernetes in this complete course. Kubernetes makes it possible to containerize applications and simplifies app deployment to production.',
      };
      it('should edit bookmark', async () => {
        await pactum
          .spec()
          .patch('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{user_token}',
          })
          .withBody(dto)
          .expectStatus(200)
          .expectBodyContains(dto.title)
          .expectBodyContains(dto.description);
      });
    });

    describe('Delete boookmar', () => {
      test('should delete bookmark', async () => {
        await pactum
          .spec()
          .delete('/bookmarks/{id}')
          .withPathParams('id', '$S{bookmarkId}')
          .withHeaders({
            Authorization: 'Bearer $S{user_token}',
          })
          .expectStatus(204);
      });

      test('should get empty bookmarks', async () => {
        await pactum
          .spec()
          .get('/bookmarks')
          .withHeaders({
            Authorization: 'Bearer $S{user_token}',
          })
          .expectStatus(200)
          .expectJsonLength(0);
      });
    });
  });
});
