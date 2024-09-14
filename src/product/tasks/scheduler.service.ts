import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ProductImportService } from '../services/product-import.service';
import { EnhanceService } from '../services/enhance.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SchedulerService {
  constructor(
    private readonly productImportService: ProductImportService,
    private readonly enhanceService: EnhanceService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 0 * * *') // Run every day at midnight
  async handleCron() {
    const filePath = this.configService.get<string>('CSV_FILE_PATH'); // Get file path from env
    if (!filePath) {
      console.error('CSV file path not defined. Please set CSV_FILE_PATH in the environment variables.');
      return;
    }
  
    try {
      console.log(`Starting product import from: ${filePath}`);
      await this.productImportService.importProducts(filePath);
      console.log('Product import completed. Enhancing descriptions...');
      await this.enhanceService.enhanceDescriptions();
      console.log('Enhancement process completed.');
    } catch (error) {
      console.error('Error during scheduled task execution:', error);
    }
  }
}
