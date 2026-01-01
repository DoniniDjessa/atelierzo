import { Metadata } from 'next';
import { getProductById } from '@/app/lib/supabase/products';

interface GenerateMetadataProps {
  params: { id: string };
}

export async function generateMetadata({ params }: GenerateMetadataProps): Promise<Metadata> {
  const product = await getProductById(params.id);

  if (!product) {
    return {
      title: 'Produit non trouvé',
      description: 'Le produit que vous recherchez n\'existe pas ou n\'est plus disponible.',
    };
  }

  const title = `${product.name} - Les Ateliers Zo`;
  const description = product.description || `Découvrez ${product.name} - ${product.category}. Prix: ${product.price.toLocaleString('fr-FR')} FCFA. Disponible en plusieurs tailles.`;
  const images = product.images && product.images.length > 0 ? [product.images[0]] : [];
  
  // Get available sizes
  const availableSizes = product.sizeAvailability 
    ? Object.entries(product.sizeAvailability)
        .filter(([_, isAvailable]) => isAvailable)
        .map(([size]) => size)
    : [];

  return {
    title,
    description,
    keywords: [
      product.name,
      product.category,
      'Les Ateliers Zo',
      'mode ivoirienne',
      'vêtements Côte d\'Ivoire',
      ...availableSizes,
    ],
    openGraph: {
      title,
      description,
      type: 'product',
      url: `https://lesatelierszo.com/product/${product.id}`,
      images: images.map(img => ({
        url: img,
        width: 800,
        height: 800,
        alt: product.name,
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
