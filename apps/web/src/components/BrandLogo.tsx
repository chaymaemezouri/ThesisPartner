import logoSrc from '../assets/brand/thesispartner.png';

export function BrandLogo({ className = 'h-12 w-auto' }: { className?: string }) {
  return (
    <img
      src={logoSrc}
      alt=""
      aria-hidden="true"
      width={707}
      height={353}
      draggable={false}
      className={`block object-contain ${className}`}
    />
  );
}
