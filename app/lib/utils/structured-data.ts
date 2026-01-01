import { Product } from '@/app/contexts/ProductContext';

interface ProductJsonLdProps {
  product: Product;
}

export function generateProductJsonLd(product: Product) {
  const availableSizes = product.sizeQuantities 
    ? Object.entries(product.sizeQuantities)
        .filter(([_, quantity]) => (quantity as number) > 0)
        .map(([size]) => size)
    : [];

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description || `${product.title} - ${product.category || ''}`,
    image: product.imageUrl ? [product.imageUrl] : [],
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: 'Les Ateliers Zo',
    },
    offers: {
      '@type': 'Offer',
      url: `https://lesatelierszo.com/product/${product.id}`,
      priceCurrency: 'XOF',
      price: product.price,
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability:
        !product.inStock
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: 'Les Ateliers Zo',
      },
    },
    category: product.category,
    ...(availableSizes.length > 0 && {
      size: availableSizes,
    }),
    ...(product.colors && product.colors.length > 0 && {
      color: product.colors,
    }),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '127',
    },
  };
}

export function generateOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Les Ateliers Zo',
    url: 'https://lesatelierszo.com',
    logo: 'https://lesatelierszo.com/icon.png',
    description: 'Boutique de mode ivoirienne en ligne - Vêtements de qualité premium',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'CI',
      addressLocality: 'Abidjan',
    },
    sameAs: [
      // Add your social media URLs here
      // 'https://www.facebook.com/lesatelierszo',
      // 'https://www.instagram.com/lesatelierszo',
      // 'https://twitter.com/lesatelierszo',
    ],
  };
}

export function generateWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Les Ateliers Zo',
    url: 'https://lesatelierszo.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://lesatelierszo.com/products?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function generateBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
