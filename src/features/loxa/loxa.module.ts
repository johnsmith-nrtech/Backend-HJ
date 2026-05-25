import { Module } from '@nestjs/common';
import { LoxaService } from './loxa.service';
import { LoxaController } from './loxa.controller';

@Module({
  controllers: [LoxaController],
  providers: [LoxaService],
  exports: [LoxaService],
})
export class LoxaModule {}