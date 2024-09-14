import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import csv from 'csv-parser';
import * as fs from 'fs';
import { Product } from '../schemas/product.schema';
import { Vendor } from '../schemas/vendor.schema';
import { nanoid } from 'nanoid';
import { Manufacturer } from '../schemas/manufacturer.schema';

@Injectable()
export class ProductImportService {
  private readonly logger = new Logger(ProductImportService.name);

  constructor(
    @InjectModel('Product') private readonly productModel: Model<Product>,
    @InjectModel('Vendor') private readonly vendorModel: Model<Vendor>,
    @InjectModel('Manufacturer') private readonly manufacturerModel: Model<Manufacturer>,

  ) {}


  private async saveOrUpdateProducts(products: any[]): Promise<void> {
    try {
      const bulkOps = products.map(product => ({
        updateOne: {
          filter: { productId: product.productId },
          update: { $set: product },
          upsert: true,
        },
      }));
  
      await this.productModel.bulkWrite(bulkOps);
      this.logger.log(`Batch save/update completed for ${products.length} products.`);
    } catch (error) {
      this.logger.error('Error during batch save/update:', error);
    }
  }

  async importProducts(filePath: string): Promise<void> {
    const newProductIds = new Set<string>();
    const productsBatch = [];
    const batchSize = 500;
  
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', async (row) => {
          try {
            // Parse CSV row to product format
            const product = await this.parseCsvRowToProduct(row);
            if (product) {
              productsBatch.push(product);
              newProductIds.add(product.productId);
  
              // Process batch if it reaches the defined batch size
              if (productsBatch.length >= batchSize) {
                await this.saveOrUpdateProducts(productsBatch);
                productsBatch.length = 0; // Clear the batch
              }
            }
          } catch (error) {
            this.logger.error('Error processing row:', error);
          }
        })
        .on('end', async () => {
          if (productsBatch.length > 0) {
            await this.saveOrUpdateProducts(productsBatch);
          }
  
          await this.flagDeletedProducts(newProductIds);
          resolve();
        })
        .on('error', (error) => {
          this.logger.error('Error reading CSV file:', error);
          reject(error);
        });
    });
  }
  

  private async parseCsvRowToProduct(row: any): Promise<any> {
    const vendor = await this.ensureVendor(row.VendorID, row.VendorName);
    if (!vendor) {
      this.logger.warn(`Skipping product ${row.ProductID} due to missing vendor.`);
      return null;
    }
  
    const manufacturerId = await this.ensureManufacturer(row.ManufacturerID, row.ManufacturerName);
  
    return {
      productId: row.ProductID || nanoid(),
      itemId: row.ItemID || nanoid(),
      name: row.Name,
      description: row.Description,
      packaging: row.Packaging,
      vendorId: vendor.vendorId,
      manufacturerId,
      variants: [
        { description: row.ItemDescription, packaging: row.Packaging }
      ],
    };
  }
  

  private async ensureVendor(vendorId: string, vendorName: string): Promise<Vendor | null> {
    try {
      let vendor = await this.vendorModel.findOne({ vendorId }).exec();

      if (!vendor) {
        vendor = new this.vendorModel({ vendorId, name: vendorName });
        await vendor.save();
        this.logger.log(`Created new vendor with ID ${vendorId}.`);
      } else {
        if (vendor.name !== vendorName) {
          vendor.name = vendorName;
          await vendor.save();
          this.logger.log(`Updated vendor with ID ${vendorId}.`);
        }
      }

      return vendor;
    } catch (error) {
      this.logger.error(`Error ensuring vendor with ID ${vendorId}:`, error);
      return null;
    }
  }

  private async ensureManufacturer(manufacturerId: string, manufacturerName: string): Promise<string> {
    try {
      let manufacturer = await this.manufacturerModel.findOne({ manufacturerId }).exec();

      if (!manufacturer) {
        manufacturer = new this.manufacturerModel({ manufacturerId, name: manufacturerName });
        await manufacturer.save();
        this.logger.log(`Created new manufacturer with ID ${manufacturerId}.`);
      } else {
        if (manufacturer.name !== manufacturerName) {
          manufacturer.name = manufacturerName;
          await manufacturer.save();
          this.logger.log(`Updated manufacturer with ID ${manufacturerId}.`);
        }
      }

      return manufacturer.manufacturerId;
    } catch (error) {
      this.logger.error(`Error ensuring manufacturer with ID ${manufacturerId}:`, error);
      return nanoid();
    }
  }

  private async saveOrUpdateProduct(product: any): Promise<void> {
    try {
      await this.productModel.findOneAndUpdate(
        { productId: product.productId },
        product,
        { upsert: true }
      );
      this.logger.log(`Product ${product.productId} saved/updated successfully.`);
    } catch (error) {
      this.logger.error(`Error saving/updating product ${product.productId}:`, error);
    }
  }

  private async flagDeletedProducts(newProductIds: Set<string>): Promise<void> {
    try {
      await this.productModel.updateMany(
        { productId: { $nin: Array.from(newProductIds) } },
        { $set: { isDeleted: true } } 
      );
      this.logger.log('Flagged deleted products successfully.');
    } catch (error) {
      this.logger.error('Error flagging deleted products:', error);
    }
  }
}
