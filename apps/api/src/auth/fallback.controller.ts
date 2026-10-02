import { All, Controller } from '@nestjs/common';
import { AppException } from '../common/errors/app.exception';
import { Public } from './public.decorator';

@Public()
@Controller({ version: '1' })
export class FallbackController {
  @All('*')
  missing(): never {
    throw new AppException(404, 'NOT_FOUND', 'Resource not found');
  }
}
