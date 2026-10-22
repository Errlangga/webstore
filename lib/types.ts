export type ProductStatus = "available" | "sold";

export type Product = {
  id: number;
  title: string;
  slug: string;
  price: number;
  description: string;
  category: string;
  players: string;
  images: string[];
  status: ProductStatus;
  featured: boolean;
  created_at: string;
};

export type Testimonial = {
  id: number;
  buyer_name: string;
  product_title: string;
  message: string;
  rating: number;
  image_url: string | null;
  visible: boolean;
  created_at: string;
};
