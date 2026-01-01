import { Metadata } from 'next';
import { getProductById } from '@/app/lib/supabase/products';

interface GenerateMetadataProps {
  params: { id: string };
}

export async function generateMetadata({ params }: GenerateMetadataProps): Promise<Metadata> {
  const result = await getProductById(params.id);

  if (result.error || !result.data) {
    return {
      title: 'Produit non trouvé',
      description: 'Le produit que vous recherchez n\'existe pas ou n\'est plus disponible.',
    };
  }

  const product = result.data;
  const title = `${product.title} - Les Ateliers Zo`;
  const description = product.description || `Découvrez ${product.title} - ${product.category}. Prix: ${product.price.toLocaleString('fr-FR')} FCFA. Disponible en plusieurs tailles.`;
  const images = product.image_url ? [product.image_url] : [];
  
  // Get available sizes
  const availableSizes = product.sizeQuantities 
    ? Object.entries(product.sizeQuantities)
        .filter(([_, quantity]) => (quantity as number) > 0)
        .map(([size]) => size)
    : [];

  return {
    title,
    description,
    keywords: [
      product.title,
      product.category || '',
      'Les Ateliers Zo',
      'mode ivoirienne',
      'vêtements Côte d\'Ivoire',
      ...availableSizes,
    ],
    openGraph: {
      title,
      description,
      url: `https://lesatelierszo.com/product/${product.id}`,
      images: images.map(img => ({
        url: img,
        width: 800,
        height: 800,
        alt: product.title,
      })),
      siteName: 'Les Ateliers Zo',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images,
    },
    alternates: {
      canonical: `https://lesatelierszo.com/product/${product.id}`,
    },
  };
}
