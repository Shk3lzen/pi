import { Schema, Document } from 'mongoose';

export const ProductSchema = new Schema({
  productId: { type: String, required: true, unique: true },
  itemId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  packaging: { type: String },
  vendorId: { type: String, required: true },
  manufacturerId: { type: String },
  variants: [
    {
      description: { type: String },
      packaging: { type: String },
    },
  ],
  isDeleted: { type: Boolean, default: false },
});

export interface Product extends Document {
  productId: string;
  itemId: string;
  name: string;
  description: string;
  packaging: string;
  vendorId: string;
  manufacturerId: string;
  variants: Array<{
    description: string;
    packaging: string;
  }>;
  isDeleted: boolean;
}
