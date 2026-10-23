import logoSrc from '../assets/brand/thesispartner.png';

export function BrandLogo({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <img
      src={logoSrc}
      alt=""
      aria-hidden="true"
      width={500}
      height={500}
      draggable={false}
      className={`block shrink-0 object-contain ${className}`}
    />
  );
}
