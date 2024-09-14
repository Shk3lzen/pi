import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductSchema } from './schemas/product.schema';
import { VendorSchema } from './schemas/vendor.schema';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { ProductImportService } from './services/product-import.service';
import { SchedulerService } from './tasks/scheduler.service';
import { EnhanceService } from './services/enhance.service';
import { ManufacturerSchema } from './schemas/manufacturer.schema';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forFeature([
      { name: 'Product', schema: ProductSchema },
      { name: 'Vendor', schema: VendorSchema },
      { name: 'Manufacturer', schema: ManufacturerSchema }, 

    ]),
    ScheduleModule.forRoot(),
  ],
  providers: [ProductImportService, SchedulerService, EnhanceService],
})
export class ProductModule {}
