import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from '../schemas/product.schema';
import { OpenAI } from 'langchain';

@Injectable()
export class EnhanceService {
  constructor(@InjectModel('Product') private readonly productModel: Model<Product>) {}

  async enhanceDescriptions() {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Fetch 10 products to enhance
    const products = await this.productModel.find().limit(10).exec();

    for (const product of products) {
      const prompt = `Product name: ${product.name}\nProduct description: ${product.description}\nCategory: Medical\n\nNew Description:`;
      try {
        const response = await openai.completions.create({
          model: 'gpt-4',
          prompt,
          maxTokens: 100,
        });

        await this.productModel.findByIdAndUpdate(product._id, {
          description: response.choices[0].text.trim(),
        });
      } catch (error) {
        console.error(`Failed to enhance description for product ${product.name}:`, error);
      }
    }
  }
}
