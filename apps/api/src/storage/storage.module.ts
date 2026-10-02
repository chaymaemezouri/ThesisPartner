import { Global, Module } from '@nestjs/common';
import { OBJECT_STORAGE } from './object-storage';
import { S3ObjectStorage } from './s3-object-storage';

@Global()
@Module({
  providers: [S3ObjectStorage, { provide: OBJECT_STORAGE, useExisting: S3ObjectStorage }],
  exports: [OBJECT_STORAGE, S3ObjectStorage],
})
export class StorageModule {}
