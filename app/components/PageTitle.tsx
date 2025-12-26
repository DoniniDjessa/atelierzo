'use client';

interface PageTitleProps {
  title: string;
}

export default function PageTitle({ title }: PageTitleProps) {
  return (
    <div className="mb-6 inline-flex">
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#B9F19D] font-bold">
        <span className="text-black whitespace-nowrap" style={{ fontFamily: 'var(--font-poppins)' }}>
          {title}
        </span>
      </div>
    </div>
  );
}

