import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'tp_public';

export const Public = () => SetMetadata(IS_PUBLIC, true);
