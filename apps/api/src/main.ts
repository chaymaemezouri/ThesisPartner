import 'reflect-metadata';
import { createApp } from './app.factory';
import { ENV, type Env } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await createApp();
  const env = app.get<Env>(ENV);
  await app.listen(env.API_PORT);
}

bootstrap().catch((error: unknown) => {
  if (error instanceof Error && error.message.startsWith('Invalid environment')) {
    process.stderr.write(`${error.message}\n`);
  } else {
    process.stderr.write('Application failed to start\n');
  }
  process.exit(1);
});
